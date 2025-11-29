const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorClases = require('../controladores/controladorClases');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');

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
 * /clases/listar:
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
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
    controladorClases.ListarClases);

/**
 * @swagger
 * /clases/guardar:
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
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
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
 * /clases/editar:
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
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
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
 * /clases/eliminar:
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
    validarToken,
    verificarRol(['ADMIN']),
    query('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
], controladorClases.EliminarClase);

/**
 * @swagger
 * /clases/filtrar-nombre:
 *   get:
 *     summary: Filtrar clases por nombre (búsqueda parcial)
 *     description: Busca clases que coincidan parcialmente con el nombre proporcionado
 *     tags: [Clases]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *           example: "Matemáticas"
 *         description: Nombre o parte del nombre de la clase a buscar
 *     responses:
 *       200:
 *         description: Lista de clases que coinciden con el criterio de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Se encontraron 3 clase(s)"
 *                 datos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       codigo:
 *                         type: string
 *                         example: "MAT101"
 *                       nombre:
 *                         type: string
 *                         example: "Matemáticas Básicas"
 *                       diaSemana:
 *                         type: string
 *                         example: "Lunes"
 *                       creditos:
 *                         type: integer
 *                         example: 4
 *       400:
 *         description: Parámetro nombre no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: "El parámetro nombre es obligatorio"
 *                       param:
 *                         type: string
 *                         example: "nombre"
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /clases/filtrar-dia-creditos:
 *   get:
 *     summary: Filtrar clases por día de la semana y créditos
 *     description: Busca clases por día de la semana y rango de créditos
 *     tags: [Clases]
 *     parameters:
 *       - in: query
 *         name: creditosMin
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 3
 *           maximum: 3
 *           example: 3
 *         description: Créditos mínimos de la clase
 *       - in: query
 *         name: creditosMax
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 3
 *           maximum: 4
 *           example: 4
 *         description: Créditos máximos de la clase
 *     responses:
 *       200:
 *         description: Lista de clases que coinciden con los criterios de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Se encontraron 2 clase(s)"
 *                 datos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       codigo:
 *                         type: string
 *                         example: "MAT101"
 *                       nombre:
 *                         type: string
 *                         example: "Matemáticas Básicas"
 *                       diaSemana:
 *                         type: string
 *                         example: "Lunes"
 *                       creditos:
 *                         type: integer
 *                         example: 4
 *       400:
 *         description: Parámetros inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: "El parámetro diaSemana es obligatorio"
 *                       param:
 *                         type: string
 *                         example: "diaSemana"
 *       500:
 *         description: Error interno del servidor
 */

// Filtrar clases por nombre (búsqueda parcial)
rutas.get('/filtrar-nombre',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
    query('nombre')
        .notEmpty()
        .withMessage('El parámetro nombre es obligatorio'),
    controladorClases.filtrarClasesPorNombre);

// Filtrar clases por día de la semana y créditos
rutas.get('/filtrar-dia-creditos',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
    query('diaSemana')
        .notEmpty()
        .withMessage('El parámetro diaSemana es obligatorio'),
    controladorClases.filtrarClasesPorDiaYCreditos);

module.exports = rutas;