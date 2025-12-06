const Estudiantes = require('../modelos/Estudiantes');
const Secciones = require('../modelos/Secciones');
const Clases = require('../modelos/Clases');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const Periodos = require('../modelos/Periodos');
const Parciales = require('../modelos/Parciales');
const Usuarios = require('../modelos/Usuarios');
const Roles = require('../modelos/Roles');
const Aulas = require('../modelos/Aulas');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const fs = require('fs');
const {Op} = require('sequelize');
const argon2 = require('argon2');
const { generarLogin, generarContrasenaAleatoria, generarLoginUnico } = require('../utilidades/generadorCredenciales');
const { enviarCorreo } = require('../configuraciones/correo');

// Helper: generar nombre del periodo según fechaInicio (IP / IIP / IIIP + yy)
const generarNombrePeriodo = (fechaInicio) => {
    if (!fechaInicio) return null;
    const fecha = (fechaInicio instanceof Date) ? fechaInicio : new Date(fechaInicio);
    if (isNaN(fecha.getTime())) return null;

    const mes = fecha.getMonth() + 1; // 1-12
    let numeroPeriodo = 1;
    if (mes >= 1 && mes <= 4) numeroPeriodo = 1; // Ene-Abr
    else if (mes >= 5 && mes <= 8) numeroPeriodo = 2; // May-Ago
    else if (mes >= 9 && mes <= 12) numeroPeriodo = 3; // Sep-Dic

    const prefijoI = 'I'.repeat(numeroPeriodo);
    const yy = String(fecha.getFullYear()).slice(-2);
    return `${prefijoI}P${yy}`;
};

// Helper: calcular parciales automáticamente (3 parciales de 4 semanas cada uno)
const generarParcialesAutomaticos = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Validar fechas
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        throw new Error('Fechas inválidas');
    }

    const parciales = [];
    const SEMANAS_POR_PARCIAL = 4;
    const DIAS_POR_SEMANA = 7;
    const DIAS_POR_PARCIAL = SEMANAS_POR_PARCIAL * DIAS_POR_SEMANA;

    for (let i = 1; i <= 3; i++) {
        const inicioParcial = new Date(inicio);
        inicioParcial.setDate(inicio.getDate() + ((i - 1) * DIAS_POR_PARCIAL));

        const finParcial = new Date(inicioParcial);
        finParcial.setDate(inicioParcial.getDate() + DIAS_POR_PARCIAL - 1);

        // Si es el último parcial, usar la fecha fin del periodo
        if (i === 3) {
            parciales.push({
                nombre: `Parcial ${i}`,
                fechaInicio: inicioParcial,
                fechaFin: fin
            });
        } else {
            parciales.push({
                nombre: `Parcial ${i}`,
                fechaInicio: inicioParcial,
                fechaFin: finParcial
            });
        }
    }

    return parciales;
};

// Helper: generar dias de la semana según créditos
const generarDiasPorCreditos = (creditos) => {
    if (!creditos) return [];
    const c = Number(creditos);
    if (c === 4) return ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    if (c === 3) return ["Lunes", "Martes", "Miércoles", "Jueves"];
    return [];
};

// Controlador para obtener todos los estudiantes
exports.ListarEstudiantes = async (req, res) => {
    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { rol, docenteId } = req.usuario;

    try {
        // Construir opciones de consulta base
        const queryOptions = {
            attributes: ['id', 'nombre', 'correo', 'estado'],
            include: [
                {
                    model: EstudiantesClases,
                    as: 'inscripciones',
                    attributes: ['id', 'fechaInscripcion'],
                    // Si es DOCENTE, solo traer inscripciones de sus clases
                    required: rol === 'DOCENTE', // INNER JOIN para DOCENTE, LEFT JOIN para ADMIN
                    include: [
                        {
                            model: Clases,
                            as: 'clase',
                            attributes: ['id', 'codigo', 'nombre', 'docenteId'],
                            required: rol === 'DOCENTE',
                            where: rol === 'DOCENTE' ? { docenteId: docenteId } : undefined
                        },
                        {
                            model: Secciones,
                            as: 'seccion',
                            attributes: ['id', 'nombre']
                        }
                    ]
                }
            ]
        };

        const estudiantes = await Estudiantes.findAll(queryOptions);
        
        res.json(estudiantes);
    } catch (error) {
        console.error('Error al listar estudiantes:', error);
        res.status(500).json({ error: 'Error al listar estudiantes' });
    }
};

// Controlador para crear un nuevo estudiante
exports.CrearEstudiante = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, correo, estado } = req.body;

    try {
        // Verificar si el correo ya existe
        const estudianteExistente = await Estudiantes.findOne({ where: { correo } });
        if (estudianteExistente) {
            return res.status(400).json({ error: 'Ya existe un estudiante con ese correo' });
        }

        const nuevoEstudiante = await Estudiantes.create({
            nombre,
            correo,
            estado: estado || 'ACTIVO'
        });
        
        res.status(201).json({
            message: 'Estudiante creado exitosamente',
            estudiante: nuevoEstudiante
        });
    } catch (error) {
        console.error('Error al crear estudiante:', error);
        res.status(500).json({ error: 'Error al crear estudiante' });
    }
};

// Controlador para actualizar un estudiante existente
exports.ActualizarEstudiante = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, correo, estado } = req.body;
    const { id } = req.query;

    try {
        const estudiante = await Estudiantes.findByPk(id);
        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        // Verificar si el correo ya existe en otro estudiante
        if (correo !== estudiante.correo) {
            const correoExistente = await Estudiantes.findOne({ 
                where: { 
                    correo,
                    id: { [Sequelize.Op.ne]: id }
                }
            });
            if (correoExistente) {
                return res.status(400).json({ error: 'Ya existe un estudiante con ese correo' });
            }
        }

        estudiante.nombre = nombre;
        estudiante.correo = correo;
        estudiante.estado = estado;

        await estudiante.save();
        res.json({
            message: 'Estudiante actualizado exitosamente',
            estudiante: estudiante
        });
    } catch (error) {
        console.error('Error al actualizar estudiante:', error);
        res.status(500).json({ error: 'Error al actualizar estudiante' });
    }
};

// Controlador para eliminar un estudiante
exports.EliminarEstudiante = async (req, res) => {
    const { id } = req.query;

    try {
        const estudiante = await Estudiantes.findByPk(id);
        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        await estudiante.destroy();
        res.json({
            message: 'Estudiante eliminado exitosamente',
            estudiante: estudiante
        });
    } catch (error) {
        console.error('Error al eliminar estudiante:', error);
        res.status(500).json({ error: 'Error al eliminar estudiante' });
    }
};

// Controlador para cargar estudiantes desde archivo Excel
exports.CargarDesdeExcel = async (req, res) => {
    try {
        // Verificar que se haya subido un archivo
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }

        const { aulaId } = req.body;

        // Leer el archivo Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = 'Sheet1';
        
        // Verificar que exista la hoja Sheet1
        if (!workbook.Sheets[sheetName]) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'El archivo no contiene una hoja llamada "Sheet1"' });
        }

        const sheet = workbook.Sheets[sheetName];

        // Leer las celdas B1, B2, B3, B4, B5
        const codigoClaseCell = sheet['B1'];
        const nombreClaseCell = sheet['B2'];
        const nombreSeccionCell = sheet['B3'];
        const fechaInicioCell = sheet['B4'];
        const fechaFinCell = sheet['B5'];

        if (!codigoClaseCell || !codigoClaseCell.v) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'No se encontró el código de clase en la celda B1' });
        }

        const codigoClase = codigoClaseCell.v;
        const nombreClase = nombreClaseCell ? nombreClaseCell.v : null;
        const nombreSeccion = nombreSeccionCell ? String(nombreSeccionCell.v) : null;
        const fechaInicio = fechaInicioCell ? fechaInicioCell.v : null;
        const fechaFin = fechaFinCell ? fechaFinCell.v : null;

        // Validar que se haya proporcionado el nombre de la clase
        if (!nombreClase) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                error: 'No se encontró el nombre de clase en la celda B2. Es requerido para crear o buscar la clase.' 
            });
        }

        // Buscar o crear el periodo basado en fechas
        let periodo = null;
        let periodoCreado = false;

        if (fechaInicio && fechaFin) {
            // Convertir fechas de Excel a JavaScript Date
            let fechaInicioDate, fechaFinDate;

            if (typeof fechaInicio === 'number') {
                // Excel almacena fechas como números (días desde 1900-01-01)
                fechaInicioDate = new Date((fechaInicio - 25569) * 86400 * 1000);
            } else {
                fechaInicioDate = new Date(fechaInicio);
            }

            if (typeof fechaFin === 'number') {
                fechaFinDate = new Date((fechaFin - 25569) * 86400 * 1000);
            } else {
                fechaFinDate = new Date(fechaFin);
            }

            // Buscar periodo existente con las mismas fechas
            periodo = await Periodos.findOne({
                where: {
                    fechaInicio: fechaInicioDate,
                    fechaFin: fechaFinDate
                }
            });

            if (!periodo) {
                // Crear nuevo periodo
                // Generar nombre basado en fechaInicio
                const nombreGenerado = generarNombrePeriodo(fechaInicioDate);
                periodo = await Periodos.create({
                    nombre: nombreGenerado || null,
                    fechaInicio: fechaInicioDate,
                    fechaFin: fechaFinDate
                });
                periodoCreado = true;

                // 🔄 Crear parciales automáticamente
                console.log('🔄 Generando 3 parciales automáticamente para el nuevo periodo...');
                const parcialesGenerados = generarParcialesAutomaticos(fechaInicioDate, fechaFinDate);
                
                const nuevosParciales = parcialesGenerados.map(p => ({
                    ...p,
                    periodoId: periodo.id
                }));

                await Parciales.bulkCreate(nuevosParciales);
                console.log(`✅ ${nuevosParciales.length} parciales creados automáticamente:`, 
                    parcialesGenerados.map(p => `${p.nombre}: ${p.fechaInicio.toISOString().split('T')[0]} - ${p.fechaFin.toISOString().split('T')[0]}`).join(', '));
            }

            else {
                // Si el periodo existe pero no tiene nombre, calcularlo y guardarlo
                if (!periodo.nombre) {
                    const nombreGenerado = generarNombrePeriodo(periodo.fechaInicio || fechaInicioDate);
                    if (nombreGenerado) {
                        periodo.nombre = nombreGenerado;
                        await periodo.save();
                    }
                }
            }
        }

        // Leer creditos del body (opcional pero requerido para asignar dias)
        const creditosBody = req.body && req.body.creditos ? parseInt(req.body.creditos, 10) : null;
        if (creditosBody && ![3,4].includes(creditosBody)) {
            return res.status(400).json({ error: 'Los creditos deben ser 3 o 4 cuando se proporcionan' });
        }

        // Obtener docenteId desde el token (req.usuario ya tiene el docenteId)
        const docenteIdFromToken = req.usuario?.docenteId || null;
        console.log('🔍 DocenteId desde token:', docenteIdFromToken);
        console.log('🔍 Usuario completo desde token:', req.usuario);

        // Buscar o crear la clase
        let clase = await Clases.findOne({ where: { codigo: codigoClase } });
        let claseCreada = false;
        
        if (!clase) {
            // Crear la nueva clase con creditos/diaSemana/docenteId si vienen
            clase = await Clases.create({
                codigo: codigoClase,
                nombre: nombreClase,
                creditos: creditosBody || null,
                diaSemana: generarDiasPorCreditos(creditosBody),
                docenteId: docenteIdFromToken || null
            });
            claseCreada = true;
            console.log('✅ Clase creada con docenteId:', clase.docenteId);
        } else {
            console.log('🔍 Clase existente encontrada. docenteId actual:', clase.docenteId);
            // Si la clase existe, rellenar campos vacíos con lo provisto
            let necesitaGuardar = false;
            if ((!clase.creditos || clase.creditos === null) && creditosBody) {
                clase.creditos = creditosBody;
                clase.diaSemana = generarDiasPorCreditos(creditosBody);
                necesitaGuardar = true;
            }
            if ((!clase.docenteId || clase.docenteId === null) && docenteIdFromToken) {
                console.log('🔄 Actualizando docenteId de la clase a:', docenteIdFromToken);
                clase.docenteId = docenteIdFromToken;
                necesitaGuardar = true;
            }
            if (necesitaGuardar) {
                await clase.save();
                console.log('✅ Clase actualizada con docenteId:', clase.docenteId);
            }
        }

        // Buscar o crear la sección
        let seccion = null;
        let seccionCreada = false;
        
        if (nombreSeccion) {
            // Requerir aulaId en el body para crear la sección
            if (!aulaId) {
                return res.status(400).json({ error: 'El campo aulaId es obligatorio en el body cuando se crea una sección' });
            }

            // Verificar que el aula proporcionada exista
            const aulaIdNum = Number(aulaId);
            const aulaExistente = await Aulas.findByPk(aulaIdNum);
            if (!aulaExistente) {
                return res.status(400).json({ error: `No existe un aula con id ${aulaId}` });
            }

            seccion = await Secciones.findOne({ 
                where: { 
                    nombre: nombreSeccion,
                    claseId: clase.id 
                } 
            });

            if (!seccion) {
                // Crear la nueva sección automáticamente con aulaId provisto
                seccion = await Secciones.create({
                    nombre: nombreSeccion,
                    claseId: clase.id,
                    aulaId: aulaIdNum
                });
                seccionCreada = true;
            } else {
                // Si la sección existe pero no tiene aulaId o es distinto, actualizarlo
                if (!seccion.aulaId || seccion.aulaId !== aulaIdNum) {
                    seccion.aulaId = aulaIdNum;
                    await seccion.save();
                }
            }
        }

        // Obtener los datos desde la fila 8 hasta la última fila con datos
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const estudiantes = [];
        const errores = [];

        // Recorrer desde la fila 8 (índice 7) hasta la última fila
        for (let row = 7; row <= range.e.r; row++) {
            // Obtener valores de las celdas B, C, D
            const cuentaCell = sheet[`B${row + 1}`];
            const nombreCell = sheet[`C${row + 1}`];
            const correoCell = sheet[`D${row + 1}`];

            // Si alguna celda está vacía, detener la lectura
            if (!cuentaCell && !nombreCell && !correoCell) {
                break;
            }

            const cuenta = cuentaCell ? cuentaCell.v : null;
            const nombre = nombreCell ? nombreCell.v : null;
            const correo = correoCell ? correoCell.v : null;

            // Validar que los campos no estén vacíos
            if (!cuenta || !nombre || !correo) {
                errores.push({
                    fila: row + 1,
                    error: 'Datos incompletos (Cuenta, Nombre o Correo faltante)'
                });
                continue;
            }

            // Validar formato de correo básico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(correo)) {
                errores.push({
                    fila: row + 1,
                    cuenta: cuenta,
                    error: 'Formato de correo inválido'
                });
                continue;
            }

            estudiantes.push({
                cuenta,
                nombre,
                correo
            });
        }

        // Eliminar el archivo temporal
        fs.unlinkSync(req.file.path);

        if (estudiantes.length === 0) {
            return res.status(400).json({
                error: 'No se encontraron estudiantes válidos en el archivo',
                errores: errores
            });
        }

        console.log(`Estudiantes leídos del Excel: ${estudiantes.length}`);
        if (periodo) {
            console.log(`Periodo: ${periodo.nombre || 'Sin nombre'} (${periodo.fechaInicio.toISOString().split('T')[0]} - ${periodo.fechaFin.toISOString().split('T')[0]}) ${periodoCreado ? 'CREADO' : ' Existente'}`);
        }
        console.log(`Clase: ${clase.nombre} (${clase.codigo}) ${claseCreada ? 'CREADA' : ' Existente'}`);
        console.log(`Sección: ${seccion ? seccion.nombre : 'Sin sección'} ${seccionCreada ? 'CREADA' : ' Existente'}`);

        // Procesar estudiantes
        const estudiantesCreados = [];
        const inscripcionesCreadas = [];
        const estudiantesConError = [];

        for (const est of estudiantes) {
            try {
                // Buscar o crear estudiante
                let estudiante = await Estudiantes.findOne({ where: { correo: est.correo } });
                
                if (!estudiante) {
                    estudiante = await Estudiantes.create({
                        nombre: est.nombre,
                        correo: est.correo,
                        estado: 'ACTIVO'
                    });
                    estudiantesCreados.push({
                        cuenta: est.cuenta,
                        nombre: est.nombre,
                        correo: est.correo,
                        id: estudiante.id
                    });

                    // 🔐 CREAR USUARIO AUTOMÁTICAMENTE para el nuevo estudiante
                    console.log(`🔄 Intentando crear usuario para estudiante: ${est.nombre} (${est.correo})`);
                    try {
                        // Buscar el rol ESTUDIANTE
                        const rolEstudiante = await Roles.findOne({ where: { nombre: 'ESTUDIANTE' } });
                        
                        if (!rolEstudiante) {
                            console.error('❌ Rol ESTUDIANTE no encontrado en la base de datos');
                            console.error('💡 Asegúrate de que existe un rol llamado "ESTUDIANTE" en la tabla Roles');
                        } else {
                            console.log(`✅ Rol ESTUDIANTE encontrado (ID: ${rolEstudiante.id})`);
                            
                            // Verificar si ya existe un usuario para este estudiante
                            const usuarioExistente = await Usuarios.findOne({ 
                                where: { estudianteId: estudiante.id } 
                            });
                            
                            if (usuarioExistente) {
                                console.log(`ℹ️ El estudiante ${est.nombre} ya tiene usuario: ${usuarioExistente.login}`);
                            } else {
                                // Generar credenciales únicas
                                const loginBase = generarLogin(est.nombre, est.correo);
                                const login = await generarLoginUnico(loginBase, Usuarios);
                                const contrasenaTemp = generarContrasenaAleatoria(10);
                                
                                console.log(`🔑 Credenciales generadas - Login: ${login}, Contraseña: ${contrasenaTemp}`);
                                
                                // Hashear contraseña
                                const contrasenaHash = await argon2.hash(contrasenaTemp);
                                
                                // Crear usuario con flag de cambio obligatorio
                                const nuevoUsuario = await Usuarios.create({
                                    login: login,
                                    correo: est.correo,
                                    contrasena: contrasenaHash,
                                    requiereCambioContrasena: true,
                                    rolId: rolEstudiante.id,
                                    estudianteId: estudiante.id,
                                    estado: 'AC'
                                });

                                console.log(`✅ Usuario creado exitosamente con ID: ${nuevoUsuario.id}`);

                                // 📧 Enviar correo con credenciales
                                const asunto = '🔐 Credenciales de Acceso - Sistema de Gestión Docente';
                                const cuerpoHTML = `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <h2 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
                                            🎓 Bienvenido al Sistema de Gestión Académica
                                        </h2>
                                        
                                        <p>Hola <strong>${est.nombre}</strong>,</p>
                                        
                                        <p>Se ha creado tu cuenta de usuario. A continuación encontrarás tus credenciales de acceso:</p>
                                        
                                        <div style="background-color: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
                                            <h3 style="margin-top: 0; color: #2c3e50;">🔐 Tus Credenciales de Acceso</h3>
                                            <table style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding: 8px 0; color: #555;"><strong>Usuario (Login):</strong></td>
                                                    <td style="padding: 8px 0; color: #2c3e50; font-family: monospace; font-size: 14px;"><strong>${login}</strong></td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #555;"><strong>Correo alternativo:</strong></td>
                                                    <td style="padding: 8px 0; color: #2c3e50;">${est.correo}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #555;"><strong>Contraseña Temporal:</strong></td>
                                                    <td style="padding: 8px 0; background-color: #fff3cd; color: #856404; font-family: monospace; font-size: 16px; font-weight: bold; border-radius: 4px; padding: 5px 10px;">${contrasenaTemp}</td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                                            <h3 style="margin-top: 0; color: #856404;">⚠️ Importante</h3>
                                            <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                                                <li>Puedes iniciar sesión usando tu <strong>usuario (${login})</strong> o tu <strong>correo electrónico</strong></li>
                                                <li>Esta contraseña es <strong>temporal</strong></li>
                                                <li>En tu primer inicio de sesión, el sistema te pedirá que cambies tu contraseña por una nueva de tu elección</li>
                                                <li>Guarda esta información en un lugar seguro</li>
                                            </ul>
                                        </div>
                                        
                                        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px; border-top: 1px solid #ecf0f1; padding-top: 15px;">
                                            <em>Este es un mensaje automático. Por favor no respondas a este correo.</em><br>
                                            Si tienes problemas para acceder, contacta al administrador del sistema.
                                        </p>
                                    </div>
                                `;

                                console.log(`📧 Enviando correo a: ${est.correo}`);
                                await enviarCorreo([est.correo], asunto, cuerpoHTML);
                                console.log(`✅ Correo enviado exitosamente a ${est.correo}`);
                                console.log(`✅ Usuario y credenciales creados para estudiante: ${est.nombre} (${login})`);
                            }
                        }
                    } catch (errorUsuario) {
                        console.error(`❌ Error al crear usuario para estudiante ${est.correo}:`);
                        console.error('Tipo de error:', errorUsuario.name);
                        console.error('Mensaje:', errorUsuario.message);
                        console.error('Stack:', errorUsuario.stack);
                        // No fallar la importación si falla la creación del usuario
                    }
                }

                // Crear inscripción en EstudiantesClases (siempre, con o sin sección)
                // Verificar si ya existe la inscripción
                const whereCondition = {
                    estudianteId: estudiante.id,
                    claseId: clase.id
                };
                
                if (seccion) {
                    whereCondition.seccionId = seccion.id;
                }

                const inscripcionExistente = await EstudiantesClases.findOne({
                    where: whereCondition
                });

                if (inscripcionExistente) {
                    estudiantesConError.push({
                        cuenta: est.cuenta,
                        correo: est.correo,
                        error: 'El estudiante ya está inscrito en esta clase y sección'
                    });
                    continue;
                }

                const datosInscripcion = {
                    estudianteId: estudiante.id,
                    claseId: clase.id,
                    seccionId: seccion ? seccion.id : null
                };

                console.log(` Creando inscripción para ${est.nombre}:`, datosInscripcion);

                await EstudiantesClases.create(datosInscripcion);

                inscripcionesCreadas.push({
                    cuenta: est.cuenta,
                    nombre: est.nombre,
                    correo: est.correo,
                    clase: clase.nombre,
                    seccion: seccion ? seccion.nombre : 'Sin sección'
                });

            } catch (error) {
                console.error(` Error procesando estudiante ${est.correo}:`, error);
                console.error('Detalles del error:', {
                    message: error.message,
                    name: error.name,
                    errors: error.errors ? error.errors.map(e => ({
                        message: e.message,
                        type: e.type,
                        path: e.path,
                        value: e.value
                    })) : 'No hay errores de validación detallados'
                });
                estudiantesConError.push({
                    cuenta: est.cuenta,
                    correo: est.correo,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            message: 'Proceso de carga completado',
            periodo: periodo ? {
                id: periodo.id,
                nombre: periodo.nombre,
                fechaInicio: periodo.fechaInicio,
                fechaFin: periodo.fechaFin,
                creado: periodoCreado
            } : null,
            clase: {
                id: clase.id,
                codigo: clase.codigo,
                nombre: clase.nombre,
                docenteId: clase.docenteId,
                creada: claseCreada
            },
            seccion: seccion ? {
                id: seccion.id,
                nombre: seccion.nombre,
                aula: seccion.aulaId,
                creada: seccionCreada
            } : null,
            resumen: {
                totalLeidos: estudiantes.length,
                estudiantesNuevos: estudiantesCreados.length,
                inscripcionesCreadas: inscripcionesCreadas.length,
                errores: estudiantesConError.length + errores.length
            },
            estudiantesCreados: estudiantesCreados,
            inscripcionesCreadas: inscripcionesCreadas,
            erroresValidacion: errores,
            erroresGuardado: estudiantesConError,
            debug: {
                docenteIdFromToken: docenteIdFromToken,
                claseDocenteId: clase.docenteId,
                usuario: req.usuario ? {
                    id: req.usuario.id,
                    rol: req.usuario.rol,
                    docenteId: req.usuario.docenteId
                } : null
            }
        });

    } catch (error) {
        // Eliminar archivo temporal en caso de error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error al procesar archivo Excel:', error);
        res.status(500).json({ error: 'Error al procesar el archivo Excel', detalle: error.message });
    }
};

// FILTRO 1: Filtrar por nombre y estado
exports.filtrarPorNombreYEstado = async (req, res) => {
    try {
        const { nombre, estado } = req.query;
        const whereClause = {};

        if (nombre) {
            whereClause.nombre = {
                [Op.like]: `%${nombre.trim()}%`
            };
        }

        if (estado) {
            whereClause.estado = estado.toUpperCase();
        }

        const estudiantes = await Estudiantes.findAll({
            where: whereClause,
            include: [
                {
                    model: EstudiantesClases,
                    as: 'inscripciones',
                    include: [
                        {
                            model: Clases,
                            as: 'clase',
                            attributes: ['id', 'codigo', 'nombre']
                        },
                        {
                            model: Secciones,
                            as: 'seccion',
                            attributes: ['id', 'nombre']
                        }
                    ]
                }
            ],
            order: [['nombre', 'ASC']]
        });

        res.status(200).json({
            msj: `Se encontraron ${estudiantes.length} estudiante(s)`,
            data: estudiantes,
            count: estudiantes.length
        });

    } catch (error) {
        console.error('Error al filtrar estudiantes:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// FILTRO 2: Filtrar por correo
exports.filtrarPorCorreo = async (req, res) => {
    try {
        const { correo, tipoBusqueda = 'exacta' } = req.query;
        
        const whereClause = {
            correo: tipoBusqueda === 'exacta' ? correo : {
                [Op.like]: `%${correo}%`
            }
        };

        const estudiantes = await Estudiantes.findAll({
            where: whereClause,
            include: [
                {
                    model: EstudiantesClases,
                    as: 'inscripciones',
                    include: [
                        {
                            model: Clases,
                            as: 'clase',
                            attributes: ['id', 'codigo', 'nombre']
                        },
                        {
                            model: Secciones,
                            as: 'seccion',
                            attributes: ['id', 'nombre']
                        }
                    ]
                }
            ],
            order: [['correo', 'ASC']]
        });

        res.status(200).json({
            msj: `Se encontraron ${estudiantes.length} estudiante(s)`,
            data: estudiantes,
            count: estudiantes.length
        });

    } catch (error) {
        console.error('Error al filtrar estudiantes por correo:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// FILTRO 3: Filtrar con estadísticas
exports.filtrarConEstadisticas = async (req, res) => {
    try {
        const { estado, minimoClases } = req.query;
        const whereClause = {};

        if (estado) {
            whereClause.estado = estado.toUpperCase();
        }

        const estudiantes = await Estudiantes.findAll({
            where: whereClause,
            include: [
                {
                    model: EstudiantesClases,
                    as: 'inscripciones',
                    include: [
                        {
                            model: Clases,
                            as: 'clase',
                            attributes: ['id', 'codigo', 'nombre']
                        },
                        {
                            model: Secciones,
                            as: 'seccion',
                            attributes: ['id', 'nombre']
                        }
                    ]
                }
            ],
            order: [['nombre', 'ASC']]
        });

        // Filtrar por número mínimo de clases si se especifica
        const estudiantesFiltrados = minimoClases ? 
            estudiantes.filter(est => est.inscripciones.length >= parseInt(minimoClases)) :
            estudiantes;

        // Calcular estadísticas generales
        const estadisticas = {
            activos: estudiantes.filter(e => e.estado === 'ACTIVO').length,
            inactivos: estudiantes.filter(e => e.estado === 'INACTIVO').length,
            retirados: estudiantes.filter(e => e.estado === 'RETIRADO').length
        };

        // Agregar estadísticas individuales
        const dataConEstadisticas = estudiantesFiltrados.map(est => ({
            ...est.toJSON(),
            estadisticas: {
                totalClases: est.inscripciones.length,
                totalInscripciones: est.inscripciones.length
            }
        }));

        res.status(200).json({
            msj: `Se encontraron ${estudiantesFiltrados.length} estudiante(s)`,
            data: dataConEstadisticas,
            count: estudiantesFiltrados.length,
            estadisticas
        });

    } catch (error) {
        console.error('Error al filtrar estudiantes con estadísticas:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// FILTRO 4: Obtener estudiantes inscritos en una clase específica
exports.obtenerEstudiantesPorClase = async (req, res) => {
    try {
        const { claseId } = req.query;

        if (!claseId) {
            return res.status(400).json({ error: 'claseId es requerido' });
        }

        // Obtener inscripciones de la clase
        const inscripciones = await EstudiantesClases.findAll({
            where: { claseId: parseInt(claseId) },
            include: [
                {
                    model: Estudiantes,
                    as: 'estudiante',
                    attributes: ['id', 'nombre', 'correo', 'estado']
                }
            ]
        });

        // Extraer solo los estudiantes únicos
        const estudiantes = inscripciones
            .map(insc => insc.estudiante)
            .filter((estudiante, index, self) => 
                estudiante && index === self.findIndex(e => e.id === estudiante.id)
            );

        res.status(200).json({
            msj: `Se encontraron ${estudiantes.length} estudiante(s) inscritos en la clase`,
            data: estudiantes,
            count: estudiantes.length
        });

    } catch (error) {
        console.error('Error al obtener estudiantes por clase:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};