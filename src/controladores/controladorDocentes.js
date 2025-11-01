const { validationResult } = require('express-validator');
const Docentes = require('../modelos/Docentes');
const Clases = require('../modelos/Clases');

// Listar todos los docentes
const ListarDocentes = async (req, res) => {
    try {
        const docentes = await Docentes.findAll({
            include: [
                {
                    model: Clases,
                    as: 'clases',
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

        const nuevo = await Docentes.create({ nombre, correo, especialidad, estado: estado || 'ACTIVO' });
        res.status(201).json({ message: 'Docente creado exitosamente', docente: nuevo });
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
        const { id } = req.params;
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
        const { id } = req.params;
        const docente = await Docentes.findByPk(id);
        if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });

        await docente.destroy();
        res.json({ message: 'Docente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar docente:', error);
        res.status(500).json({ error: 'Error al eliminar docente' });
    }
};

module.exports = {
    ListarDocentes,
    CrearDocente,
    ActualizarDocente,
    EliminarDocente
};
