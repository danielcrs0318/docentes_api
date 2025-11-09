const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorPeriodos = require('../controladores/controladorPeriodos');
const rutas = Router();

// Validaciones para filtrar por nombre
const validarFiltrarPorNombre = [
  query('nombre')
    .notEmpty()
    .withMessage('El parámetro nombre es obligatorio')
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres')
    .trim()
    .escape()
];

// Validaciones para filtrar por fecha
const validarFiltrarPorFecha = [
  query('fechaInicio')
    .notEmpty()
    .withMessage('El parámetro fechaInicio es obligatorio')
    .isDate()
    .withMessage('La fecha de inicio debe tener un formato válido (YYYY-MM-DD)'),
  query('fechaFin')
    .notEmpty()
    .withMessage('El parámetro fechaFin es obligatorio')
    .isDate()
    .withMessage('La fecha fin debe tener un formato válido (YYYY-MM-DD)')
];

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

/**
 * @swagger
 * /periodos/filtrar-nombre:
 *   get:
 *     summary: Filtrar periodos por nombre (búsqueda parcial)
 *     description: Busca periodos que coincidan parcialmente con el nombre proporcionado
 *     tags: [Periodos]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *           example: "2024"
 *         description: Nombre o parte del nombre del periodo a buscar
 *     responses:
 *       200:
 *         description: Lista de periodos que coinciden con el criterio de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Se encontraron 2 periodo(s)"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Periodo 2024-1"
 *                       fechaInicio:
 *                         type: string
 *                         format: date
 *                         example: "2024-01-15"
 *                       fechaFin:
 *                         type: string
 *                         format: date
 *                         example: "2024-06-15"
 *                       parciales:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             nombre:
 *                               type: string
 *                             fechaInicio:
 *                               type: string
 *                               format: date
 *                             fechaFin:
 *                               type: string
 *                               format: date
 *                 count:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: Parámetro nombre no proporcionado o inválido
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /periodos/filtrar-fecha:
 *   get:
 *     summary: Filtrar periodos por rango de fechas
 *     description: Busca periodos que coincidan con el rango de fechas especificado
 *     tags: [Periodos]
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: Fecha de inicio del rango (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: Fecha fin del rango (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de periodos que coinciden con el rango de fechas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Se encontraron 3 periodo(s) en el rango especificado"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Periodo 2024-1"
 *                       fechaInicio:
 *                         type: string
 *                         format: date
 *                         example: "2024-01-15"
 *                       fechaFin:
 *                         type: string
 *                         format: date
 *                         example: "2024-06-15"
 *                       parciales:
 *                         type: array
 *                         items:
 *                           type: object
 *                 count:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Parámetros de fecha no proporcionados o inválidos
 *       500:
 *         description: Error interno del servidor
 */

rutas.get('/filtrar-nombre', validarFiltrarPorNombre, controladorPeriodos.filtrarPeriodosPorNombre);
rutas.get('/filtrar-fecha', validarFiltrarPorFecha, controladorPeriodos.filtrarPeriodosPorFecha);

module.exports = rutas;
