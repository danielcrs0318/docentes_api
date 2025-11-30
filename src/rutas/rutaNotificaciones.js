const express = require('express');
const router = express.Router();
const controladorNotificaciones = require('../controladores/controladorNotificaciones');
const { validarToken } = require('../configuraciones/passport');

// Rutas para notificaciones
router.get('/estadisticas', validarToken, controladorNotificaciones.obtenerEstadisticas);
router.post('/limpiar', validarToken, controladorNotificaciones.limpiarEstadisticas);

module.exports = router;
