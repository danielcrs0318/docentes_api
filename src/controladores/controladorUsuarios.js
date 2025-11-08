const { validationResult } = require('express-validator');
const Usuarios = require('../modelos/Usuarios');
const argon2 = require('argon2');
const { Op } = require('sequelize');
const { enviarCorreo } = require('../configuraciones/correo');
const jwt = require('jsonwebtoken');

exports.Listar = async (req, res) => {
    try {
        const usuarios = await Usuarios.findAll();
        return res.status(200).json(usuarios);
    } catch (error) {
        return res.status(500).json({ error: 'Error al listar usuarios' });
    }
};

exports.buscarPorId = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    const usuario = await Usuarios.findByPk(req.query.id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
}

exports.insertar = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    try {
        const hash = await argon2.hash(req.body.contrasena);
        const nuevo = await Usuarios.create({
            ...req.body,
            contrasena: hash
        });
        return res.status(201).json(nuevo);
    } catch (error) {
        return res.status(500).json({ error: 'Error al insertar usuario' });
    }
}

exports.actualizar = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    try {
        const unico = await Usuarios.findOne({
            where: {
                [Op.not]: { id: req.query.id },
                [Op.or]: [
                    { login: req.body.login },
                    { correo: req.body.correo },
                ]
            }
        });
        if (unico) return res.status(400).json({ mensaje: 'El login o correo ya existe' });

        const usuario = await Usuarios.findByPk(req.query.id);
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        if ('contrasena' in req.body) {
            delete req.body.contrasena;
        }

        await usuario.update(req.body);
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar usuario' });
    }
};

exports.Eliminar = async (req, res) => {
    const errores = validationResult(req).errors;
    if (errores.length > 0) {
        return res.status(400).json({ errores });
    }

    try {
        const usuario = await Usuarios.findByPk(req.query.id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        await usuario.destroy();
        return res.status(200).json({ message: 'Usuario eliminado' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al eliminar usuario' });
    }
};

const getToken = (payload, options = {}) => {
    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

const generarPin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.iniciarSesion = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    const { login, contrasena } = req.body;
    try {
        const usuario = await Usuarios.findOne({
            where: {
                [Op.or]: {
                    correo: login,
                    login: login
                }
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (usuario.estado === 'BL') {
            return res.status(403).json({ error: 'Usuario bloqueado. Contacte al administrador.' });
        }

        if (usuario.estado === 'IN') {
            return res.status(403).json({ error: 'Usuario inactivo' });
        }

        const esValida = await argon2.verify(usuario.contrasena, contrasena);

        if (!esValida) {
            usuario.intentos = (usuario.intentos || 0) + 1;
            
            if (usuario.intentos >= 3) {
                usuario.estado = 'BL';
                await usuario.save();
                return res.status(403).json({ error: 'Usuario bloqueado por múltiples intentos fallidos' });
            }
            
            await usuario.save();
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }

        usuario.intentos = 0;
        await usuario.save();

        const token = getToken({ id: usuario.id }, { expiresIn: '1d' });
        return res.status(200).json({
            token,
            usuario: {
                id: usuario.id,
                login: usuario.login,
                correo: usuario.correo,
                estado: usuario.estado
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error en el servidor' , detalles: error.message });
    }
};

exports.solicitarRestablecimiento = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { correo } = req.body;
        const usuario = await Usuarios.findOne({ where: { correo } });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (usuario.estado === 'BL') {
            return res.status(403).json({ error: 'Usuario bloqueado. Contacte al administrador.' });
        }

        const pin = generarPin();
        usuario.pin = pin;
        usuario.pinExpiracion = new Date(Date.now() + 15 * 60000); // 15 minutos
        await usuario.save();

        const contenidoCorreo = `
            <h1>Restablecimiento de Contraseña</h1>
            <p>Has solicitado restablecer tu contraseña. Usa el siguiente PIN para continuar:</p>
            <h2>${pin}</h2>
            <p>Este PIN expirará en 15 minutos.</p>
            <p>Si no solicitaste este restablecimiento, ignora este correo.</p>
        `;

        const enviado = await enviarCorreo(
            usuario.correo,
            'Restablecimiento de Contraseña',
            contenidoCorreo
        );

        if (!enviado) {
            return res.status(500).json({ error: 'Error al enviar el correo', detalles: error.message });
        }

        res.status(200).json({ mensaje: 'PIN enviado al correo' });
    } catch (error) {
        console.error('Error detallado:', error);
        res.status(500).json({ 
            error: 'Error en el servidor',
            detalles: error.message,
            stack: error.stack
        });
    }
};

exports.validarPin = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { correo, pin } = req.body;
        const usuario = await Usuarios.findOne({ where: { correo } });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que exista un PIN
        if (!usuario.pin || !usuario.pinExpiracion) {
            return res.status(400).json({ error: 'No hay solicitud de restablecimiento activa' });
        }

        // Verificar que el PIN coincida
        if (usuario.pin !== pin) {
            return res.status(400).json({ error: 'PIN inválido' });
        }

        // Verificar la expiración del PIN
        const ahora = new Date();
        const expiracion = new Date(usuario.pinExpiracion);
        if (ahora >= expiracion) {
            // Limpiar PIN expirado
            usuario.pin = null;
            usuario.pinExpiracion = null;
            await usuario.save();
            return res.status(400).json({ error: 'PIN expirado. Solicita uno nuevo.' });
        }

        // Generar token especial para restablecimiento
        const token = getToken({ 
            id: usuario.id, 
            pin: true
        }, {
            expiresIn: '15m' // El token expira en 15 minutos, igual que el PIN
        });
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

exports.restablecerContrasena = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { contrasena } = req.body;
        const usuario = await Usuarios.findByPk(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const hash = await argon2.hash(contrasena);
        usuario.contrasena = hash;
        usuario.pin = null;
        usuario.pinExpiracion = null;
        usuario.intentos = 0;
        usuario.estado = 'AC';
        
        await usuario.save();

        res.status(200).json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};