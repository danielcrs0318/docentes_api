const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorClases = require('../controladores/controladorClases');

const rutas = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Clase:
 *       type: object
 *       required:
 *         - codigo
 *         - nombre
 *         - diaSemana
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la clase
 *         codigo:
 *           type: string
 *           minLength: 10
 *           maxLength: 11
 *           description: Código único de la clase
 *         nombre:
 *           type: string
 *           minLength: 5
 *           maxLength: 30
 *           description: Nombre de la clase
 *         diaSemana:
 *           type: string
 *           description: Día de la semana en que se imparte la clase
 *
 * tags:
 *   name: Clases
 *   description: Rutas para la gestión de clases
 */

/**
 * @swagger
 * /api/clases/listar:
 *   get:
 *     summary: Obtiene la lista de todas las clases
 *     tags: [Clases]
 *     responses:
 *       200:
 *         description: Lista de clases recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Clase'
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   description: Mensaje de error
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       atributo:
 *                         type: string
 *                       msj:
 *                         type: string
 */

rutas.get('/listar',
    controladorClases.ListarClases);

/**
 * @swagger
 * /api/clases/guardar:
 *   post:
 *     summary: Crea una nueva clase
 *     tags: [Clases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - nombre
 *               - diaSemana
 *             properties:
 *               codigo:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 11
 *                 description: Código único de la clase
 *               nombre:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 30
 *                 description: Nombre de la clase
 *               diaSemana:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Día de la semana en que se imparte la clase
 *     responses:
 *       201:
 *         description: Clase creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Clase'
 *       400:
 *         description: Error en los datos proporcionados
 */
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
        .withMessage('El día de la semana es obligatorio.'),
    body('creditos')
        .notEmpty()
        .isIn([3, 4])
        .withMessage('Los créditos son obligatorios y deben ser 3 o 4'),
], controladorClases.CrearClase);

/**
 * @swagger
 * /api/clases/editar:
 *   put:
 *     summary: Actualiza una clase existente
 *     tags: [Clases]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - nombre
 *               - diaSemana
 *             properties:
 *               codigo:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 11
 *                 description: Nuevo código de la clase
 *               nombre:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 30
 *                 description: Nuevo nombre de la clase
 *               diaSemana:
 *                 type: string
 *                 description: Nuevo día de la semana
 *     responses:
 *       200:
 *         description: Clase actualizada exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Clase no encontrada
 */
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
        .withMessage('El día de la semana es obligatorio.'),
    body('creditos')
        .notEmpty()
        .isIn([3, 4])
        .withMessage('Los créditos son obligatorios y deben ser 3 o 4'),
], controladorClases.ActualizarClase);

/**
 * @swagger
 * /api/clases/eliminar:
 *   delete:
 *     summary: Elimina una clase
 *     tags: [Clases]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase a eliminar
 *     responses:
 *       200:
 *         description: Clase eliminada exitosamente
 *       400:
 *         description: Error en la solicitud
 *       404:
 *         description: Clase no encontrada
 */
rutas.delete('/eliminar', [
    query('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
], controladorClases.EliminarClase);

module.exports = rutas;