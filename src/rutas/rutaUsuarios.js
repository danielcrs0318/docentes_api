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
 *           description: ID autogenerado del usuario
 *         login:
 *           type: string
 *           maxLength: 50
 *           description: Nombre de usuario para iniciar sesión
 *         correo:
 *           type: string
 *           format: email
 *           maxLength: 150
 *           description: Correo electrónico del usuario
 *         pin:
 *           type: string
 *           maxLength: 6
 *           description: Código PIN temporal para recuperación de acceso
 *         pinExpiracion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de expiración del PIN
 *         intentos:
 *           type: integer
 *           description: Número de intentos fallidos de inicio de sesión
 *           default: 0
 *         contrasena:
 *           type: string
 *           format: password
 *           description: Contraseña del usuario (encriptada en la base de datos)
 *         estado:
 *           type: string
 *           enum: [AC, IN, BL]
 *           description: Estado del usuario (Activo, Inactivo o Bloqueado)
 *           default: AC
 *         docenteId:
 *           type: integer
 *           description: ID del docente asociado al usuario
 *       example:
 *         login: dmolina
 *         correo: daniel@example.com
 *         contrasena: "123456"
 *         pin: "904512"
 *         pinExpiracion: "2025-11-12T23:59:00Z"
 *         intentos: 0
 *         estado: AC
 *         docenteId: 1
 */

/**
 * @swagger
 * /usuarios/iniciar-sesion:
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
 * /usuarios/solicitar-restablecimiento:
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
 * /usuarios/validar-pin:
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
 * /usuarios/restablecer-contrasena:
 *   post:
 *     summary: Restablece la contraseña usando un token válido
 *     tags: [Usuarios]
 *     security:
 *       - BearerAuth: []
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

/**
 * @swagger
 * /usuarios/listar:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       500:
 *         description: Error del servidor
 */

rutas.get('/listar', validarToken, controladorUsuarios.Listar);


/**
 * @swagger
 * /usuarios/guardar:
 *   post:
 *     summary: Guardar un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       500:
 *         description: Error del servidor
 */
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

rutas.post('/imagenes', 
    controladorUsuarios.validarImagenUsuario, 
    controladorUsuarios.guardarImagenUsuario);  // <-- Este controlador no existe
// Exportar las rutas
module.exports = rutas;