const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorClases = require('../controladores/controladorClases');

const rutas = Router();

rutas.get('/listar',
    controladorClases.ListarClases);

rutas.post('/guardar', [
    body('codigo')
        .notEmpty()
        .isLength({ min: 10, max: 11 })
        .withMessage('El código es obligatorio y debe tener entre 10 y 11 caracteres'),
    body('nombre')
        .notEmpty()
        .isLength({ min: 5, max: 30 })
        .withMessage('El nombre es obligatorio y debe tener entre 5 y 30 caracteres'),
    body('diaSemana')
        .notEmpty()
        .withMessage('El día de la semana es obligatorio.')
], controladorClases.CrearClase);

rutas.put('/editar', [
    query('id')
        .notEmpty()
        .withMessage('El ID es obligatorio'),
    body('codigo')
        .notEmpty()
        .isLength({ min: 10, max: 11 })
        .withMessage('El código es obligatorio y debe tener entre 10 y 11 caracteres'),
    body('nombre')
        .notEmpty()
        .isLength({ min: 5, max: 30 })
        .withMessage('El nombre es obligatorio y debe tener entre 5 y 30 caracteres.'),
    body('diaSemana')
        .notEmpty()
        .withMessage('El día de la semana es obligatorio.')
], controladorClases.ActualizarClase);

rutas.delete('/eliminar', [
    query('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
], controladorClases.EliminarClase);

module.exports = rutas;