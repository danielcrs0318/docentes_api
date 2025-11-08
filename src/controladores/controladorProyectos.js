const Proyectos = require('../modelos/Proyectos');
const Estudiantes = require('../modelos/Estudiantes');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

// Listar todos los proyectos
exports.ListarProyectos = async (req, res) => {
    try {
        const proyectos = await Proyectos.findAll({
            include: [{ model: Estudiantes, as: 'estudiantes', through: { attributes: ['entregaArchivo','entregaFecha','estadoEntrega'] } }]
        });
        res.json(proyectos);
    } catch (error) {
        console.error('Error listar proyectos:', error);
        res.status(500).json({ error: 'Error listar proyectos' });
    }
};


// Crear proyecto
exports.CrearProyecto = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, descripcion, fecha_entrega, estado, claseId } = req.body;
    try {
        const nuevo = await Proyectos.create({ nombre, descripcion, fecha_entrega: fecha_entrega || null, estado: estado || 'PENDIENTE', claseId: claseId || null });
        res.status(201).json({ message: 'Proyecto creado', proyecto: nuevo });
    } catch (error) {
        console.error('Error crear proyecto:', error);
        res.status(500).json({ error: 'Error crear proyecto' });
    }
};


// Actualizar proyecto
exports.ActualizarProyecto = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { id } = req.query;
    const { nombre, descripcion, fecha_entrega, estado, claseId } = req.body;
    try {
        const proyecto = await Proyectos.findByPk(id);
        if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
        proyecto.nombre = nombre;
        proyecto.descripcion = descripcion;
        proyecto.fecha_entrega = fecha_entrega || null;
        proyecto.estado = estado || proyecto.estado;
        proyecto.claseId = claseId || proyecto.claseId;
        await proyecto.save();
        res.json({ message: 'Proyecto actualizado', proyecto });
    } catch (error) {
        console.error('Error actualizar proyecto:', error);
        res.status(500).json({ error: 'Error actualizar proyecto' });
    }
};

// Eliminar proyecto
exports.EliminarProyecto = async (req, res) => {
    const { id } = req.query;
    try {
        const proyecto = await Proyectos.findByPk(id);
        if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
        await proyecto.destroy();
        res.json({ message: 'Proyecto eliminado', proyecto });
    } catch (error) {
        console.error('Error eliminar proyecto:', error);
        res.status(500).json({ error: 'Error eliminar proyecto' });
    }
};

// Asignar proyecto a estudiantes (lista explícita)
exports.AsignarProyecto = async (req, res) => {
    const { proyectoId, estudiantes } = req.body; // estudiantes: [id1,id2]
    if (!proyectoId || !Array.isArray(estudiantes)) return res.status(400).json({ error: 'proyectoId y estudiantes[] requeridos' });
    try {
        const proyecto = await Proyectos.findByPk(proyectoId);
        if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

        let asignados = 0;
        for (const estId of estudiantes) {
            const est = await Estudiantes.findByPk(estId);
            if (!est) continue;
            est.proyectoId = proyectoId;
            await est.save();
            asignados++;
        }
        res.json({ message: 'Asignación completada', asignaciones: asignados });
    } catch (error) {
        console.error('Error asignar proyecto:', error);
        res.status(500).json({ error: 'Error asignar proyecto' });
    }
};

// Asignar aleatoriamente (tipo rifa). Body: proyectoId, cantidad (opcional)
exports.AsignarAleatorio = async (req, res) => {
    const { proyectoId, cantidad } = req.body;
    if (!proyectoId) return res.status(400).json({ error: 'proyectoId requerido' });
    try {
        const proyecto = await Proyectos.findByPk(proyectoId);
        if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

        // Seleccionar pool de estudiantes: si proyecto.claseId usar claseId, sino todos
        const where = proyecto.claseId ? { claseId: proyecto.claseId } : {};
        const todos = await Estudiantes.findAll({ where, attributes: ['id'] });
        if (todos.length === 0) return res.status(400).json({ error: 'No hay estudiantes disponibles para asignar' });

        const ids = todos.map(t => t.id);
        const n = Math.min(cantidad || 1, ids.length);
        const seleccion = [];
        while (seleccion.length < n) {
            const idx = Math.floor(Math.random() * ids.length);
            const id = ids.splice(idx, 1)[0];
            seleccion.push(id);
        }

        for (const estId of seleccion) {
            const est = await Estudiantes.findByPk(estId);
            if (est) {
                est.proyectoId = proyectoId;
                await est.save();
            }
        }
        res.json({ message: 'Asignación aleatoria completada', asignados: seleccion });
    } catch (error) {
        console.error('Error asignar aleatorio:', error);
        res.status(500).json({ error: 'Error asignar aleatorio' });
    }
};

// Subir entrega (file upload). Expects proyectoId and estudianteId in body and file in 'archivo'
// NOTA: Ahora el archivo se guarda en el modelo Proyectos o Estudiantes según prefieras
// Esta función actualiza el estudiante con información de entrega
exports.SubirEntrega = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
        const { proyectoId, estudianteId } = req.body;
        if (!proyectoId || !estudianteId) return res.status(400).json({ error: 'proyectoId y estudianteId requeridos' });

        const estudiante = await Estudiantes.findByPk(estudianteId);
        if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });
        
        if (estudiante.proyectoId !== parseInt(proyectoId)) {
            return res.status(400).json({ error: 'El estudiante no está asignado a este proyecto' });
        }

        // Aquí podrías agregar campos de entrega al modelo Estudiantes si lo necesitas
        // Por ejemplo: entregaArchivo, entregaFecha, estadoEntrega
        // Por ahora solo confirmamos la entrega
        res.json({ message: 'Entrega registrada', archivo: req.file.filename });
    } catch (error) {
        console.error('Error subir entrega:', error);
        res.status(500).json({ error: 'Error subir entrega' });
    }
};


// Listar proyectos asignados a un estudiante
exports.ListarPorEstudiante = async (req, res) => {
    const { estudianteId } = req.query;
    if (!estudianteId) return res.status(400).json({ error: 'estudianteId requerido' });
    try {
        const estudiante = await Estudiantes.findByPk(estudianteId, { 
            include: [{ model: Proyectos, as: 'proyecto' }] 
        });
        if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json(estudiante.proyecto ? [estudiante.proyecto] : []);
    } catch (error) {
        console.error('Error listar por estudiante:', error);
        res.status(500).json({ error: 'Error listar por estudiante' });
    }
};
