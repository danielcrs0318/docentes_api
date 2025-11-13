const { Router } = require('express');
const { query } = require('express-validator');
const controladorAnalisis = require('../controladores/controladorAnalisis');
const { validarToken } = require('../configuraciones/passport');
const rutas = Router();

/**
 * @swagger
 * tags:
 *   name: Análisis
 *   description: Endpoints para análisis estadístico de rendimiento académico
 */

/**
 * @swagger
 * /analisis/parcial:
 *   get:
 *     summary: Análisis estadístico por parcial y clase
 *     description: Retorna estadísticas de rendimiento (promedios, asistencia) de estudiantes en un parcial específico de una clase
 *     tags: [Análisis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parcialId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del parcial a analizar
 *         example: 1
 *       - in: query
 *         name: claseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase
 *         example: 2
 *     responses:
 *       200:
 *         description: Análisis del parcial generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parcial:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     periodo:
 *                       type: object
 *                 clase:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     codigo:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     docente:
 *                       type: object
 *                 estadisticas:
 *                   type: object
 *                   properties:
 *                     promedioGeneral:
 *                       type: number
 *                       format: float
 *                       example: 78.5
 *                     promedioAsistencia:
 *                       type: number
 *                       format: float
 *                       example: 85.2
 *                     porcentajeInasistencias:
 *                       type: number
 *                       format: float
 *                       example: 14.8
 *                     totalEstudiantes:
 *                       type: integer
 *                       example: 25
 *                 detalleEstudiantes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       estudianteId:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       promedioNotas:
 *                         type: number
 *                       asistencias:
 *                         type: integer
 *                       inasistencias:
 *                         type: integer
 *                       porcentajeAsistencia:
 *                         type: number
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado - Token inválido o faltante
 *       403:
 *         description: No tiene permisos para ver esta clase
 *       404:
 *         description: Parcial o clase no encontrada
 *       500:
 *         description: Error del servidor
 */
rutas.get('/parcial', [
  validarToken,
  query('parcialId').notEmpty().isInt().withMessage('parcialId es obligatorio y debe ser entero'),
  query('claseId').notEmpty().isInt().withMessage('claseId es obligatorio y debe ser entero')
], controladorAnalisis.AnalizarParcial);

/**
 * @swagger
 * /analisis/periodo:
 *   get:
 *     summary: Análisis estadístico por periodo y clase
 *     description: Retorna estadísticas acumuladas del periodo completo incluyendo evolución por parciales, asistencia y proyectos
 *     tags: [Análisis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo académico
 *         example: 1
 *       - in: query
 *         name: claseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase
 *         example: 2
 *     responses:
 *       200:
 *         description: Análisis del periodo generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                       example: "IIIP25"
 *                 clase:
 *                   type: object
 *                 estadisticas:
 *                   type: object
 *                   properties:
 *                     promedioAcumulado:
 *                       type: number
 *                       example: 82.1
 *                     porcentajeAsistencia:
 *                       type: number
 *                       example: 87.5
 *                     porcentajeInasistencias:
 *                       type: number
 *                       example: 12.5
 *                     proyectosEntregados:
 *                       type: integer
 *                       example: 18
 *                     proyectosPendientes:
 *                       type: integer
 *                       example: 7
 *                     totalProyectos:
 *                       type: integer
 *                       example: 25
 *                 evolucionPorParcial:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       parcialId:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       promedio:
 *                         type: number
 *                 detalleEstudiantes:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Periodo o clase no encontrada
 *       500:
 *         description: Error del servidor
 */
rutas.get('/periodo', [
  validarToken,
  query('periodoId').notEmpty().isInt().withMessage('periodoId es obligatorio y debe ser entero'),
  query('claseId').notEmpty().isInt().withMessage('claseId es obligatorio y debe ser entero')
], controladorAnalisis.AnalizarPeriodo);

/**
 * @swagger
 * /analisis/reporte/estudiante:
 *   get:
 *     summary: Reporte individual de estudiante
 *     description: Retorna el desempeño del estudiante en todas sus clases del periodo
 *     tags: [Análisis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del estudiante
 *         example: 5
 *       - in: query
 *         name: periodoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo
 *         example: 1
 *     responses:
 *       200:
 *         description: Reporte del estudiante generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 estudiante:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     correo:
 *                       type: string
 *                 periodo:
 *                   type: object
 *                 clases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       claseId:
 *                         type: integer
 *                       codigo:
 *                         type: string
 *                       nombre:
 *                         type: string
 *                       docente:
 *                         type: string
 *                       promedio:
 *                         type: number
 *                       porcentajeAsistencia:
 *                         type: number
 *                       proyectosEntregados:
 *                         type: integer
 *                       proyectosPendientes:
 *                         type: integer
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Estudiante o periodo no encontrado
 *       500:
 *         description: Error del servidor
 */
rutas.get('/reporte/estudiante', [
  validarToken,
  query('estudianteId').notEmpty().isInt().withMessage('estudianteId es obligatorio y debe ser entero'),
  query('periodoId').notEmpty().isInt().withMessage('periodoId es obligatorio y debe ser entero')
], controladorAnalisis.ReporteEstudiante);

/**
 * @swagger
 * /analisis/reporte/clase:
 *   get:
 *     summary: Reporte de clase
 *     description: Retorna estadísticas generales de una clase en un periodo, incluyendo evolución por parciales
 *     tags: [Análisis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: claseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase
 *         example: 2
 *       - in: query
 *         name: periodoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo
 *         example: 1
 *     responses:
 *       200:
 *         description: Reporte de clase generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clase:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     codigo:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     docente:
 *                       type: object
 *                 periodo:
 *                   type: object
 *                 estadisticasPorParcial:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       parcialId:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       promedio:
 *                         type: number
 *                 totalEstudiantes:
 *                   type: integer
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos para ver esta clase
 *       404:
 *         description: Clase o periodo no encontrado
 *       500:
 *         description: Error del servidor
 */
rutas.get('/reporte/clase', [
  validarToken,
  query('claseId').notEmpty().isInt().withMessage('claseId es obligatorio y debe ser entero'),
  query('periodoId').notEmpty().isInt().withMessage('periodoId es obligatorio y debe ser entero')
], controladorAnalisis.ReporteClase);

/**
 * @swagger
 * /analisis/reporte/docente:
 *   get:
 *     summary: Reporte consolidado por docente
 *     description: Retorna estadísticas de todas las clases de un docente en el periodo
 *     tags: [Análisis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: docenteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del docente
 *         example: 3
 *       - in: query
 *         name: periodoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo
 *         example: 1
 *     responses:
 *       200:
 *         description: Reporte del docente generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docente:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     correo:
 *                       type: string
 *                 periodo:
 *                   type: object
 *                 clases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       claseId:
 *                         type: integer
 *                       codigo:
 *                         type: string
 *                       nombre:
 *                         type: string
 *                       totalEstudiantes:
 *                         type: integer
 *                       promedioGeneral:
 *                         type: number
 *                       porcentajeAsistencia:
 *                         type: number
 *                 totalClases:
 *                   type: integer
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos para ver este docente
 *       404:
 *         description: Docente o periodo no encontrado
 *       500:
 *         description: Error del servidor
 */
rutas.get('/reporte/docente', [
  validarToken,
  query('docenteId').notEmpty().isInt().withMessage('docenteId es obligatorio y debe ser entero'),
  query('periodoId').notEmpty().isInt().withMessage('periodoId es obligatorio y debe ser entero')
], controladorAnalisis.ReporteDocente);

module.exports = rutas;
