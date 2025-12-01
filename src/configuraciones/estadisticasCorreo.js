// Sistema de estadísticas para correos electrónicos (por docente)
let estadisticasGlobales = {
    enviados: 0,
    fallidos: 0,
    enCola: 0,
    ultimoEnvio: null,
    errores: []
};

// Estadísticas por docente (Map: docenteId -> estadísticas)
const estadisticasPorDocente = new Map();

// Inicializar estadísticas para un docente si no existe
const inicializarDocente = (docenteId) => {
    if (!estadisticasPorDocente.has(docenteId)) {
        estadisticasPorDocente.set(docenteId, {
            enviados: 0,
            fallidos: 0,
            enCola: 0,
            ultimoEnvio: null,
            errores: []
        });
    }
};

// Registrar un correo enviado exitosamente
const registrarEnviado = (docenteId = null) => {
    estadisticasGlobales.enviados++;
    estadisticasGlobales.ultimoEnvio = new Date().toISOString();
    
    if (docenteId) {
        inicializarDocente(docenteId);
        const stats = estadisticasPorDocente.get(docenteId);
        stats.enviados++;
        stats.ultimoEnvio = new Date().toISOString();
    }
};

// Registrar un correo fallido
const registrarFallido = (error, docenteId = null) => {
    const errorObj = {
        mensaje: error.message || 'Error desconocido',
        fecha: new Date().toISOString()
    };
    
    estadisticasGlobales.fallidos++;
    estadisticasGlobales.errores.push(errorObj);
    
    // Mantener solo los últimos 10 errores globales
    if (estadisticasGlobales.errores.length > 10) {
        estadisticasGlobales.errores = estadisticasGlobales.errores.slice(-10);
    }
    
    if (docenteId) {
        inicializarDocente(docenteId);
        const stats = estadisticasPorDocente.get(docenteId);
        stats.fallidos++;
        stats.errores.push(errorObj);
        
        // Mantener solo los últimos 10 errores por docente
        if (stats.errores.length > 10) {
            stats.errores = stats.errores.slice(-10);
        }
    }
};

// Obtener estadísticas (globales o por docente)
const obtenerEstadisticas = (docenteId = null) => {
    const stats = docenteId && estadisticasPorDocente.has(docenteId) 
        ? estadisticasPorDocente.get(docenteId)
        : estadisticasGlobales;
    
    const total = stats.enviados + stats.fallidos;
    const porcentajeExito = total > 0 
        ? Math.round((stats.enviados / total) * 100) 
        : 0;
    
    return {
        ...stats,
        porcentajeExito
    };
};

// Limpiar estadísticas (globales o por docente)
const limpiarEstadisticas = (docenteId = null) => {
    if (docenteId) {
        estadisticasPorDocente.set(docenteId, {
            enviados: 0,
            fallidos: 0,
            enCola: 0,
            ultimoEnvio: null,
            errores: []
        });
    } else {
        estadisticasGlobales = {
            enviados: 0,
            fallidos: 0,
            enCola: 0,
            ultimoEnvio: null,
            errores: []
        };
        estadisticasPorDocente.clear();
    }
};

module.exports = {
    registrarEnviado,
    registrarFallido,
    obtenerEstadisticas,
    limpiarEstadisticas
};
