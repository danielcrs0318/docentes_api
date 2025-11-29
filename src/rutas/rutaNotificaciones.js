const express = require('express');
const router = express.Router();
const controladorNotificaciones = require('../controladores/controladorNotificaciones');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');

/**
 * @swagger
 * /api/notificaciones/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de correos enviados
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas correctamente
 */
router.get('/estadisticas', validarToken, verificarRol(['ADMIN', 'DOCENTE']), controladorNotificaciones.obtenerEstadisticas);

/**
 * @swagger
 * /api/notificaciones/cola:
 *   get:
 *     summary: Obtener estado de la cola de correos
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de la cola obtenido correctamente
 */
router.get('/cola', validarToken, verificarRol(['ADMIN', 'DOCENTE']), controladorNotificaciones.obtenerCola);

/**
 * @swagger
 * /api/notificaciones/limpiar:
 *   post:
 *     summary: Limpiar estadísticas de notificaciones
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas limpiadas correctamente
 */
router.post('/limpiar', validarToken, verificarRol(['ADMIN']), controladorNotificaciones.limpiarEstadisticas);

module.exports = router;
