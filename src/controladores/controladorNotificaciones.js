// Controlador para estadísticas de notificaciones por correo
const { obtenerEstadisticas: obtenerStats, limpiarEstadisticas: limpiarStats } = require('../configuraciones/estadisticasCorreo');

exports.obtenerEstadisticas = async (req, res) => {
    try {
        // Validar autenticación
        if (!req.usuario) {
            return res.status(401).json({ mensaje: 'Usuario no autenticado' });
        }

        const { rol, docenteId } = req.usuario;
        
        // Si es ADMIN, mostrar estadísticas globales
        // Si es DOCENTE, mostrar solo sus estadísticas
        const estadisticas = rol === 'ADMIN' 
            ? obtenerStats()
            : obtenerStats(docenteId);
        
        res.json({
            ...estadisticas,
            filtradoPor: rol === 'DOCENTE' ? 'docente' : 'global'
        });
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
        // Validar autenticación
        if (!req.usuario) {
            return res.status(401).json({ mensaje: 'Usuario no autenticado' });
        }

        const { rol, docenteId } = req.usuario;
        
        // Si es ADMIN, limpiar estadísticas globales
        // Si es DOCENTE, limpiar solo sus estadísticas
        if (rol === 'ADMIN') {
            limpiarStats();
        } else {
            limpiarStats(docenteId);
        }
        
        const estadisticas = rol === 'ADMIN' 
            ? obtenerStats()
            : obtenerStats(docenteId);
        
        res.json({ 
            mensaje: 'Estadísticas limpiadas correctamente',
            estadisticas,
            filtradoPor: rol === 'DOCENTE' ? 'docente' : 'global'
        });
    } catch (error) {
        console.error('Error al limpiar estadísticas:', error);
        res.status(500).json({ 
            error: 'Error al limpiar estadísticas',
            mensaje: error.message 
        });
    }
};
