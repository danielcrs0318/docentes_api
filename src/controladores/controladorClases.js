const Clases = require('../modelos/Clases');
const Seccion = require('../modelos/Secciones');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Controlador para obtener todas las clases
exports.ListarClases = async (req, res) => {
    try {
        const clases = await Clases.findAll({
            attributes: ['id', 'codigo', 'nombre', 'diaSemana'],
            include: [{
                model: Seccion,
                as: 'secciones',
                attributes: ['id', 'nombre', 'aulaId']
            }]
        });
        res.json(clases);
    } catch (error) {
        console.error('Error al listar clases:', error);
        res.status(500).json({ error: 'Error al listar clases' });
    }
};

// Controlador para crear una nueva clase
exports.CrearClase = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { codigo, nombre, diaSemana, creditos } = req.body;

    try {
        // Verificar si ya existe una clase con el mismo código
        const claseExistente = await Clases.findOne({ 
            where: { codigo }
        });

        if (claseExistente) {
            return res.status(400).json({ 
                error: 'Ya existe una clase con ese código'
            });
        }

        const nuevaClase = await Clases.create({
            codigo,
            nombre,
            diaSemana,
            creditos
        });
        res.status(201).json(nuevaClase);
    } catch (error) {
        console.error('Error al crear clase:', error);
        res.status(500).json({ error: 'Error al crear clase' });
    }
};

// Controlador para actualizar una clase existente
exports.ActualizarClase = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { codigo, nombre, diaSemana } = req.body;
    const { id } = req.query;

    try {
        // Verificar si la clase existe
        const clase = await Clases.findByPk(id);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Verificar si existe otra clase con el mismo código (excepto la actual)
        const claseExistente = await Clases.findOne({
            where: {
                codigo: codigo,
                id: { [Op.ne]: id } // Excluir la clase actual de la búsqueda
            }
        });

        if (claseExistente) {
            return res.status(400).json({
                error: 'Ya existe otra clase con ese código'
            });
        }

        clase.codigo = codigo;
        clase.nombre = nombre;
        clase.diaSemana = diaSemana;

        await clase.save();
        res.json(clase);
    } catch (error) {
        console.error('Error al actualizar clase:', error);
        res.status(500).json({ error: 'Error al actualizar clase' });
    }
};

// Controlador para eliminar una clase
exports.EliminarClase = async (req, res) => {
    const { id } = req.query;

    try {
        const clase = await Clases.findByPk(id);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        await clase.destroy();
        res.json({ message: 'Clase eliminada' });
    } catch (error) {
        console.error('Error al eliminar clase:', error);
        res.status(500).json({ error: 'Error al eliminar clase' });
    }
};
