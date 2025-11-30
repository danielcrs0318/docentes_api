// Sistema de estadísticas para correos electrónicos
let estadisticas = {
    enviados: 0,
    fallidos: 0,
    enCola: 0,
    ultimoEnvio: null,
    errores: []
};

// Registrar un correo enviado exitosamente
const registrarEnviado = () => {
    estadisticas.enviados++;
    estadisticas.ultimoEnvio = new Date().toISOString();
};

// Registrar un correo fallido
const registrarFallido = (error) => {
    estadisticas.fallidos++;
    estadisticas.errores.push({
        mensaje: error.message || 'Error desconocido',
        fecha: new Date().toISOString()
    });
    
    // Mantener solo los últimos 10 errores
    if (estadisticas.errores.length > 10) {
        estadisticas.errores = estadisticas.errores.slice(-10);
    }
};

// Obtener estadísticas actuales
const obtenerEstadisticas = () => {
    const total = estadisticas.enviados + estadisticas.fallidos;
    const porcentajeExito = total > 0 
        ? Math.round((estadisticas.enviados / total) * 100) 
        : 0;
    
    return {
        ...estadisticas,
        porcentajeExito
    };
};

// Limpiar estadísticas
const limpiarEstadisticas = () => {
    estadisticas = {
        enviados: 0,
        fallidos: 0,
        enCola: 0,
        ultimoEnvio: null,
        errores: []
    };
};

module.exports = {
    registrarEnviado,
    registrarFallido,
    obtenerEstadisticas,
    limpiarEstadisticas
};
