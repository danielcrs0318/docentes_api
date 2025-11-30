const Secciones = require('../modelos/Secciones');
const Aulas = require('../modelos/Aulas');
const Clases = require('../modelos/Clases');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Controlador para obtener todas las secciones
exports.ListarSecciones = async (req, res) => {
    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { rol, docenteId } = req.usuario;
    const where = {};

    // Filtrar por docente si el rol es DOCENTE
    if (rol === 'DOCENTE') {
        where['$clase.docenteId$'] = docenteId;
    }

    try {
        const secciones = await Secciones.findAll({
            where,
            attributes: ['id', 'nombre', 'claseId', 'aulaId'],
            include: [
                {
                    model: Aulas,
                    as: 'aula',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Clases,
                    as: 'clase',
                    attributes: ['id', 'nombre', 'docenteId'],
                    required: rol === 'DOCENTE' // INNER JOIN para DOCENTE
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

    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { nombre, aulaId, claseId } = req.body;

    try {
        // Si es docente, verificar que la clase le pertenezca
        if (claseId) {
            const clase = await Clases.findByPk(claseId);
            if (!clase) {
                return res.status(404).json({ error: 'Clase no encontrada' });
            }

            const { rol, docenteId } = req.usuario;
            if (rol === 'DOCENTE' && clase?.docenteId !== docenteId) {
                return res.status(403).json({ error: 'No tiene permiso para crear secciones en esta clase' });
            }
        }

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

    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { nombre, aulaId, claseId } = req.body;
    const { id } = req.query;

    try {
        const seccion = await Secciones.findByPk(id, {
            include: [{
                model: Clases,
                as: 'clase',
                attributes: ['id', 'nombre', 'docenteId']
            }]
        });
        if (!seccion) {
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        // Si es docente, verificar que la clase le pertenezca
        const { rol, docenteId } = req.usuario;
        if (rol === 'DOCENTE' && seccion.clase?.docenteId !== docenteId) {
            return res.status(403).json({ error: 'No tiene permiso para actualizar esta sección' });
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

    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const seccion = await Secciones.findByPk(id, {
            include: [{
                model: Clases,
                as: 'clase',
                attributes: ['id', 'nombre', 'docenteId']
            }]
        });
        if (!seccion) {
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        // Si es docente, verificar que la clase le pertenezca
        const { rol, docenteId } = req.usuario;
        if (rol === 'DOCENTE' && seccion.clase?.docenteId !== docenteId) {
            return res.status(403).json({ error: 'No tiene permiso para eliminar esta sección' });
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

// FILTRO 1: Filtrar secciones por nombre (búsqueda parcial)
exports.filtrarSeccionesPorNombre = async (req, res) => {
    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

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
        const { rol, docenteId } = req.usuario;

        const where = {
            nombre: {
                [Op.like]: `%${nombre.trim()}%`
            }
        };

        // Filtrar por docente si el rol es DOCENTE
        if (rol === 'DOCENTE') {
            where['$clase.docenteId$'] = docenteId;
        }

        const secciones = await Secciones.findAll({
            where,
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
                    attributes: ['id', 'nombre', 'docenteId'],
                    required: rol === 'DOCENTE'
                }
            ],
            order: [['nombre', 'ASC']]
        });

        if (secciones.length === 0) {
            return res.status(200).json({ 
                msj: 'No se encontraron secciones con ese nombre', 
                data: [],
                count: 0
            });
        }

        res.status(200).json({
            msj: `Se encontraron ${secciones.length} sección(es)`,
            data: secciones,
            count: secciones.length
        });
    } catch (error) {
        console.error('Error al filtrar secciones por nombre:', error);
        res.status(500).json({ error: 'Error al filtrar secciones por nombre' });
    }
};

// FILTRO 2: Filtrar secciones por aula y clase
exports.filtrarSeccionesPorAulaYClase = async (req, res) => {
    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const errores = validationResult(req);

        if (!errores.isEmpty()) {
            const data = errores.array().map(i => ({
                atributo: i.path,
                msg: i.msg
            }));
            return res.status(400).json({ msj: 'Errores de validación', data });
        }

        const { aulaId, claseId } = req.query;
        const { rol, docenteId } = req.usuario;

        // Validar que al menos un parámetro esté presente
        if (!aulaId && !claseId) {
            return res.status(400).json({ 
                msj: 'Se requiere al menos uno de los parámetros: aulaId o claseId', 
                data: [] 
            });
        }

        let whereClause = {};

        // Filtrar por docente si el rol es DOCENTE
        if (rol === 'DOCENTE') {
            whereClause['$clase.docenteId$'] = docenteId;
        }

        // Construir condiciones dinámicamente
        if (aulaId) {
            const aulaIdNum = parseInt(aulaId);
            if (isNaN(aulaIdNum) || aulaIdNum <= 0) {
                return res.status(400).json({ 
                    msj: 'El parámetro aulaId debe ser un número válido mayor a 0', 
                    data: [] 
                });
            }
            whereClause.aulaId = aulaIdNum;
        }

        if (claseId) {
            const claseIdNum = parseInt(claseId);
            if (isNaN(claseIdNum) || claseIdNum <= 0) {
                return res.status(400).json({ 
                    msj: 'El parámetro claseId debe ser un número válido mayor a 0', 
                    data: [] 
                });
            }
            whereClause.claseId = claseIdNum;
        }

        const secciones = await Secciones.findAll({
            where: whereClause,
            attributes: ['id', 'nombre', 'aulaId', 'claseId'],
            include: [
                {
                    model: Aulas,
                    as: 'aula',
                    attributes: ['id', 'nombre', 'capacidad']
                },
                {
                    model: Clases,
                    as: 'clase',
                    attributes: ['id', 'nombre', 'codigo', 'creditos', 'docenteId'],
                    required: rol === 'DOCENTE',
                    include: [
                        {
                            model: require('./../modelos/Docentes'),
                            as: 'docente',
                            attributes: ['id', 'nombre', 'correo']
                        }
                    ]
                }
            ],
            order: [
                ['aulaId', 'ASC'],
                ['claseId', 'ASC'],
                ['nombre', 'ASC']
            ]
        });

        if (secciones.length === 0) {
            return res.status(200).json({ 
                msj: 'No se encontraron secciones con los criterios especificados', 
                data: [],
                count: 0
            });
        }

        res.status(200).json({
            msj: `Se encontraron ${secciones.length} sección(es)`,
            data: secciones,
            count: secciones.length
        });
    } catch (error) {
        console.error('Error al filtrar secciones por aula y clase:', error);
        res.status(500).json({ error: 'Error al filtrar secciones por aula y clase' });
    }
};