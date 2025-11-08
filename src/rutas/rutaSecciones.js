const {Router} = require('express');
const {body, query} = require('express-validator');
const controladorSecciones = require('../controladores/controladorSecciones');
const rutas = Router();
const Secciones = require('../modelos/Secciones');

/**
 * @swagger
 * components:
 *   schemas:
 *     Seccion:
 *       type: object
 *       required:
 *         - nombre
 *         - aulaId
 *         - claseId
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la sección
 *         nombre:
 *           type: string
 *           description: Nombre de la sección
 *         aulaId:
 *           type: integer
 *           description: ID del aula asignada a la sección
 *         claseId:
 *           type: integer
 *           description: ID de la clase a la que pertenece la sección
 */

/**
 * @swagger
 * api/secciones/listar:
 *   get:
 *     summary: Obtiene la lista de todas las secciones
 *     tags: [Secciones]
 *     responses:
 *       200:
 *         description: Lista de secciones recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Seccion'
 *       500:
 *         description: Error del servidor
 */
rutas.get('/listar',
    controladorSecciones.ListarSecciones
);

/**
 * @swagger
 * api/secciones/guardar:
 *   post:
 *     summary: Crea una nueva sección
 *     tags: [Secciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Seccion'
 *     responses:
 *       201:
 *         description: Sección creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seccion'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       500:
 *         description: Error del servidor
 */
rutas.post('/guardar',
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('aulaId').isInt().withMessage('El ID de aula debe ser un número entero'),
    body('claseId').isInt().withMessage('El ID de clase debe ser un número entero'),
    controladorSecciones.CrearSeccion
);

/**
 * @swagger
 * api/secciones/editar:
 *   put:
 *     summary: Actualiza una sección existente
 *     tags: [Secciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sección a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Seccion'
 *     responses:
 *       200:
 *         description: Sección actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seccion'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       404:
 *         description: Sección no encontrada
 *       500:
 *         description: Error del servidor
 */
rutas.put('/editar',
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('aulaId').isInt().withMessage('El ID de aula debe ser un número entero'),
    body('claseId').isInt().withMessage('El ID de clase debe ser un número entero'),
    controladorSecciones.ActualizarSeccion
);

/**
 * @swagger
 * api/secciones/eliminar:
 *   delete:
 *     summary: Elimina una sección
 *     tags: [Secciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sección a eliminar
 *     responses:
 *       200:
 *         description: Sección eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Sección no encontrada
 *       500:
 *         description: Error del servidor
 */
rutas.delete('/eliminar',
    query('id').isInt().withMessage('El ID debe ser un número entero'),
    controladorSecciones.EliminarSeccion
);
module.exports = rutas;