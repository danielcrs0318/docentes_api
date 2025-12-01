const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorGrupos = require('../controladores/controladorGrupos');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');

const rutas = Router();

/**
 * @swagger
 * tags:
 *   name: Grupos
 *   description: API para gestionar grupos de proyectos y rifas
 */

/**
 * @swagger
 * /api/grupos/validar-cantidad:
 *   get:
 *     summary: Validar cantidad de estudiantes disponibles para rifar
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: claseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase
 *       - in: query
 *         name: cantidad
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cantidad de estudiantes a validar
 *     responses:
 *       200:
 *         description: Validación exitosa
 *       400:
 *         description: Cantidad excedida o parámetros inválidos
 */
rutas.get('/validar-cantidad', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  query('claseId').isInt().withMessage('claseId debe ser un número entero'),
  query('cantidad').isInt({ min: 1 }).withMessage('cantidad debe ser un número entero mayor a 0')
], controladorGrupos.ValidarCantidadEstudiantes);

/**
 * @swagger
 * /api/grupos/rifar-proyectos:
 *   post:
 *     summary: Rifar proyectos y crear grupos automáticamente
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - claseId
 *             properties:
 *               claseId:
 *                 type: integer
 *                 description: ID de la clase
 *     responses:
 *       201:
 *         description: Grupos creados exitosamente
 *       400:
 *         description: Error en la validación o grupos ya existentes
 *       404:
 *         description: Clase no encontrada
 */
rutas.post('/rifar-proyectos', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  body('claseId').isInt().withMessage('claseId debe ser un número entero')
], controladorGrupos.RifarProyectosAGrupos);

/**
 * @swagger
 * /api/grupos/asignar-estudiantes:
 *   post:
 *     summary: Asignar estudiantes a un grupo
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grupoId
 *               - estudiantesIds
 *             properties:
 *               grupoId:
 *                 type: integer
 *                 description: ID del grupo
 *               estudiantesIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array de IDs de estudiantes
 *     responses:
 *       200:
 *         description: Estudiantes asignados exitosamente
 *       400:
 *         description: Error en la validación
 *       404:
 *         description: Grupo no encontrado
 */
rutas.post('/asignar-estudiantes', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  body('grupoId').isInt().withMessage('grupoId debe ser un número entero'),
  body('estudiantesIds').isArray({ min: 1 }).withMessage('estudiantesIds debe ser un array con al menos un estudiante')
], controladorGrupos.AsignarEstudiantesAGrupo);

/**
 * @swagger
 * /api/grupos/listar:
 *   get:
 *     summary: Listar grupos de una clase con estudiantes y proyectos asignados
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: claseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase
 *     responses:
 *       200:
 *         description: Lista de grupos
 *       400:
 *         description: Parámetros inválidos
 */
rutas.get('/listar', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
  query('claseId').isInt().withMessage('claseId debe ser un número entero')
], controladorGrupos.ListarGruposPorClase);

/**
 * @swagger
 * /api/grupos/eliminar-clase:
 *   delete:
 *     summary: Eliminar todos los grupos de una clase
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: claseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase
 *     responses:
 *       200:
 *         description: Grupos eliminados exitosamente
 *       404:
 *         description: No hay grupos en esta clase
 */
rutas.delete('/eliminar-clase', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  query('claseId').isInt().withMessage('claseId debe ser un número entero')
], controladorGrupos.EliminarGruposDeClase);

module.exports = rutas;
