const { Router } = require('express');
const { body, query } = require('express-validator');
const rutas = Router();
const controladorDocentes = require('../controladores/controladorDocentes');

/**
 * @swagger
 * components:
 *   schemas:
 *     Docente:
 *       type: object
 *       required:
 *         - nombre
 *         - correo
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         correo:
 *           type: string
 *           format: email
 */

rutas.get('/Listar', controladorDocentes.ListarDocentes);

/**
 * @swagger
 * /api/docentes/Listar:
 *   get:
 *     summary: Obtener lista de docentes
 *     tags: [Docentes]
 *     responses:
 *       200:
 *         description: Lista de docentes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Docente'
 *       500:
 *         description: Error del servidor
 */

rutas.post('/guardar', [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('correo').isEmail().withMessage('El correo debe ser válido')
], controladorDocentes.CrearDocente);

/**
 * @swagger
 * /api/docentes/guardar:
 *   post:
 *     summary: Crear un nuevo docente
 *     tags: [Docentes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Docente'
 *     responses:
 *       201:
 *         description: Docente creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Docente'
 *       400:
 *         description: Error de validación
 */

rutas.put('/Editar', [
    query('id').notEmpty().withMessage('El ID del docente es obligatorio'),
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('correo').optional().isEmail().withMessage('El correo debe ser válido')
], controladorDocentes.ActualizarDocente);

/**
 * @swagger
 * /api/docentes/Editar:
 *   put:
 *     summary: Actualizar un docente existente
 *     tags: [Docentes]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del docente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Docente'
 *     responses:
 *       200:
 *         description: Docente actualizado
 *       404:
 *         description: Docente no encontrado
 */

rutas.delete('/Eliminar', [
    query('id').notEmpty().withMessage('El ID del docente es obligatorio')
], controladorDocentes.EliminarDocente);

/**
 * @swagger
 * /api/docentes/Eliminar:
 *   delete:
 *     summary: Eliminar un docente
 *     tags: [Docentes]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del docente a eliminar
 *     responses:
 *       200:
 *         description: Docente eliminado correctamente
 *       404:
 *         description: Docente no encontrado
 */

module.exports = rutas;
