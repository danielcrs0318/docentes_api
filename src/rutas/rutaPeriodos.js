const {Router} = require('express');
const { body, query } = require('express-validator');
const controladorPeriodos = require('../controladores/controladorPeriodos');
const rutas = Router();
const Periodos = require('../modelos/Periodos');

// Rutas para Periodos
rutas.get('/listar', controladorPeriodos.ListarPeriodos);

rutas.post('/guardar', [
     body('nombre')
    .notEmpty()
    .isLength({ min: 6, max: 15 })
    .withMessage('El nombre debe tener entre 6 y 15 caracteres'),

  body('fechaInicio')
    .notEmpty()
    .withMessage('La fecha de inicio es obligatoria')
    .isISO8601()
    .withMessage('La fecha de inicio debe tener formato YYYY-MM-DD')
    .custom((value) => {
      // Fecha mínima permitida (puedes cambiarla)
      const fechaMinima = new Date('2025-01-01');
      const fechaIngresada = new Date(value);

      if (fechaIngresada < fechaMinima) {
        throw new Error('La fecha de inicio no puede ser anterior al 1 de enero de 2025');
      }

      return true;
    }),
    body('fechaFin')
      .notEmpty()
      .withMessage('La fecha de fin es obligatoria')
      .isISO8601()
      .withMessage('La fecha de fin debe tener formato YYYY-MM-DD')
      .custom((value, { req }) => {
        const fechaInicio = new Date(req.body.fechaInicio);
        const fechaFin = new Date(value);

        if (fechaFin <= fechaInicio) {
          throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        }

        return true;
      }),
      body('parciales').isArray().withMessage('Los parciales deben ser un arreglo'),
      body('parciales.*.nombre').notEmpty().withMessage('El nombre del parcial es obligatorio'),
      body('parciales.*.fechaInicio').isISO8601().withMessage('La fecha de inicio del parcial debe tener formato YYYY-MM-DD'),
      body('parciales.*.fechaFin').isISO8601().withMessage('La fecha de fin del parcial debe tener formato YYYY-MM-DD')

], controladorPeriodos.CrearPeriodo);
rutas.put('/editar', [
    query('id').isInt().withMessage('El ID debe ser un número entero'),
    body('nombre')
    .notEmpty()
    .isLength({ min: 6, max: 15 })
    .withMessage('El nombre debe tener entre 6 y 15 caracteres'),

  body('fechaInicio')
    .notEmpty()
    .withMessage('La fecha de inicio es obligatoria')
    .isISO8601()
    .withMessage('La fecha de inicio debe tener formato YYYY-MM-DD')
    .custom((value) => {
      // Fecha mínima permitida (puedes cambiarla)
      const fechaMinima = new Date('2025-01-01');
      const fechaIngresada = new Date(value);

      if (fechaIngresada < fechaMinima) {
        throw new Error('La fecha de inicio no puede ser anterior al 1 de enero de 2025');
      }

      return true;
    }),
    body('fechaFin')
      .notEmpty()
      .withMessage('La fecha de fin es obligatoria')
      .isISO8601()
      .withMessage('La fecha de fin debe tener formato YYYY-MM-DD')
      .custom((value, { req }) => {
        const fechaInicio = new Date(req.body.fechaInicio);
        const fechaFin = new Date(value);

        if (fechaFin <= fechaInicio) {
          throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        }

        return true;
      }),
      body('parciales').isArray().withMessage('Los parciales deben ser un arreglo'),
      body('parciales.*.nombre').notEmpty().withMessage('El nombre del parcial es obligatorio'),
      body('parciales.*.fechaInicio').isISO8601().withMessage('La fecha de inicio del parcial debe tener formato YYYY-MM-DD'),
      body('parciales.*.fechaFin').isISO8601().withMessage('La fecha de fin del parcial debe tener formato YYYY-MM-DD')
      
], controladorPeriodos.EditarPeriodo);
rutas.delete('/eliminar', [
    query('id').isInt().withMessage('El ID debe ser un número entero')
], controladorPeriodos.EliminarPeriodo);

module.exports = rutas;
