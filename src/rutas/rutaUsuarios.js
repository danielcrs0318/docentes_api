const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorUsuarios = require('../controladores/controladorUsuarios');
const rutas = Router();
const Usuarios = require('../modelos/Usuarios');
const { validarToken } = require('../configuraciones/passport');

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       required:
 *         - login
 *         - correo
 *         - contrasena
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del usuario
 *         login:
 *           type: string
 *           description: Nombre de usuario para iniciar sesión
 *         correo:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *         estado:
 *           type: string
 *           enum: [AC, IN, BL]
 *           description: Estado del usuario (AC=Activo, IN=Inactivo, BL=Bloqueado)
 *         docenteId:
 *           type: integer
 *           description: ID del docente asociado
 */

/**
 * @swagger
 * api/usuarios/iniciar-sesion:
 *   post:
 *     summary: Inicia sesión de usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - contrasena
 *             properties:
 *               login:
 *                 type: string
 *                 description: Login o correo del usuario
 *               contrasena:
 *                 type: string
 *                 description: Contraseña del usuario
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 usuario:
 *                   $ref: '#/components/schemas/Usuario'
 */
rutas.post('/iniciar-sesion', [
    body('login').notEmpty().withMessage('El login o correo es obligatorio'),
    body('contrasena').notEmpty().withMessage('La contraseña es obligatoria'),
], controladorUsuarios.iniciarSesion);

/**
 * @swagger
 * api/usuarios/solicitar-reset:
 *   post:
 *     summary: Solicita un PIN para restablecer la contraseña
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: PIN enviado al correo exitosamente
 */
rutas.post('/solicitar-restablecimiento', [
    body('correo').isEmail().withMessage('Correo inválido'),
], controladorUsuarios.solicitarRestablecimiento);

/**
 * @swagger
 * api/usuarios/validar-pin:
 *   post:
 *     summary: Valida el PIN para restablecer la contraseña
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - pin
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *               pin:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: PIN validado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
rutas.post('/validar-pin', [
    body('correo').isEmail().withMessage('Correo inválido'),
    body('pin').isLength({ min: 6, max: 6 }).withMessage('PIN debe tener 6 dígitos'),
], controladorUsuarios.validarPin);

/**
 * @swagger
 * api/usuarios/restablecer-contrasena:
 *   post:
 *     summary: Restablece la contraseña usando un token válido
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contrasena
 *             properties:
 *               contrasena:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 */
rutas.post('/restablecer-contrasena', [
    validarToken,
    body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
], controladorUsuarios.restablecerContrasena);

rutas.get('/listar', validarToken, controladorUsuarios.Listar);

rutas.post('/guardar', [
    body('login').notEmpty().withMessage('El login es obligatorio'),
    body("login").custom(async (value) => {
        if (value) {
            const buscar = await Usuarios.findOne({ where: { login: value } });
            if (buscar) {
                throw new Error('El login del usuario ya está en uso');
            }
        }
    }),
    body('correo').isEmail().withMessage('El email no es válido'),
    body("correo").custom(async (value) => {
        if (value) {
            const buscar = await Usuarios.findOne({ where: { correo: value } });
            if (buscar) {
                throw new Error('El correo del usuario ya está en uso');
            }
        }
    }),
    body('contrasena').notEmpty().withMessage('La contraseña es obligatoria'),
    body('estado').optional().isIn(['AC', 'IN', 'BL']).withMessage('El estado no es válido'),
], controladorUsuarios.insertar);

rutas.put('/editar', [
    query('id').notEmpty().withMessage('El id es obligatorio'),
    body('login').optional().notEmpty().withMessage('El login no puede estar vacío'),
    body("login").custom(async (value) => {
        if (value) {
            const buscar = await Usuarios.findOne({ where: { login: value } });
            if (buscar) {
                throw new Error('El login del usuario ya está en uso');
            }
        }
    }),
    body('correo').optional().isEmail().withMessage('El email no es válido'),
    body("correo").custom(async (value) => {
        if (value) {
            const buscar = await Usuarios.findOne({ where: { correo: value } });
            if (buscar) {
                throw new Error('El correo del usuario ya está en uso');
            }
        }
    }),
    body('estado').optional().isIn(['AC', 'IN', 'BL']).withMessage('El estado no es válido'),
], controladorUsuarios.actualizar);

rutas.delete('/eliminar', [
    query('id').notEmpty().withMessage('El id es obligatorio'),
], controladorUsuarios.Eliminar);

module.exports = rutas;