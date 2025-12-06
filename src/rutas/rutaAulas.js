const {Router} = require('express');
const {body, query} = require('express-validator');
const controladorAulas = require('../controladores/controladorAulas');
const rutas = Router();
const Aulas = require('../modelos/Aulas');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');

/**
 * @swagger
 * components:
 *   schemas:
 *     Aula:
 *       type: object
 *       required:
 *         - nombre
 *         - capacidad
 *       properties:
 *         id:
 *           type: integer
 *           description: ID del aula
 *         nombre:
 *           type: string
 *           description: Nombre del aula
 *         capacidad:
 *           type: integer
 *           description: Capacidad del aula
 */

/**
 * @swagger
 * tags:
 *   name: Aulas
 *   description: Rutas para la gestión de aulas
 */

/**
 * @swagger
 * /aulas/listar:
 *   get:
 *     summary: Obtiene la lista de todas las aulas
 *     tags: [Aulas]
 *     responses:
 *       200:
 *         description: Lista de aulas recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Aula'
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

// Rutas para Aulas
rutas.get('/listar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    controladorAulas.ListarAulas);

/**
 * @swagger
 * /aulas/guardar:
 *   post:
 *     summary: Crear una nueva aula
 *     tags: [Aulas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - capacidad
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Nombre del aula
 *               capacidad:
 *                 type: integer
 *                 minimum: 1
 *                 description: Capacidad del aula
 *     responses:
 *       201:
 *         description: Aula creada exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       409:
 *         description: Ya existe un aula con ese nombre
 */
rutas.post('/guardar', [
    validarToken,
    verificarRol(['ADMIN']),
    body('nombre')
        .notEmpty()
        .isLength({min: 3, max: 50})
        .withMessage('El nombre debe tener entre 3 y 50 caracteres')
        .custom(async (value) => {
            // Validar que no exista un aula con el mismo nombre
            const aulaExistente = await Aulas.findOne({ where: { nombre: value } });
            if (aulaExistente) {
                throw new Error('Ya existe un aula con ese nombre');
            }
        }),
    body('capacidad')
        .notEmpty()
        .isInt({min: 1})  // Cambié min: 9 por min: 1
        .withMessage('La capacidad debe ser un número entero mayor que 0')
], controladorAulas.CrearAula);

/**
 * @swagger
 * /aulas/editar:
 *   put:
 *     summary: Actualizar un aula existente
 *     tags: [Aulas]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del aula a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - capacidad
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Nuevo nombre del aula
 *               capacidad:
 *                 type: integer
 *                 minimum: 1
 *                 description: Nueva capacidad del aula
 *     responses:
 *       200:
 *         description: Aula actualizada exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Aula no encontrada
 *       409:
 *         description: Ya existe otra aula con ese nombre
 */
rutas.put('/editar', [
    validarToken,
    verificarRol(['ADMIN']),
    query('id')  
        .notEmpty()
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero válido'),
    body('nombre')
        .notEmpty()
        .isLength({min: 3, max: 50})
        .withMessage('El nombre debe tener entre 3 y 50 caracteres')
        .custom(async (value, { req }) => {
            const aulaExistente = await Aulas.findOne({ 
                where: { nombre: value } 
            });
            // Si existe un aula con el mismo nombre Y no es la misma que estamos editando
            if (aulaExistente && aulaExistente.id !== parseInt(req.query.id)) { // ← Cambiar a req.query.id
                throw new Error('Ya existe otra aula con ese nombre');
            }
        }),
    body('capacidad')
        .notEmpty()
        .isInt({min: 1})
        .withMessage('La capacidad debe ser un número entero mayor que 0'),
    query('id').custom(async (value) => {  
        const aulaExistente = await Aulas.findOne({ where: { id: value } });
        if (!aulaExistente) {
            throw new Error('Aula no encontrada');
        }
    })
], controladorAulas.ActualizarAula);

/**
 * @swagger
 * /aulas/eliminar:
 *   delete:
 *     summary: Eliminar un aula
 *     tags: [Aulas]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del aula a eliminar
 *     responses:
 *       200:
 *         description: Aula eliminada exitosamente
 *       400:
 *         description: Error en la solicitud
 *       404:
 *         description: Aula no encontrada
 */
rutas.delete('/eliminar', [
    validarToken,
    verificarRol(['ADMIN']),
    query('id')
        .notEmpty()
        .isInt()
        .withMessage('El ID debe ser un número entero'),
    query('id').custom(async (value) => {
        const aulaExistente = await Aulas.findOne({ where: { id: value } });
        if (!aulaExistente) {
            throw new Error('Aula no encontrada');
        }
    })
], controladorAulas.EliminarAula);

/**
 * @swagger
 * /aulas/filtrar-nombre:
 *   get:
 *     summary: Filtrar aulas por nombre (búsqueda parcial)
 *     tags: [Aulas]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre o parte del nombre del aula a buscar
 *     responses:
 *       200:
 *         description: Lista de aulas que coinciden con el nombre proporcionado
 *       400:
 *         description: Parámetro "nombre" no proporcionado o inválido
 *       500:
 *         description: Error del servidor
 */

// Filtrar aulas por nombre (búsqueda parcial)
rutas.get('/filtrar-nombre',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    query('nombre').notEmpty().withMessage('El parámetro "nombre" es requerido'),
    controladorAulas.filtrarPorNombre);

/**
 * @swagger
 * /aulas/filtrar-capacidad:
 *   get:
 *     summary: Filtrar aulas por capacidad (rango de capacidad)
 *     tags: [Aulas]
 *     parameters:
 *       - in: query
 *         name: capacidadMin
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Valor mínimo de capacidad
 *       - in: query
 *         name: capacidadMax
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Valor máximo de capacidad
 *     responses:
 *       200:
 *         description: Lista de aulas que coinciden con el rango de capacidad proporcionado
 *       400:
 *         description: Parámetros "min" o "max" no proporcionados o inválidos
 *       500:
 *         description: Error del servidor
 */

// Filtrar aulas por capacidad (rango)
rutas.get('/filtrar-capacidad',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    query('min').optional().isInt({ min: 1 }).withMessage('El valor mínimo debe ser un entero mayor que 0'),
    query('max').optional().isInt({ min: 1 }).withMessage('El valor máximo debe ser un entero mayor que 0'),
    controladorAulas.filtrarPorCapacidad);

module.exports = rutas;
