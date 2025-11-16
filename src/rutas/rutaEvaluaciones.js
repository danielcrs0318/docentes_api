const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorEvaluaciones = require('../controladores/controladorEvaluaciones');
const rutas = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Evaluacion:
 *       type: object
 *       required:
 *         - titulo
 *         - peso
 *         - tipo
 *         - fechaInicio
 *         - fechaCierre
 *         - claseId
 *         - parcialId
 *         - periodoId
 *       properties:
 *         id:
 *           type: integer
 *           description: ID autogenerado de la evaluación
 *         titulo:
 *           type: string
 *           maxLength: 200
 *           description: Título o nombre de la evaluación
 *         notaMaxima:
 *           type: number
 *           format: float
 *           description: Nota máxima que se puede obtener en la evaluación
 *         peso:
 *           type: number
 *           format: float
 *           description: Peso relativo de la evaluación dentro del parcial (para promedio ponderado)
 *           default: 1.0
 *         tipo:
 *           type: string
 *           enum: [NORMAL, REPOSICION]
 *           description: Tipo de evaluación (normal o de reposición)
 *           default: NORMAL
 *         fechaInicio:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de inicio de la evaluación
 *         fechaCierre:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de cierre de la evaluación
 *         estructura:
 *           type: object
 *           description: Estructura personalizada de la evaluación (almacenada como JSON)
 *           example:
 *             preguntas:
 *               - enunciado: "Explica el concepto de encapsulación en POO"
 *                 valor: 5
 *               - enunciado: "Define herencia y da un ejemplo"
 *                 valor: 5
 *         estado:
 *           type: string
 *           enum: [ACTIVO, INACTIVO]
 *           description: Estado actual de la evaluación
 *           default: ACTIVO
 *         claseId:
 *           type: integer
 *           description: ID de la clase asociada a la evaluación
 *         parcialId:
 *           type: integer
 *           description: ID del parcial al que pertenece la evaluación
 *         periodoId:
 *           type: integer
 *           description: ID del periodo académico asociado
 *       example:
 *         titulo: "Evaluación Parcial 1 - Programación"
 *         notaMaxima: 100
 *         peso: 1.5
 *         tipo: "NORMAL"
 *         fechaInicio: "2025-11-15T08:00:00Z"
 *         fechaCierre: "2025-11-20T23:59:00Z"
 *         estructura:
 *           preguntas:
 *             - enunciado: "Describa el ciclo de vida del software"
 *               valor: 10
 *             - enunciado: "Implemente una función recursiva en C#"
 *               valor: 10
 *         estado: "ACTIVO"
 *         claseId: 3
 *         parcialId: 2
 *         periodoId: 1
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
 *     summary: Crea una evaluación y la asigna a estudiantes (por claseId, seccionId o lista de IDs)
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
 *               - estado
 *               - notaMaxima
 *               - estructura
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: Examen Unidad 1
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-02-01T08:00:00Z"
 *               fechaCierre:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-02-05T23:59:00Z"
 *               claseId:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 *               seccionId:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *               estudiantes:
 *                 type: array
 *                 description: Lista de IDs de estudiantes (si no se usa claseId o seccionId)
 *                 items:
 *                   type: integer
 *                 example: [10, 11]
 *               parcialId:
 *                 type: integer
 *                 example: 1
 *               periodoId:
 *                 type: integer
 *                 example: 1
 *               estado:
 *                 type: string
 *                 enum: [ACTIVO, INACTIVO]
 *                 example: ACTIVO
 *               notaMaxima:
 *                 type: number
 *                 format: float
 *                 example: 20
 *               estructura:
 *                 type: object
 *                 description: Estructura de la evaluación
 *                 example:
 *                   instrucciones: "Responder todo"
 *                   preguntas: 10
 *     responses:
 *       201:
 *         description: Evaluación creada exitosamente y asignada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 evaluacion:
 *                   type: object
 *                 asignadas:
 *                   type: integer
 *                 mensaje:
 *                   type: string
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
 */


/**
 * @swagger
 * /evaluaciones/editar:
 *   put:
 *     summary: Edita los datos de una evaluación (id en query)
 *     description: >
 *       Actualiza los campos de una evaluación existente.  
 *       Los correos de notificación a los estudiantes asignados se envían **en paralelo**.
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
 *         description: Evaluación actualizada y correos enviados en paralelo.
 *       404:
 *         description: Evaluación no encontrada
 */

/**
 * @swagger
 * /evaluaciones/eliminar:
 *   delete:
 *     summary: Elimina una evaluación (id en query)
 *     description: >
 *       Elimina la evaluación y sus asignaciones.  
 *       Los correos de notificación se envían **en paralelo** a los estudiantes afectados.
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluación eliminada y correos enviados en paralelo
 *       404:
 *         description: Evaluación no encontrada
 */

/**
 * @swagger
 * /evaluaciones/registrarNota:
 *   post:
 *     summary: Registra la nota de un estudiante para una evaluación
 *     description: >
 *       Registra o actualiza la nota de un estudiante y recalcula el total del parcial.  
 *       Envía un correo al estudiante notificando la calificación.
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
 *             type: object
 *             properties:
 *               nota:
 *                 type: number
 *                 example: 85
 *     responses:
 *       200:
 *         description: Nota registrada y correo enviado
 *       400:
 *         description: Nota inválida o fuera de rango
 *       404:
 *         description: Evaluación o estudiante no encontrado
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
 *     summary: Asigna una evaluación existente a estudiantes mediante lista, sección o clase
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: evaluacionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la evaluación que se desea asignar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estudiantes:
 *                 type: array
 *                 description: Lista opcional de IDs de estudiantes a los que se asignará la evaluación
 *                 items:
 *                   type: integer
 *               seccionId:
 *                 type: integer
 *                 description: ID opcional de la sección para asignar la evaluación a todos los estudiantes de esa sección
 *               claseId:
 *                 type: integer
 *                 description: ID opcional de la clase para asignar la evaluación a todos los estudiantes de esa clase
 *             example:
 *               estudiantes: [1, 2, 3]
 *               seccionId: 5
 *               claseId: 10
 *     responses:
 *       200:
 *         description: Asignación completada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Evaluación asignada correctamente"
 *       400:
 *         description: Error en los datos enviados
 *       500:
 *         description: Error interno del servidor
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
