const { validationResult } = require('express-validator');
const Usuarios = require('../modelos/Usuarios');
const argon2 = require('argon2');
const { Op, json } = require('sequelize');
const { get } = require('../rutas/rutasUsuarios');

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

exports.iniciarSesion = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    const { login, contrasena } = req.body;
    const buscarUsuario = await Usuarios.findOne({
        where: {
            [Op.or]: {
                correo: login,
                login: login
            },
            estado: 'AC'
        }
    });
    if (!buscarUsuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    else {
        if (argon2.verify(contrasena, buscarUsuario.contrasena)) {
            const token = getToken({ id: buscarUsuario.id });
            const data = {
                token: token,
                usuario: buscarUsuario
            };
            return res.status(200).json(data);
        }
        else return res.status(400).json({ errores: 'Error en los datos enviados' });
    }
    res.json({ mensaje: 'Se envió el correo electrónico' });
};