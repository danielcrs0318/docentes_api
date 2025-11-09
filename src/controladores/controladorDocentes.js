const { validationResult } = require('express-validator');
const Docentes = require('../modelos/Docentes');
const Clases = require('../modelos/Clases');
const { Op } = require('sequelize');

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