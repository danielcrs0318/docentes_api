const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorUsuarios = require('../controladores/controladorUsuarios');
const rutas = Router();
const Usuarios = require('../modelos/Usuarios');

rutas.get('/listar', controladorUsuarios.Listar);

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