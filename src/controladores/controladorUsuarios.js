const { validationResult } = require('express-validator');
const Usuarios = require('../modelos/Usuarios');
const UsuarioImagen = require('../modelos/UsuarioImagenes');
const Docente = require('../modelos/Docentes');
const Estudiantes = require('../modelos/Estudiantes');
const Roles = require('../modelos/Roles');
const argon2 = require('argon2');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { uploadImagenUsuario } = require('../configuraciones/archivos');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { registrarLog } = require('./controladorAuditoria');

exports.Listar = async (req, res) => {
    try {
        const usuarios = await Usuarios.findAll();
        return res.status(200).json(usuarios);
    } catch (error) {
        return res.status(500).json({ error: 'Error al listar usuarios' });
    }
};

exports.buscarPorId = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    const usuario = await Usuarios.findByPk(req.query.id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
}

exports.insertar = async (req, res) => {
    // Validar campos enviados
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { docenteId, estudianteId, contrasena, rolId } = req.body;
        let rolAsignado = rolId;

        // ASIGNACIÓN AUTOMÁTICA DE ROL
        // Si se proporciona docenteId, asignar rol DOCENTE automáticamente
        if (docenteId) {
            const docenteExiste = await Docente.findByPk(docenteId);
            if (!docenteExiste) {
                return res.status(404).json({
                    error: `No existe ningún docente con el ID ${docenteId}`
                });
            }

            // Buscar el rol DOCENTE
            const rolDocente = await Roles.findOne({ where: { nombre: 'DOCENTE' } });
            if (!rolDocente) {
                return res.status(500).json({
                    error: 'No se encontró el rol DOCENTE en el sistema'
                });
            }
            rolAsignado = rolDocente.id;
        }

        // Si se proporciona estudianteId, asignar rol ESTUDIANTE automáticamente
        if (estudianteId) {
            const estudianteExiste = await Estudiantes.findByPk(estudianteId);
            if (!estudianteExiste) {
                return res.status(404).json({
                    error: `No existe ningún estudiante con el ID ${estudianteId}`
                });
            }

            // Buscar el rol ESTUDIANTE
            const rolEstudiante = await Roles.findOne({ where: { nombre: 'ESTUDIANTE' } });
            if (!rolEstudiante) {
                return res.status(500).json({
                    error: 'No se encontró el rol ESTUDIANTE en el sistema'
                });
            }
            rolAsignado = rolEstudiante.id;
        }

        // Si no hay docenteId ni estudianteId, debe especificarse el rol manualmente (ADMIN)
        if (!docenteId && !estudianteId && !rolId) {
            return res.status(400).json({
                error: 'Debe proporcionar docenteId, estudianteId o rolId (para ADMIN)'
            });
        }

        // Encriptar contraseña
        const hash = await argon2.hash(contrasena);

        // Crear el nuevo usuario
        const nuevo = await Usuarios.create({
            ...req.body,
            contrasena: hash,
            rolId: rolAsignado
        });

        // Obtener usuario con información del rol
        const usuarioConRol = await Usuarios.findByPk(nuevo.id, {
            include: [{
                model: Roles,
                as: 'rol',
                attributes: ['id', 'nombre', 'descripcion']
            }]
        });

        return res.status(201).json({
            mensaje: 'Usuario creado correctamente',
            usuario: {
                id: usuarioConRol.id,
                login: usuarioConRol.login,
                correo: usuarioConRol.correo,
                estado: usuarioConRol.estado,
                rol: usuarioConRol.rol,
                docenteId: usuarioConRol.docenteId,
                estudianteId: usuarioConRol.estudianteId
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al insertar usuario' });
    }
};

exports.actualizar = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    try {
        const usuario = await Usuarios.findByPk(req.query.id);
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        // Verificar login duplicado solo si se está cambiando
        if (req.body.login && req.body.login !== usuario.login) {
            const loginExiste = await Usuarios.findOne({
                where: {
                    login: req.body.login,
                    id: { [Op.not]: req.query.id }
                }
            });
            if (loginExiste) {
                return res.status(400).json({ mensaje: 'El login ya está en uso por otro usuario' });
            }
        }

        // Verificar correo duplicado solo si se está cambiando
        if (req.body.correo && req.body.correo !== usuario.correo) {
            const correoExiste = await Usuarios.findOne({
                where: {
                    correo: req.body.correo,
                    id: { [Op.not]: req.query.id }
                }
            });
            if (correoExiste) {
                return res.status(400).json({ mensaje: 'El correo ya está en uso por otro usuario' });
            }
        }

        // Si se envía contraseña, hashearla
        if (req.body.contrasena) {
            const hash = await argon2.hash(req.body.contrasena);
            req.body.contrasena = hash;
        }

        await usuario.update(req.body);
        res.json(usuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al actualizar usuario' });
    }
};

exports.Eliminar = async (req, res) => {
    const errores = validationResult(req).errors;
    if (errores.length > 0) {
        return res.status(400).json({ errores });
    }

    try {
        const usuario = await Usuarios.findByPk(req.query.id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        await usuario.destroy();
        return res.status(200).json({ message: 'Usuario eliminado' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al eliminar usuario' });
    }
};

const getToken = (payload, options = {}) => {
    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

const generarPin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.iniciarSesion = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    const { login, contrasena } = req.body;
    try {
        const usuario = await Usuarios.findOne({
            where: {
                [Op.or]: {
                    correo: login,
                    login: login
                }
            },
            include: [
                {
                    model: Roles,
                    as: 'rol',
                    attributes: ['id', 'nombre', 'descripcion']
                }
            ]
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (usuario.estado === 'BL') {
            return res.status(403).json({ error: 'Usuario bloqueado. Contacte al administrador.' });
        }

        if (usuario.estado === 'IN') {
            return res.status(403).json({ error: 'Usuario inactivo' });
        }

        const esValida = await argon2.verify(usuario.contrasena, contrasena);

        if (!esValida) {
            usuario.intentos = (usuario.intentos || 0) + 1;

            if (usuario.intentos >= 3) {
                usuario.estado = 'BL';
                await usuario.save();
                
                // Registrar intento fallido de login - usuario bloqueado
                await registrarLog({
                    usuarioId: usuario.id,
                    accion: 'LOGIN_FALLIDO',
                    descripcion: `Usuario bloqueado por múltiples intentos fallidos (3 intentos)`,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    resultado: 'FALLIDO',
                    mensajeError: 'Usuario bloqueado por múltiples intentos fallidos'
                });
                
                return res.status(403).json({ error: 'Usuario bloqueado por múltiples intentos fallidos' });
            }

            await usuario.save();
            
            // Registrar intento fallido de login
            await registrarLog({
                usuarioId: usuario.id,
                accion: 'LOGIN_FALLIDO',
                descripcion: `Intento de login fallido (${usuario.intentos}/3)`,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                resultado: 'FALLIDO',
                mensajeError: 'Contraseña incorrecta'
            });
            
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }

        usuario.intentos = 0;
        await usuario.save();

        // Construir payload del token con información del rol
        const tokenPayload = {
            id: usuario.id,
            rol: usuario.rol ? usuario.rol.nombre : null,
            docenteId: usuario.docenteId || null,
            estudianteId: usuario.estudianteId || null
        };

        const token = getToken(tokenPayload, { expiresIn: '1d' });
        
        // Registrar login exitoso
        await registrarLog({
            usuarioId: usuario.id,
            accion: 'LOGIN',
            descripcion: `Inicio de sesión exitoso - Rol: ${usuario.rol?.nombre || 'Sin rol'}`,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            resultado: 'EXITOSO'
        });
        
        return res.status(200).json({
            token,
            requiereCambioContrasena: usuario.requiereCambioContrasena || false, // 🔑 Indicar si debe cambiar contraseña
            usuario: {
                id: usuario.id,
                login: usuario.login,
                correo: usuario.correo,
                estado: usuario.estado,
                rol: usuario.rol ? {
                    id: usuario.rol.id,
                    nombre: usuario.rol.nombre,
                    descripcion: usuario.rol.descripcion
                } : null,
                docenteId: usuario.docenteId,
                estudianteId: usuario.estudianteId
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error en el servidor', detalles: error.message });
    }
};

exports.solicitarRestablecimiento = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { correo } = req.body;
        const usuario = await Usuarios.findOne({ where: { correo } });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const pin = generarPin();
        usuario.pin = pin;
        usuario.pinExpiracion = new Date(Date.now() + 15 * 60000); // 15 minutos
        await usuario.save();

        // Devolver el PIN y nombre del usuario para que el frontend genere el correo
        res.status(200).json({ 
            mensaje: 'PIN generado correctamente',
            pin: pin,
            nombreUsuario: usuario.nombre || 'Usuario'
        });
    } catch (error) {
        console.error('Error detallado:', error);
        res.status(500).json({
            error: 'Error en el servidor',
            detalles: error.message,
            stack: error.stack
        });
    }
};

exports.validarPin = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { correo, pin } = req.body;
        const usuario = await Usuarios.findOne({ where: { correo } });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que exista un PIN
        if (!usuario.pin || !usuario.pinExpiracion) {
            return res.status(400).json({ error: 'No hay solicitud de restablecimiento activa' });
        }

        // Verificar que el PIN coincida
        if (usuario.pin !== pin) {
            return res.status(400).json({ error: 'PIN inválido' });
        }

        // Verificar la expiración del PIN
        const ahora = new Date();
        const expiracion = new Date(usuario.pinExpiracion);
        if (ahora >= expiracion) {
            // Limpiar PIN expirado
            usuario.pin = null;
            usuario.pinExpiracion = null;
            await usuario.save();
            return res.status(400).json({ error: 'PIN expirado. Solicita uno nuevo.' });
        }

        // Generar token especial para restablecimiento
        const token = getToken({
            id: usuario.id,
            pin: true
        }, {
            expiresIn: '15m' // El token expira en 15 minutos, igual que el PIN
        });
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

exports.restablecerContrasena = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { contrasena } = req.body;
        const usuario = await Usuarios.findByPk(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const hash = await argon2.hash(contrasena);
        usuario.contrasena = hash;
        usuario.pin = null;
        usuario.pinExpiracion = null;
        usuario.intentos = 0;
        usuario.estado = 'AC';

        await usuario.save();

        res.status(200).json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

exports.cambiarContrasenaPrimeraVez = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { contrasenaActual, contrasenaNueva } = req.body;
        const usuarioId = req.usuario.id;

        const usuario = await Usuarios.findByPk(usuarioId);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que el usuario requiere cambio de contraseña
        if (!usuario.requiereCambioContrasena) {
            return res.status(400).json({ error: 'Este usuario no necesita cambiar su contraseña' });
        }

        // Verificar contraseña actual
        const contrasenaValida = await argon2.verify(usuario.contrasena, contrasenaActual);
        if (!contrasenaValida) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        }

        // Validar que la nueva contraseña sea diferente a la actual
        const esIgual = await argon2.verify(usuario.contrasena, contrasenaNueva);
        if (esIgual) {
            return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
        }

        // Actualizar contraseña y marcar como cambiada
        const hash = await argon2.hash(contrasenaNueva);
        usuario.contrasena = hash;
        usuario.requiereCambioContrasena = false;

        await usuario.save();

        // Generar nuevo token con la información actualizada
        const token = getToken({
            id: usuario.id,
            login: usuario.login,
            correo: usuario.correo
        });

        res.status(200).json({
            mensaje: 'Contraseña actualizada exitosamente',
            token,
            requiereCambioContrasena: false
        });
    } catch (error) {
        console.error('Error al cambiar contraseña primera vez:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

exports.validarImagenUsuario = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors.array());
    }
    uploadImagenUsuario(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            res.status(400).json({ msj: "Hay errores al cargar la imagen", error: err });
        }
        else if (err) {
            res.status(400).json({ msj: "Hay errores al cargar la imagen", error: err });
        }
        else {
            next();
        }
    });
};


exports.guardarImagenUsuario = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
        }

        const imagen = req.file.filename;
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Se requiere el ID del usuario' });
        }

        // Verificar que el usuario existe
        const usuario = await Usuarios.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que el archivo existe
        const rutaCompleta = path.join(__dirname, '../../public/img/usuarios', imagen);
        if (!fs.existsSync(rutaCompleta)) {
            return res.status(400).json({ error: 'No se pudo almacenar la imagen' });
        }

        // Guardar la referencia en la base de datos
        const imagenGuardada = await UsuarioImagen.create({
            imagen: imagen,
            usuarioId: id,
            estado: 'AC'
        });

        res.status(201).json({
            mensaje: 'Imagen guardada correctamente',
            datos: {
                id: imagenGuardada.id,
                imagen: imagenGuardada.imagen,
                ruta: `/img/usuarios/${imagen}`,
                usuarioId: imagenGuardada.usuarioId
            }
        });

    } catch (error) {
        console.error('Error al guardar imagen:', error);
        res.status(500).json({
            error: 'Error al guardar la imagen',
            detalles: error.message
        });
    }
};

exports.editarImagenUsuario = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
        }

        const nuevaImagen = req.file.filename;
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Se requiere el ID de la imagen' });
        }

        // Buscar la imagen existente
        const imagenExistente = await UsuarioImagen.findByPk(id);
        if (!imagenExistente) {
            // Si la nueva imagen fue subida, eliminarla
            const rutaNuevaImagen = path.join(__dirname, '../../public/img/usuarios', nuevaImagen);
            if (fs.existsSync(rutaNuevaImagen)) {
                fs.unlinkSync(rutaNuevaImagen);
            }
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Eliminar la imagen antigua del servidor
        const rutaImagenAntigua = path.join(__dirname, '../../public/img/usuarios', imagenExistente.imagen);
        if (fs.existsSync(rutaImagenAntigua)) {
            fs.unlinkSync(rutaImagenAntigua);
        }

        // Actualizar la referencia en la base de datos
        imagenExistente.imagen = nuevaImagen;
        await imagenExistente.save();

        res.status(200).json({
            mensaje: 'Imagen actualizada correctamente',
            datos: {
                id: imagenExistente.id,
                imagen: imagenExistente.imagen,
                ruta: `/img/usuarios/${nuevaImagen}`,
                usuarioId: imagenExistente.usuarioId
            }
        });

    } catch (error) {
        console.error('Error al editar imagen:', error);
        res.status(500).json({
            error: 'Error al editar la imagen',
            detalles: error.message
        });
    }
};

exports.eliminarImagenUsuario = async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Se requiere el ID de la imagen' });
        }

        // Buscar la imagen
        const imagen = await UsuarioImagen.findByPk(id);
        if (!imagen) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Eliminar el archivo físico del servidor
        const rutaImagen = path.join(__dirname, '../../public/img/usuarios', imagen.imagen);
        if (fs.existsSync(rutaImagen)) {
            fs.unlinkSync(rutaImagen);
        }

        // Eliminar el registro de la base de datos
        await imagen.destroy();

        res.status(200).json({
            mensaje: 'Imagen eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({
            error: 'Error al eliminar la imagen',
            detalles: error.message
        });
    }
};

exports.listarImagenesUsuario = async (req, res) => {
    try {
        const { usuarioId } = req.query;

        if (!usuarioId) {
            return res.status(400).json({ error: 'Se requiere el ID del usuario' });
        }

        // Verificar que el usuario existe
        const usuario = await Usuarios.findByPk(usuarioId);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Buscar todas las imágenes del usuario
        const imagenes = await UsuarioImagen.findAll({
            where: { usuarioId },
            attributes: ['id', 'imagen', 'estado', 'createdAt', 'updatedAt']
        });

        res.status(200).json({
            mensaje: 'Imágenes recuperadas correctamente',
            total: imagenes.length,
            datos: imagenes.map(img => ({
                id: img.id,
                imagen: img.imagen,
                ruta: `/img/usuarios/${img.imagen}`,
                estado: img.estado,
                createdAt: img.createdAt,
                updatedAt: img.updatedAt
            }))
        });

    } catch (error) {
        console.error('Error al listar imágenes:', error);
        res.status(500).json({
            error: 'Error al listar las imágenes',
            detalles: error.message
        });
    }
};