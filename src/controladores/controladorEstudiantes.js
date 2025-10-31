const Estudiantes = require('../modelos/Estudiantes');
const Secciones = require('../modelos/Secciones');
const Clases = require('../modelos/Clases');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const fs = require('fs');

// Controlador para obtener todos los estudiantes
exports.ListarEstudiantes = async (req, res) => {
    try {
        const estudiantes = await Estudiantes.findAll({
            attributes: ['id', 'nombre', 'apellido', 'correo', 'estado'],
            include: [
                {
                    model: Secciones,
                    as: 'seccion',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Clases,
                    as: 'clase',
                    attributes: ['id', 'nombre']
                }
            ]
        });
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

    const { nombre, apellido, correo, seccionId, claseId, estado } = req.body;

    try {
        // Verificar si el correo ya existe
        const estudianteExistente = await Estudiantes.findOne({ where: { correo } });
        if (estudianteExistente) {
            return res.status(400).json({ error: 'Ya existe un estudiante con ese correo' });
        }

        // Verificar si la sección existe (solo si se proporciona)
        if (seccionId) {
            const seccionExistente = await Secciones.findByPk(seccionId);
            if (!seccionExistente) {
                return res.status(400).json({ error: 'La sección especificada no existe' });
            }
        }

        // Verificar si la clase existe (solo si se proporciona)
        if (claseId) {
            const claseExistente = await Clases.findByPk(claseId);
            if (!claseExistente) {
                return res.status(400).json({ error: 'La clase especificada no existe' });
            }
        }

        const nuevoEstudiante = await Estudiantes.create({
            nombre,
            apellido,
            correo,
            seccionId: seccionId || null,
            claseId: claseId || null,
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

    const { nombre, apellido, correo, seccionId, claseId, estado } = req.body;
    const { id } = req.query;

    try {
        const estudiante = await Estudiantes.findByPk(id);
        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        // Verificar si el correo ya existe en otro estudiante
        if (correo !== estudiante.correo) {
            const correoExistente = await Estudiantes.findOne({ where: { correo } });
            if (correoExistente) {
                return res.status(400).json({ error: 'Ya existe un estudiante con ese correo' });
            }
        }

        // Verificar si la sección existe (solo si se proporciona)
        if (seccionId) {
            const seccionExistente = await Secciones.findByPk(seccionId);
            if (!seccionExistente) {
                return res.status(400).json({ error: 'La sección especificada no existe' });
            }
        }

        // Verificar si la clase existe (solo si se proporciona)
        if (claseId) {
            const claseExistente = await Clases.findByPk(claseId);
            if (!claseExistente) {
                return res.status(400).json({ error: 'La clase especificada no existe' });
            }
        }

        estudiante.nombre = nombre;
        estudiante.apellido = apellido;
        estudiante.correo = correo;
        estudiante.seccionId = seccionId || null;
        estudiante.claseId = claseId || null;
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

        // Leer el archivo Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = 'Sheet1';
        
        // Verificar que exista la hoja Sheet1
        if (!workbook.Sheets[sheetName]) {
            // Eliminar el archivo temporal
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'El archivo no contiene una hoja llamada "Sheet1"' });
        }

        const sheet = workbook.Sheets[sheetName];

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

        // Guardar estudiantes en la base de datos
        const estudiantesCreados = [];
        const estudiantesConError = [];

        for (const est of estudiantes) {
            try {
                // Verificar si el correo ya existe
                const existente = await Estudiantes.findOne({ where: { correo: est.correo } });
                if (existente) {
                    estudiantesConError.push({
                        cuenta: est.cuenta,
                        correo: est.correo,
                        error: 'El correo ya está registrado'
                    });
                    continue;
                }

                // Por ahora, los estudiantes se crean sin sección ni clase
                // Puedes modificar esto según tus necesidades
                const nuevoEstudiante = await Estudiantes.create({
                    nombre: est.nombre,
                    apellido: '', // El Excel no tiene apellido, puedes ajustar esto
                    correo: est.correo,
                    seccionId: null, // Ajustar según necesites
                    claseId: null, // Ajustar según necesites
                    estado: 'ACTIVO'
                });

                estudiantesCreados.push({
                    cuenta: est.cuenta,
                    nombre: est.nombre,
                    correo: est.correo,
                    id: nuevoEstudiante.id
                });
            } catch (error) {
                estudiantesConError.push({
                    cuenta: est.cuenta,
                    correo: est.correo,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            message: 'Proceso de carga completado',
            resumen: {
                total: estudiantes.length,
                creados: estudiantesCreados.length,
                errores: estudiantesConError.length + errores.length
            },
            estudiantesCreados: estudiantesCreados,
            erroresValidacion: errores,
            erroresGuardado: estudiantesConError
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
