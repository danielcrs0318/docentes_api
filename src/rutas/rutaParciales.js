const {Router} = require('express');
const { body, query } = require('express-validator');
const controladorParciales = require('../controladores/controladorParciales');
const rutas = Router();
const Parciales = require('../modelos/Parciales');

/**
 * @swagger
 * tags:
 *   name: Parciales
 *   description: API para gestión de parciales académicos
 */

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
 *         - periodoId
 *       properties:
 *         id:
 *           type: integer
 *           description: ID autogenerado del parcial
 *         nombre:
 *           type: string
 *           minLength: 6
 *           maxLength: 15
 *           description: Nombre del parcial (ej. "Primer Parcial")
 *         fechaInicio:
 *           type: string
 *           format: date
 *           description: Fecha de inicio del parcial (YYYY-MM-DD)
 *         fechaFin:
 *           type: string
 *           format: date
 *           description: Fecha de finalización del parcial (YYYY-MM-DD)
 *         periodoId:
 *           type: integer
 *           description: ID del periodo al que pertenece el parcial
 *       example:
 *         nombre: "Primer Parcial"
 *         fechaInicio: "2025-01-15"
 *         fechaFin: "2025-02-15"
 *         periodoId: 1
 */

/**
 * @swagger
 * api/parciales/listar:
 *   get:
 *     summary: Obtiene todos los parciales
 *     tags: [Parciales]
 *     responses:
 *       200:
 *         description: Lista de parciales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Parcial'
 *       500:
 *         description: Error del servidor
 */
rutas.get('/listar',
    controladorParciales.ListarParciales
);

/**
 * @swagger
 * api/parciales/guardar:
 *   post:
 *     summary: Crea un nuevo parcial
 *     tags: [Parciales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parcial'
 *     responses:
 *       201:
 *         description: Parcial creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Parcial'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       500:
 *         description: Error del servidor
 */
rutas.post('/guardar',
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

  controladorParciales.CrearParcial
);

/**
 * @swagger
 * api/parciales/editar:
 *   put:
 *     summary: Actualiza un parcial existente
 *     tags: [Parciales]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del parcial a editar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parcial'
 *     responses:
 *       200:
 *         description: Parcial actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Parcial'
 *       400:
 *         description: Datos inválidos o ID no numérico
 *       404:
 *         description: Parcial no encontrado
 *       500:
 *         description: Error del servidor
 */
rutas.put('/editar',
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

  controladorParciales.CrearParcial
);

/**
 * @swagger
 * api/parciales/eliminar:
 *   delete:
 *     summary: Elimina un parcial
 *     tags: [Parciales]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del parcial a eliminar
 *     responses:
 *       200:
 *         description: Parcial eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Parcial eliminado correctamente"
 *       400:
 *         description: ID no numérico
 *       404:
 *         description: Parcial no encontrado
 *       500:
 *         description: Error del servidor
 */
rutas.delete('/eliminar',
    query('id').isInt().withMessage('El ID debe ser un número entero'),
    controladorParciales.EliminarParcial
);

module.exports = rutas;