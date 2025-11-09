const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorPeriodos = require('../controladores/controladorPeriodos');
const rutas = Router();
const Periodos = require('../modelos/Periodos');

/**
 * @swagger
 * components:
 *   schemas:
 *     Parcial:
 *       type: object
 *       required:
 *         - nombre
 *         - fechaInicio
 *         - fechaFin
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre del parcial
 *         fechaInicio:
 *           type: string
 *           format: date
 *           description: Fecha de inicio del parcial (YYYY-MM-DD)
 *         fechaFin:
 *           type: string
 *           format: date
 *           description: Fecha de fin del parcial (YYYY-MM-DD)
 *     Periodo:
 *       type: object
 *       required:
 *         - nombre
 *         - fechaInicio
 *         - fechaFin
 *         - parciales
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del periodo
 *         nombre:
 *           type: string
 *           description: Nombre del periodo académico
 *           minLength: 6
 *           maxLength: 15
 *         fechaInicio:
 *           type: string
 *           format: date
 *           description: Fecha de inicio del periodo (YYYY-MM-DD)
 *         fechaFin:
 *           type: string
 *           format: date
 *           description: Fecha de fin del periodo (YYYY-MM-DD)
 *         parciales:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Parcial'
 *           description: Lista de parciales del periodo
 */

// Rutas para Periodos
/**
 * @swagger
 * /periodos/listar:
 *   get:
 *     summary: Obtiene la lista de todos los periodos académicos
 *     tags: [Periodos]
 *     responses:
 *       200:
 *         description: Lista de periodos recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Periodo'
 *       500:
 *         description: Error del servidor
 */
rutas.get('/listar',
  controladorPeriodos.ListarPeriodos);

/**
 * @swagger
 * /periodos/guardar:
 *   post:
 *     summary: Crea un nuevo periodo académico
 *     tags: [Periodos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Periodo'
 *     responses:
 *       201:
 *         description: Periodo creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Periodo'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       500:
 *         description: Error del servidor
 */
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
/**
 * @swagger
 * /periodos/editar:
 *   put:
 *     summary: Actualiza un periodo académico existente
 *     tags: [Periodos]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo a editar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Periodo'
 *     responses:
 *       200:
 *         description: Periodo actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Periodo'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       404:
 *         description: Periodo no encontrado
 *       500:
 *         description: Error del servidor
 */
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
/**
 * @swagger
 * /periodos/eliminar:
 *   delete:
 *     summary: Elimina un periodo académico
 *     tags: [Periodos]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo a eliminar
 *     responses:
 *       200:
 *         description: Periodo eliminado exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Periodo no encontrado
 *       500:
 *         description: Error del servidor
 */
rutas.delete('/eliminar', [
  query('id').isInt().withMessage('El ID debe ser un número entero')
], controladorPeriodos.EliminarPeriodo);

module.exports = rutas;
