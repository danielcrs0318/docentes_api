const crypto = require('crypto');

/**
 * Genera un nombre de usuario (login) a partir del nombre y correo
 * @param {string} nombre - Nombre completo
 * @param {string} correo - Correo electrónico
 * @returns {string} - Nombre de usuario generado
 */
const generarLogin = (nombre, correo) => {
    // Opción 1: Extraer la parte antes del @ del correo
    const partesCorreo = correo.split('@');
    const baseCorreo = partesCorreo[0].toLowerCase();
    
    // Opción 2: Generar desde el nombre (primera letra + apellido)
    const palabras = nombre.trim().split(' ').filter(p => p.length > 0);
    let baseNombre = '';
    
    if (palabras.length >= 2) {
        // Primera letra del primer nombre + apellido completo
        const primerNombre = palabras[0].toLowerCase();
        const apellido = palabras[palabras.length - 1].toLowerCase();
        baseNombre = primerNombre.charAt(0) + apellido;
    } else {
        // Solo un nombre, usar completo
        baseNombre = palabras[0].toLowerCase();
    }
    
    // Limpiar caracteres especiales y acentos
    baseNombre = baseNombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    
    // Retornar el login basado en nombre (más corto y profesional)
    return baseNombre;
};

/**
 * Genera una contraseña aleatoria segura con caracteres especiales
 * Formato: Mayúsculas + minúsculas + números + caracteres especiales
 * Ejemplo: Ab@12#xY9
 * @param {number} longitud - Longitud de la contraseña (por defecto 10)
 * @returns {string} - Contraseña generada
 */
const generarContrasenaAleatoria = (longitud = 10) => {
    const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const especiales = '@#$%&*!';
    
    const todos = mayusculas + minusculas + numeros + especiales;
    
    let contrasena = '';
    
    // Asegurar al menos un carácter de cada tipo
    contrasena += mayusculas[Math.floor(Math.random() * mayusculas.length)];
    contrasena += minusculas[Math.floor(Math.random() * minusculas.length)];
    contrasena += numeros[Math.floor(Math.random() * numeros.length)];
    contrasena += especiales[Math.floor(Math.random() * especiales.length)];
    
    // Completar el resto con caracteres aleatorios
    for (let i = contrasena.length; i < longitud; i++) {
        contrasena += todos[Math.floor(Math.random() * todos.length)];
    }
    
    // Mezclar la contraseña
    return contrasena.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Verifica si un login ya existe en la base de datos y genera uno único
 * @param {string} loginBase - Login base generado
 * @param {Model} UsuariosModel - Modelo de Usuarios de Sequelize
 * @returns {Promise<string>} - Login único
 */
const generarLoginUnico = async (loginBase, UsuariosModel) => {
    let login = loginBase;
    let contador = 1;
    
    while (await UsuariosModel.findOne({ where: { login } })) {
        login = `${loginBase}${contador}`;
        contador++;
    }
    
    return login;
};

module.exports = {
    generarLogin,
    generarContrasenaAleatoria,
    generarLoginUnico
};
