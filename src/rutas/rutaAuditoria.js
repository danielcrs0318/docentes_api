const { Router } = require('express');
const { query, body } = require('express-validator');
const controladorAuditoria = require('../controladores/controladorAuditoria');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');

const rutas = Router();

/**
 * @swagger
 * tags:
 *   name: Auditoría
 *   description: Endpoints para gestión de logs de auditoría
 */

/**
 * @swagger
 * /auditoria/logs:
 *   get:
 *     summary: Listar logs de auditoría (Solo ADMIN)
 *     tags: [Auditoría]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: usuarioId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: accion
 *         schema:
 *           type: string
 *       - in: query
 *         name: entidad
 *         schema:
 *           type: string
 *       - in: query
 *         name: resultado
 *         schema:
 *           type: string
 *           enum: [EXITOSO, FALLIDO]
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de logs de auditoría
 *       403:
 *         description: No autorizado
 */
rutas.get('/logs', [
    validarToken,
    verificarRol(['ADMIN'])
], controladorAuditoria.Listar);

/**
 * @swagger
 * /auditoria/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de auditoría (Solo ADMIN)
 *     tags: [Auditoría]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Estadísticas de auditoría
 */
rutas.get('/estadisticas', [
    validarToken,
    verificarRol(['ADMIN'])
], controladorAuditoria.Estadisticas);

/**
 * @swagger
 * /auditoria/logs/{id}:
 *   get:
 *     summary: Obtener detalle de un log (Solo ADMIN)
 *     tags: [Auditoría]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del log
 *       404:
 *         description: Log no encontrado
 */
rutas.get('/logs/:id', [
    validarToken,
    verificarRol(['ADMIN'])
], controladorAuditoria.ObtenerDetalle);

/**
 * @swagger
 * /auditoria/limpiar:
 *   post:
 *     summary: Limpiar logs antiguos (Solo ADMIN)
 *     tags: [Auditoría]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diasAntiguedad:
 *                 type: integer
 *                 default: 90
 *     responses:
 *       200:
 *         description: Logs eliminados exitosamente
 */
rutas.post('/limpiar', [
    validarToken,
    verificarRol(['ADMIN']),
    body('diasAntiguedad').optional().isInt({ min: 1 })
], controladorAuditoria.LimpiarLogsAntiguos);

module.exports = rutas;
