const Estudiantes = require('../modelos/Estudiantes');
const Secciones = require('../modelos/Secciones');
const Clases = require('../modelos/Clases');
const { validationResult } = require('express-validator');

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

        // Verificar si la sección existe
        const seccionExistente = await Secciones.findByPk(seccionId);
        if (!seccionExistente) {
            return res.status(400).json({ error: 'La sección especificada no existe' });
        }

        // Verificar si la clase existe
        const claseExistente = await Clases.findByPk(claseId);
        if (!claseExistente) {
            return res.status(400).json({ error: 'La clase especificada no existe' });
        }

        const nuevoEstudiante = await Estudiantes.create({
            nombre,
            apellido,
            correo,
            seccionId,
            claseId,
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

        // Verificar si la sección existe
        const seccionExistente = await Secciones.findByPk(seccionId);
        if (!seccionExistente) {
            return res.status(400).json({ error: 'La sección especificada no existe' });
        }

        // Verificar si la clase existe
        const claseExistente = await Clases.findByPk(claseId);
        if (!claseExistente) {
            return res.status(400).json({ error: 'La clase especificada no existe' });
        }

        estudiante.nombre = nombre;
        estudiante.apellido = apellido;
        estudiante.correo = correo;
        estudiante.seccionId = seccionId;
        estudiante.claseId = claseId;
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
