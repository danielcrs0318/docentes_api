const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorEvaluaciones = require('../controladores/controladorEvaluaciones');
const Evaluaciones = require('../modelos/Evaluaciones');
const EvaluacionesEstudiantes = require('../modelos/EvaluacionesEstudiantes');
const rutas = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Evaluacion:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         titulo:
 *           type: string
 *         notaMaxima:
 *           type: number
 *           format: float
 *         fechaInicio:
 *           type: string
 *           format: date-time
 *         fechaCierre:
 *           type: string
 *           format: date-time
 *         estructura:
 *           type: object
 *         estado:
 *           type: string
 *           enum: [ACTIVO, INACTIVO]
 *         claseId:
 *           type: integer
 *         parcialId:
 *           type: integer
 *         periodoId:
 *           type: integer
 *     AsignacionRequest:
 *       type: object
 *       properties:
 *         claseId:
 *           type: integer
 *         seccionId:
 *           type: integer
 *         estudiantes:
 *           type: array
 *           items:
 *             type: integer
 *     RegistrarNotaRequest:
 *       type: object
 *       properties:
 *         nota:
 *           type: number
 *           format: float
 * tags:
 *   name: Evaluaciones
 *   description: Gestión de evaluaciones
 */

/**
 * @swagger
 * /evaluaciones/listar:
 *   get:
 *     summary: Lista evaluaciones (filtros opcionales por claseId, parcialId, periodoId)
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: claseId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: parcialId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: periodoId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de evaluaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Evaluacion'
 */

/**
 * @swagger
 * /evaluaciones/guardar:
 *   post:
 *     summary: Crea una evaluación y la asigna a estudiantes (por clase, sección o lista)
 *     tags: [Evaluaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - fechaInicio
 *               - fechaCierre
 *               - parcialId
 *               - periodoId
 *             properties:
 *               titulo:
 *                 type: string
 *               notaMaxima:
 *                 type: number
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *               fechaCierre:
 *                 type: string
 *                 format: date-time
 *               estructura:
 *                 type: object
 *               claseId:
 *                 type: integer
 *               seccionId:
 *                 type: integer
 *               estudiantes:
 *                 type: array
 *                 items:
 *                   type: integer
 *               parcialId:
 *                 type: integer
 *               periodoId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Evaluación creada y asignada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 evaluacion:
 *                   $ref: '#/components/schemas/Evaluacion'
 *                 asignadas:
 *                   type: integer
 *       400:
 *         description: Error en datos o parámetros
 */

/**
 * @swagger
 * /evaluaciones/editar:
 *   put:
 *     summary: Edita los datos de una evaluación (id en query)
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *               fechaCierre:
 *                 type: string
 *                 format: date-time
 *               notaMaxima:
 *                 type: number
 *               estructura:
 *                 type: object
 *     responses:
 *       200:
 *         description: Evaluación actualizada
 */

/**
 * @swagger
 * /evaluaciones/eliminar:
 *   delete:
 *     summary: Elimina una evaluación (id en query)
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluación eliminada
 */

/**
 * @swagger
 * /evaluaciones/registrarNota:
 *   post:
 *     summary: Registra la nota de un estudiante para una evaluación
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: evaluacionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrarNotaRequest'
 *     responses:
 *       200:
 *         description: Nota registrada
 *       404:
 *         description: Asignación no encontrada
 */

/**
 * @swagger
 * /evaluaciones/total-parcial:
 *   get:
 *     summary: Obtiene acumulativo, reposicion y total final de un parcial para un estudiante
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: parcialId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Totales calculados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 acumulativo:
 *                   type: number
 *                 reposicion:
 *                   type: number
 *                 final:
 *                   type: number
 */

/**
 * @swagger
 * /evaluaciones/promedio-periodo:
 *   get:
 *     summary: Calcula el promedio de los parciales de un periodo para un estudiante
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: periodoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Promedio y detalle por parcial
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 promedio:
 *                   type: number
 *                 detalles:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /evaluaciones/asignar:
 *   post:
 *     summary: Asigna una evaluación existente a estudiantes (por lista, sección o clase)
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: evaluacionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AsignacionRequest'
 *     responses:
 *       200:
 *         description: Asignación completada
 */

// Listar evaluaciones (opcionalmente filtrar por claseId, parcialId, periodoId)
rutas.get('/listar', controladorEvaluaciones.Listar);

// Crear evaluación y asignar a todos los estudiantes de la clase
rutas.post('/guardar', [
    body('titulo').notEmpty().withMessage('El título es obligatorio'),
    body('fechaInicio').notEmpty().isISO8601().withMessage('Fecha de inicio inválida'),
    body('fechaCierre').notEmpty().isISO8601().withMessage('Fecha de cierre inválida'),
    // Permitir distintos modos de asignación: claseId, seccionId o lista de estudiantes
    body('claseId').isInt().withMessage('claseId inválido'),
    body('seccionId').isInt().withMessage('seccionId inválido'),
    body('estudiantes').isArray().withMessage('estudiantes debe ser un arreglo de IDs'),
    body('estudiantes.*').isInt().withMessage('estudiantes debe contener IDs numéricos'),
    body('parcialId').notEmpty().isInt().withMessage('parcialId inválido'),
    body('periodoId').notEmpty().isInt().withMessage('periodoId inválido'),
    body('estado').notEmpty().isIn(['ACTIVO', 'INACTIVO']).withMessage('estado inválido'),
    body('notaMaxima').isDecimal().withMessage('notaMaxima inválida'),
    body('estructura').isObject().withMessage('estructura debe ser un objeto JSON'),
], controladorEvaluaciones.Guardar);

// Editar evaluación
rutas.put('/editar', [
    query('id').notEmpty().isInt().withMessage('id inválido'),
    body('titulo').optional().notEmpty().withMessage('El título no puede estar vacío'),
    body('fechaInicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
    body('fechaCierre').optional().isISO8601().withMessage('Fecha de cierre inválida'),
    body('notaMaxima').isDecimal().withMessage('notaMaxima inválida'),
    body('estructura').isObject().withMessage('estructura debe ser un objeto JSON'),
    body('claseId').isInt().withMessage('claseId inválido'),
    body('seccionId').isInt().withMessage('seccionId inválido'),
    body('estudiantes').isArray().withMessage('estudiantes debe ser un arreglo de IDs'),
    body('estudiantes.*').isInt().withMessage('estudiantes debe contener IDs numéricos'),
    body('parcialId').isInt().withMessage('parcialId inválido'),
    body('periodoId').isInt().withMessage('periodoId inválido'),
    body('estado').optional().isIn(['ACTIVO', 'INACTIVO']).withMessage('estado inválido'),
], controladorEvaluaciones.Editar);

// Eliminar evaluación
rutas.delete('/eliminar', [
    query('id').notEmpty().isInt().withMessage('id inválido')
], controladorEvaluaciones.Eliminar);

// Registrar nota para estudiante
//ruta POST /registrarNota?evaluacionId=1&estudianteId=2
rutas.post('/registrarNota', [
    query('evaluacionId').notEmpty().isInt(),
    query('estudianteId').notEmpty().isInt(),
    body('nota').notEmpty().isDecimal()
], controladorEvaluaciones.RegistrarNota);

// Obtener total del parcial para un estudiante
// GET /total-parcial?estudianteId=1&parcialId=2
rutas.get('/total-parcial', [
    query('estudianteId').notEmpty().isInt().withMessage('estudianteId inválido'),
    query('parcialId').notEmpty().isInt().withMessage('parcialId inválido'),
], controladorEvaluaciones.GetTotalParcial);

// Obtener promedio de parciales para un estudiante en un periodo
// GET /promedio-periodo?estudianteId=1&periodoId=1
rutas.get('/promedio-periodo', [
    query('estudianteId').notEmpty().isInt().withMessage('estudianteId inválido'),
    query('periodoId').notEmpty().isInt().withMessage('periodoId inválido'),
], controladorEvaluaciones.GetPromedioPorPeriodo);

// Asignar evaluación existente a estudiantes (lista, sección o clase)
rutas.post('/asignar', [
    query('evaluacionId').notEmpty().isInt().withMessage('evaluacionId inválido'),
    body('estudiantes').optional().isArray().withMessage('estudiantes debe ser un arreglo de IDs'),
    body('estudiantes.*').optional().isInt().withMessage('estudiantes debe contener IDs numéricos'),
    body('seccionId').optional().isInt().withMessage('seccionId inválido'),
    body('claseId').optional().isInt().withMessage('claseId inválido')
], controladorEvaluaciones.Asignar);

module.exports = rutas;
