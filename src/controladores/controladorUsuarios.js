const { validationResult } = require('express-validator');
const Usuarios = require('../modelos/Usuarios');
const UsuarioImagen = require('../modelos/UsuarioImagenes');
const Docente = require('../modelos/Docentes');
const argon2 = require('argon2');
const { Op } = require('sequelize');
const { enviarCorreo } = require('../configuraciones/correo');
const jwt = require('jsonwebtoken');
const { uploadImagenUsuario } = require('../configuraciones/archivos');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    // Validar campos enviados
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { docenteId, contrasena } = req.body;

        // Validar si el docente existe antes de crear el usuario
        const docenteExiste = await Docente.findByPk(docenteId);
        if (!docenteExiste) {
            return res.status(404).json({
                error: `No existe ningún docente con el ID ${docenteId}`
            });
        }

        // Encriptar contraseña
        const hash = await argon2.hash(contrasena);

        // Crear el nuevo usuario
        const nuevo = await Usuarios.create({
            ...req.body,
            contrasena: hash
        });

        return res.status(201).json({
            mensaje: 'Usuario creado correctamente',
            usuario: nuevo
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al insertar usuario' });
    }
};

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
        return res.status(500).json({ error: 'Error en el servidor', detalles: error.message });
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

exports.validarImagenUsuario = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors.array());
    }
    uploadImagenUsuario(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            res.status(400).json({ msj: "Hay errores al cargar la imagen", error: err });
        }
        else if (err) {
            res.status(400).json({ msj: "Hay errores al cargar la imagen", error: err });
        }
        else {
            next();
        }
    });
};


exports.guardarImagenUsuario = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
        }

        const imagen = req.file.filename;
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Se requiere el ID del usuario' });
        }

        // Verificar que el usuario existe
        const usuario = await Usuarios.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que el archivo existe
        const rutaCompleta = path.join(__dirname, '../../public/img/usuarios', imagen);
        if (!fs.existsSync(rutaCompleta)) {
            return res.status(400).json({ error: 'No se pudo almacenar la imagen' });
        }

        // Guardar la referencia en la base de datos
        const imagenGuardada = await UsuarioImagen.create({
            imagen: imagen,
            usuarioId: id,
            estado: 'AC'
        });

        res.status(201).json({
            mensaje: 'Imagen guardada correctamente',
            datos: {
                id: imagenGuardada.id,
                imagen: imagenGuardada.imagen,
                ruta: `/img/usuarios/${imagen}`,
                usuarioId: imagenGuardada.usuarioId
            }
        });

    } catch (error) {
        console.error('Error al guardar imagen:', error);
        res.status(500).json({
            error: 'Error al guardar la imagen',
            detalles: error.message
        });
    }
};

exports.editarImagenUsuario = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
        }

        const nuevaImagen = req.file.filename;
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Se requiere el ID de la imagen' });
        }

        // Buscar la imagen existente
        const imagenExistente = await UsuarioImagen.findByPk(id);
        if (!imagenExistente) {
            // Si la nueva imagen fue subida, eliminarla
            const rutaNuevaImagen = path.join(__dirname, '../../public/img/usuarios', nuevaImagen);
            if (fs.existsSync(rutaNuevaImagen)) {
                fs.unlinkSync(rutaNuevaImagen);
            }
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Eliminar la imagen antigua del servidor
        const rutaImagenAntigua = path.join(__dirname, '../../public/img/usuarios', imagenExistente.imagen);
        if (fs.existsSync(rutaImagenAntigua)) {
            fs.unlinkSync(rutaImagenAntigua);
        }

        // Actualizar la referencia en la base de datos
        imagenExistente.imagen = nuevaImagen;
        await imagenExistente.save();

        res.status(200).json({
            mensaje: 'Imagen actualizada correctamente',
            datos: {
                id: imagenExistente.id,
                imagen: imagenExistente.imagen,
                ruta: `/img/usuarios/${nuevaImagen}`,
                usuarioId: imagenExistente.usuarioId
            }
        });

    } catch (error) {
        console.error('Error al editar imagen:', error);
        res.status(500).json({
            error: 'Error al editar la imagen',
            detalles: error.message
        });
    }
};

exports.eliminarImagenUsuario = async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Se requiere el ID de la imagen' });
        }

        // Buscar la imagen
        const imagen = await UsuarioImagen.findByPk(id);
        if (!imagen) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Eliminar el archivo físico del servidor
        const rutaImagen = path.join(__dirname, '../../public/img/usuarios', imagen.imagen);
        if (fs.existsSync(rutaImagen)) {
            fs.unlinkSync(rutaImagen);
        }

        // Eliminar el registro de la base de datos
        await imagen.destroy();

        res.status(200).json({
            mensaje: 'Imagen eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({
            error: 'Error al eliminar la imagen',
            detalles: error.message
        });
    }
};

exports.listarImagenesUsuario = async (req, res) => {
    try {
        const { usuarioId } = req.query;

        if (!usuarioId) {
            return res.status(400).json({ error: 'Se requiere el ID del usuario' });
        }

        // Verificar que el usuario existe
        const usuario = await Usuarios.findByPk(usuarioId);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Buscar todas las imágenes del usuario
        const imagenes = await UsuarioImagen.findAll({
            where: { usuarioId },
            attributes: ['id', 'imagen', 'estado', 'createdAt', 'updatedAt']
        });

        res.status(200).json({
            mensaje: 'Imágenes recuperadas correctamente',
            total: imagenes.length,
            datos: imagenes.map(img => ({
                id: img.id,
                imagen: img.imagen,
                ruta: `/img/usuarios/${img.imagen}`,
                estado: img.estado,
                createdAt: img.createdAt,
                updatedAt: img.updatedAt
            }))
        });

    } catch (error) {
        console.error('Error al listar imágenes:', error);
        res.status(500).json({
            error: 'Error al listar las imágenes',
            detalles: error.message
        });
    }
};