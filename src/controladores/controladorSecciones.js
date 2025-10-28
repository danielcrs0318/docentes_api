const Secciones = require('../modelos/Secciones');
const Aulas = require('../modelos/Aulas');
const Clases = require('../modelos/Clases');
const { validationResult } = require('express-validator');

// Controlador para obtener todas las secciones
exports.ListarSecciones = async (req, res) => {
    try {
        const secciones = await Secciones.findAll({
            attributes: ['id', 'nombre'],
            include: [
                {
                    model: Aulas,
                    as: 'aula',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Clases,
                    as: 'clase',
                    attributes: ['id', 'nombre']
                }
            ]
        });
        res.json(secciones);
    } catch (error) {
        console.error('Error al listar secciones:', error);
        res.status(500).json({ error: 'Error al listar secciones' });
    }
};

// Controlador para crear una nueva sección
exports.CrearSeccion = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, aulaId, claseId } = req.body;

    try {
        const nuevaSeccion = await Secciones.create({
            nombre,
            aulaId,
            claseId
        });
        res.status(201).json({
            message: 'Sección creada exitosamente',
            seccion: nuevaSeccion
        });
    } catch (error) {
        console.error('Error al crear sección:', error);
        res.status(500).json({ error: 'Error al crear sección' });
    }
};

// Controlador para actualizar una sección existente
exports.ActualizarSeccion = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, aulaId, claseId } = req.body;
    const { id } = req.query;

    try {
        const seccion = await Secciones.findByPk(id);
        if (!seccion) {
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        seccion.nombre = nombre;
        seccion.aulaId = aulaId;
        seccion.claseId = claseId;

        await seccion.save();
        res.json({
            message: 'Sección actualizada exitosamente',
            seccion: seccion
        });
    } catch (error) {
        console.error('Error al actualizar sección:', error);
        res.status(500).json({ error: 'Error al actualizar sección' });
    }
};

// Controlador para eliminar una sección
exports.EliminarSeccion = async (req, res) => {
    const { id } = req.query;

    try {
        const seccion = await Secciones.findByPk(id);
        if (!seccion) {
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        await seccion.destroy();
        res.json({
            message: 'Sección eliminada exitosamente',
            seccion: seccion
        });
    } catch (error) {
        console.error('Error al eliminar sección:', error);
        res.status(500).json({ error: 'Error al eliminar sección' });
    }
};
