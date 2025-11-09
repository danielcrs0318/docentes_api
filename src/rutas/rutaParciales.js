const {Router} = require('express');
const { body, query } = require('express-validator');
const controladorParciales = require('../controladores/controladorParciales');
const rutas = Router();

// Validaciones para filtrar por nombre
const validarFiltrarPorNombre = [
    query('nombre')
        .notEmpty()
        .withMessage('El parámetro nombre es obligatorio')
        .isLength({ min: 2 })
        .withMessage('El nombre debe tener al menos 2 caracteres')
];

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
 * /parciales/listar:
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
 * /parciales/guardar:
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
 * /parciales/editar:
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
 * /parciales/eliminar:
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

/**
 * @swagger
 * /parciales/filtrar-nombre:
 *   get:
 *     summary: Filtrar parciales por nombre (búsqueda parcial)
 *     description: Busca parciales que coincidan parcialmente con el nombre proporcionado
 *     tags: [Parciales]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *           example: "Primer"
 *         description: Nombre o parte del nombre del parcial a buscar
 *     responses:
 *       200:
 *         description: Lista de parciales que coinciden con el criterio de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Se encontraron 2 parcial(es)"
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
 *                         example: "Primer Parcial"
 *                       estado:
 *                         type: string
 *                         example: "ACTIVO"
 *                       fechaInicio:
 *                         type: string
 *                         format: date-time
 *                       fechaFin:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Parámetro nombre no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Errores de validación"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       atributo:
 *                         type: string
 *                         example: "nombre"
 *                       msg:
 *                         type: string
 *                         example: "El parámetro nombre es obligatorio"
 *       500:
 *         description: Error interno del servidor
 */


// Filtrar parciales por nombre (búsqueda parcial)
rutas.get('/filtrar-nombre',  validarFiltrarPorNombre, controladorParciales.filtrarParcialesPorNombre);


module.exports = rutas;