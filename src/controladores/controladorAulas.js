const Aulas = require('../modelos/Aulas');
const { validationResult } = require('express-validator');

// Controlador para obtener todas las aulas
exports.ListarAulas = async (req, res) => {
    try {
        const aulas = await Aulas.findAll({
            attributes: ['id', 'nombre', 'capacidad'] // Campos específicos de aula
        });
        res.json(aulas);
    } catch (error) {
        console.error('Error al listar aulas:', error);
        res.status(500).json({ error: 'Error al listar aulas' });
    }
};

// Controlador para crear una nueva aula
exports.CrearAula = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, capacidad } = req.body;

    try {
        // Verificar si ya existe un aula con el mismo nombre
        const aulaExistente = await Aulas.findOne({ where: { nombre } });
        if (aulaExistente) {
            return res.status(400).json({ error: 'Ya existe un aula con ese nombre' });
        }

        const nuevaAula = await Aulas.create({ nombre, capacidad });
        res.status(201).json({
            message: 'Aula creada exitosamente',
            aula: nuevaAula
        });
    } catch (error) {
        console.error('Error al crear aula:', error);
        res.status(500).json({ error: 'Error al crear aula' });
    }
};

// Controlador para actualizar un aula existente
exports.ActualizarAula = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, capacidad } = req.body;
    const { id } = req.query;

    try {
        const aula = await Aulas.findByPk(id);
        if (!aula) {
            return res.status(404).json({ error: 'Aula no encontrada' });
        }

        aula.nombre = nombre;
        aula.capacidad = capacidad;
        await aula.save();
        res.json({ 
            message: 'Aula actualizada exitosamente',
            aula: aula
        });
        
    } catch (error) {
        console.error('Error al actualizar aula:', error);
        res.status(500).json({ error: 'Error al actualizar aula' });
    }
};

// Controlador para eliminar un aula
exports.EliminarAula = async (req, res) => {
    const { id } = req.query;
    try {
        const aula = await Aulas.findByPk(id);
        if (!aula) {
            return res.status(404).json({ error: 'Aula no encontrada' });
        }
        const aulaEliminada = {...aula.dataValues};
        await aula.destroy();
        res.json({ 
            message: 'Aula eliminada exitosamente',
            aula: aulaEliminada
        });
    } catch (error) {
        console.error('Error al eliminar aula:', error);
        res.status(500).json({ error: 'Error al eliminar aula' });
    }
};

