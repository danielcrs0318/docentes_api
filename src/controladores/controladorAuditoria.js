const LogsAuditoria = require('../modelos/LogsAuditoria');
const Usuarios = require('../modelos/Usuarios');
const Roles = require('../modelos/Roles');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Registrar un log de auditoría
 * @param {Object} params - Parámetros del log
 */
const registrarLog = async (params) => {
    try {
        const {
            usuarioId,
            accion,
            entidad = null,
            entidadId = null,
            descripcion = null,
            ip = null,
            userAgent = null,
            datosAnteriores = null,
            datosNuevos = null,
            resultado = 'EXITOSO',
            mensajeError = null
        } = params;

        await LogsAuditoria.create({
            usuarioId,
            accion,
            entidad,
            entidadId,
            descripcion,
            ip,
            userAgent,
            datosAnteriores,
            datosNuevos,
            resultado,
            mensajeError
        });
    } catch (error) {
        console.error('Error al registrar log de auditoría:', error);
        // No lanzamos error para no interrumpir el flujo normal
    }
};

/**
 * Listar logs de auditoría con filtros
 */
exports.Listar = async (req, res) => {
    try {
        const {
            usuarioId,
            accion,
            entidad,
            resultado,
            fechaInicio,
            fechaFin,
            page = 1,
            limit = 50
        } = req.query;

        const where = {};

        if (usuarioId) where.usuarioId = usuarioId;
        if (accion) where.accion = accion;
        if (entidad) where.entidad = entidad;
        if (resultado) where.resultado = resultado;

        if (fechaInicio && fechaFin) {
            where.createdAt = {
                [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
            };
        } else if (fechaInicio) {
            where.createdAt = {
                [Op.gte]: new Date(fechaInicio)
            };
        } else if (fechaFin) {
            where.createdAt = {
                [Op.lte]: new Date(fechaFin)
            };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await LogsAuditoria.findAndCountAll({
            where,
            include: [{
                model: Usuarios,
                as: 'usuario',
                attributes: ['id', 'login', 'correo'],
                include: [{
                    model: Roles,
                    as: 'rol',
                    attributes: ['id', 'nombre']
                }]
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        return res.status(200).json({
            logs: rows,
            total: count,
            totalPages: Math.ceil(count / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error al listar logs:', error);
        return res.status(500).json({ error: 'Error al obtener logs de auditoría' });
    }
};

/**
 * Obtener estadísticas de auditoría
 */
exports.Estadisticas = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        const where = {};
        if (fechaInicio && fechaFin) {
            where.createdAt = {
                [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
            };
        }

        // Total de logs
        const totalLogs = await LogsAuditoria.count({ where });

        // Logs por acción
        const logsPorAccion = await LogsAuditoria.findAll({
            where,
            attributes: [
                'accion',
                [LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('id')), 'cantidad']
            ],
            group: ['accion'],
            order: [[LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('id')), 'DESC']]
        });

        // Logs por entidad
        const logsPorEntidad = await LogsAuditoria.findAll({
            where: { ...where, entidad: { [Op.not]: null } },
            attributes: [
                'entidad',
                [LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('id')), 'cantidad']
            ],
            group: ['entidad'],
            order: [[LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('id')), 'DESC']]
        });

        // Logs por resultado
        const logsPorResultado = await LogsAuditoria.findAll({
            where,
            attributes: [
                'resultado',
                [LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('id')), 'cantidad']
            ],
            group: ['resultado']
        });

        // Usuarios más activos
        const usuariosMasActivos = await LogsAuditoria.findAll({
            where,
            attributes: [
                'usuarioId',
                [LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('LogsAuditoria.id')), 'cantidad']
            ],
            include: [{
                model: Usuarios,
                as: 'usuario',
                attributes: ['login', 'correo']
            }],
            group: ['usuarioId'],
            order: [[LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('LogsAuditoria.id')), 'DESC']],
            limit: 10
        });

        // Actividad por día (últimos 30 días)
        const actividadPorDia = await LogsAuditoria.findAll({
            where: {
                ...where,
                createdAt: {
                    [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            attributes: [
                [LogsAuditoria.sequelize.fn('DATE', LogsAuditoria.sequelize.col('createdAt')), 'fecha'],
                [LogsAuditoria.sequelize.fn('COUNT', LogsAuditoria.sequelize.col('id')), 'cantidad']
            ],
            group: [LogsAuditoria.sequelize.fn('DATE', LogsAuditoria.sequelize.col('createdAt'))],
            order: [[LogsAuditoria.sequelize.fn('DATE', LogsAuditoria.sequelize.col('createdAt')), 'ASC']]
        });

        return res.status(200).json({
            totalLogs,
            logsPorAccion,
            logsPorEntidad,
            logsPorResultado,
            usuariosMasActivos,
            actividadPorDia
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({ error: 'Error al obtener estadísticas de auditoría' });
    }
};

/**
 * Obtener detalle de un log
 */
exports.ObtenerDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        const log = await LogsAuditoria.findByPk(id, {
            include: [{
                model: Usuarios,
                as: 'usuario',
                attributes: ['id', 'login', 'correo'],
                include: [{
                    model: Roles,
                    as: 'rol',
                    attributes: ['id', 'nombre']
                }]
            }]
        });

        if (!log) {
            return res.status(404).json({ error: 'Log no encontrado' });
        }

        return res.status(200).json(log);
    } catch (error) {
        console.error('Error al obtener detalle del log:', error);
        return res.status(500).json({ error: 'Error al obtener detalle del log' });
    }
};

/**
 * Limpiar logs antiguos (solo ADMIN)
 */
exports.LimpiarLogsAntiguos = async (req, res) => {
    try {
        const { diasAntiguedad = 90 } = req.body;

        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - parseInt(diasAntiguedad));

        const eliminados = await LogsAuditoria.destroy({
            where: {
                createdAt: {
                    [Op.lt]: fechaLimite
                }
            }
        });

        // Registrar la limpieza
        await registrarLog({
            usuarioId: req.usuario.id,
            accion: 'LIMPIAR_LOGS',
            descripcion: `Se eliminaron ${eliminados} logs con más de ${diasAntiguedad} días de antigüedad`,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.status(200).json({
            mensaje: `Se eliminaron ${eliminados} registros`,
            eliminados
        });
    } catch (error) {
        console.error('Error al limpiar logs:', error);
        return res.status(500).json({ error: 'Error al limpiar logs antiguos' });
    }
};

// Exportar función registrarLog para uso en otros controladores
module.exports.registrarLog = registrarLog;
