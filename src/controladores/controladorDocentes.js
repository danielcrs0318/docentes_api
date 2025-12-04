const { validationResult } = require('express-validator');
const Docentes = require('../modelos/Docentes');
const Usuarios = require('../modelos/Usuarios');
const Roles = require('../modelos/Roles');
const Clases = require('../modelos/Clases');
const { Op } = require('sequelize');
const argon2 = require('argon2');
const { generarLogin, generarContrasenaAleatoria, generarLoginUnico } = require('../utilidades/generadorCredenciales');
const { enviarCorreo, generarPlantillaCorreo } = require('../configuraciones/correo');

// Listar todos los docentes
const ListarDocentes = async (req, res) => {
    try {
        const docentes = await Docentes.findAll({
            include: [
                {
                    model: Clases,
                    as: 'clasesAsignadas',
                    attributes: ['id', 'codigo', 'nombre']
                }
            ]
        });
        res.json(docentes);
    } catch (error) {
        console.error('Error al listar docentes:', error);
        res.status(500).json({ error: 'Error al listar docentes' });
    }
};

// Crear docente
const CrearDocente = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { nombre, correo, especialidad, estado } = req.body;

        // Verificar correo único
        const existente = await Docentes.findOne({ where: { correo } });
        if (existente) return res.status(400).json({ error: 'Ya existe un docente con ese correo' });

        // Crear el docente
        const nuevo = await Docentes.create({ nombre, correo, especialidad, estado: estado || 'ACTIVO' });

        // 🔐 CREAR USUARIO AUTOMÁTICAMENTE
        try {
            // Buscar el rol DOCENTE
            const rolDocente = await Roles.findOne({ where: { nombre: 'DOCENTE' } });
            if (!rolDocente) {
                console.error('❌ No se encontró el rol DOCENTE en el sistema');
                return res.status(201).json({ 
                    message: 'Docente creado exitosamente, pero no se pudo crear el usuario (rol no encontrado)', 
                    docente: nuevo 
                });
            }

            // Generar credenciales
            const loginBase = generarLogin(nombre, correo);
            const login = await generarLoginUnico(loginBase, Usuarios);
            const contrasenaTemp = generarContrasenaAleatoria(10);
            const contrasenaHash = await argon2.hash(contrasenaTemp);

            // Crear usuario
            const nuevoUsuario = await Usuarios.create({
                login: login,
                correo: correo,
                contrasena: contrasenaHash,
                requiereCambioContrasena: true, // 🔑 Debe cambiar contraseña al primer login
                estado: 'AC',
                rolId: rolDocente.id,
                docenteId: nuevo.id
            });

            // 📧 Enviar correo con credenciales
            const asunto = '🎓 Bienvenido - Credenciales de Acceso';
            const cuerpo = generarPlantillaCorreo(
                'Credenciales de Acceso Creadas',
                `
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Se ha creado tu cuenta de acceso al sistema académico.</p>
                
                <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1976d2;">🔐 Tus Credenciales de Acceso</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; font-weight: bold; color: #555;">Usuario (Login):</td>
                            <td style="padding: 10px; background-color: #fff; border-radius: 4px;"><code style="font-size: 16px; color: #1976d2;">${login}</code></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; color: #555;">Correo alternativo:</td>
                            <td style="padding: 10px; background-color: #fff; border-radius: 4px; margin-top: 10px;"><code style="font-size: 16px; color: #1976d2;">${correo}</code></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; color: #555;">Contraseña Temporal:</td>
                            <td style="padding: 10px; background-color: #fff3cd; border-radius: 4px; margin-top: 10px;"><code style="font-size: 18px; color: #d32f2f; font-weight: bold;">${contrasenaTemp}</code></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ff9800; border-radius: 4px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #f57c00;">⚠️ Importante</h4>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Puedes iniciar sesión con tu <strong>usuario (${login})</strong> o tu <strong>correo electrónico</strong></li>
                        <li>Esta contraseña es <strong>temporal</strong> y deberás cambiarla en tu primer inicio de sesión</li>
                        <li>Guarda estas credenciales en un lugar seguro</li>
                        <li>Si olvidas tu contraseña, podrás restablecerla desde el sistema</li>
                    </ul>
                </div>
                
                <p style="margin-top: 30px;">Bienvenido al equipo docente. ¡Éxito en tu labor educativa!</p>
                `
            );

            enviarCorreo([correo], asunto, cuerpo).catch(err => {
                console.error('❌ Error al enviar correo con credenciales:', err);
            });

            console.log(`✅ Usuario creado para docente: ${login} (${correo})`);

        } catch (errorUsuario) {
            console.error('❌ Error al crear usuario para docente:', errorUsuario);
            // No falla la creación del docente si falla el usuario
        }

        res.status(201).json({ 
            message: 'Docente creado exitosamente. Se han enviado las credenciales por correo.', 
            docente: nuevo 
        });
    } catch (error) {
        console.error('Error al crear docente:', error);
        res.status(500).json({ error: 'Error al crear docente' });
    }
};

// Actualizar docente
const ActualizarDocente = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { id } = req.query;
        const { nombre, correo, especialidad, estado } = req.body;

        const docente = await Docentes.findByPk(id);
        if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });

        if (correo && correo !== docente.correo) {
            const existe = await Docentes.findOne({ where: { correo } });
            if (existe) return res.status(400).json({ error: 'Otro docente ya usa ese correo' });
        }

        await docente.update({
            nombre: nombre || docente.nombre,
            correo: correo || docente.correo,
            especialidad: especialidad !== undefined ? especialidad : docente.especialidad,
            estado: estado || docente.estado
        });

        res.json({ message: 'Docente actualizado', docente });
    } catch (error) {
        console.error('Error al actualizar docente:', error);
        res.status(500).json({ error: 'Error al actualizar docente' });
    }
};

// Eliminar docente
const EliminarDocente = async (req, res) => {
    try {
        const { id } = req.query;
        const docente = await Docentes.findByPk(id);
        if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });

        await docente.destroy();
        res.json({ message: 'Docente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar docente:', error);
        res.status(500).json({ error: 'Error al eliminar docente' });
    }
};

// FILTRO 1: Filtrar docentes por nombre (búsqueda parcial)
const filtrarDocentesPorNombre = async (req, res) => {
    try {
        const errores = validationResult(req);

        if (!errores.isEmpty()) {
            const data = errores.array().map(i => ({
                atributo: i.path,
                msg: i.msg
            }));
            return res.status(400).json({ msj: 'Errores de validación', data });
        }

        const { nombre } = req.query;

        const docentes = await Docentes.findAll({
            where: {
                nombre: {
                    [Op.like]: `%${nombre.trim()}%`
                }
            },
            include: [
                {
                    model: Clases,
                    as: 'clases', // Cambiado para coincidir con el alias definido
                    attributes: ['id', 'codigo', 'nombre', 'creditos']
                }
            ],
            order: [
                ['nombre', 'ASC']
            ]
        });

        if (docentes.length === 0) {
            return res.status(200).json({ 
                msj: 'No se encontraron docentes con ese nombre', 
                data: [],
                count: 0
            });
        }

        res.status(200).json({
            msj: `Se encontraron ${docentes.length} docente(s)`,
            data: docentes,
            count: docentes.length
        });
    } catch (error) {
        console.error('Error al filtrar docentes por nombre:', error);
        res.status(500).json({ error: 'Error al filtrar docentes por nombre' });
    }
};


// Exportar todas las funciones
module.exports = {
    ListarDocentes,
    CrearDocente,
    ActualizarDocente,
    EliminarDocente,
    filtrarDocentesPorNombre,
};