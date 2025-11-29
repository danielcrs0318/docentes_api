const colaCorreos = require('../configuraciones/colaCorreos');

// Obtener estadísticas de correos
exports.obtenerEstadisticas = async (req, res) => {
    try {
        const estadisticas = colaCorreos.obtenerEstadisticas();
        res.json(estadisticas);
    } catch (error) {
        console.error('Error al obtener estadísticas de correos:', error);
        res.status(500).json({ 
            mensaje: 'Error al obtener estadísticas', 
            error: error.message 
        });
    }
};

// Limpiar estadísticas
exports.limpiarEstadisticas = async (req, res) => {
    try {
        colaCorreos.limpiarEstadisticas();
        res.json({ 
            mensaje: 'Estadísticas limpiadas correctamente',
            nuevasEstadisticas: colaCorreos.obtenerEstadisticas()
        });
    } catch (error) {
        console.error('Error al limpiar estadísticas:', error);
        res.status(500).json({ 
            mensaje: 'Error al limpiar estadísticas', 
            error: error.message 
        });
    }
};

// Obtener cola actual
exports.obtenerCola = async (req, res) => {
    try {
        const estadisticas = colaCorreos.obtenerEstadisticas();
        res.json({
            enCola: estadisticas.enCola,
            procesando: estadisticas.procesando,
            mensaje: estadisticas.enCola > 0 
                ? `Hay ${estadisticas.enCola} correo(s) en cola` 
                : 'No hay correos en cola'
        });
    } catch (error) {
        console.error('Error al obtener cola:', error);
        res.status(500).json({ 
            mensaje: 'Error al obtener cola', 
            error: error.message 
        });
    }
};
