// Controlador para estadísticas de notificaciones por correo
const { obtenerEstadisticas: obtenerStats, limpiarEstadisticas: limpiarStats } = require('../configuraciones/estadisticasCorreo');

exports.obtenerEstadisticas = async (req, res) => {
    try {
        const estadisticas = obtenerStats();
        res.json(estadisticas);
    } catch (error) {
        console.error('Error al obtener estadísticas de notificaciones:', error);
        res.status(500).json({ 
            error: 'Error al obtener estadísticas de notificaciones',
            mensaje: error.message 
        });
    }
};

exports.limpiarEstadisticas = async (req, res) => {
    try {
        limpiarStats();
        const estadisticas = obtenerStats();
        res.json({ 
            mensaje: 'Estadísticas limpiadas correctamente',
            estadisticas
        });
    } catch (error) {
        console.error('Error al limpiar estadísticas:', error);
        res.status(500).json({ 
            error: 'Error al limpiar estadísticas',
            mensaje: error.message 
        });
    }
};
