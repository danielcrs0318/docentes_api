const { Router } = require('express');
const { body, param, query } = require('express-validator');
const controladorAsistencias = require('../controladores/controladorAsistencias');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');
const { uploadImagenExcusa } = require('../configuraciones/archivos');
const { registrarAuditoria } = require('../configuraciones/middlewareAuditoria');

/**
 * @swagger
 * tags:
 *   name: Asistencias
 *   description: API para gestionar asistencias
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Asistencia:
 *       type: object
 *       required:
 *         - estudianteId
 *         - periodoId
 *         - parcialId
 *         - claseId
 *         - fecha
 *         - estado
 *       properties:
 *         id:
 *           type: integer
 *           description: ID autogenerado de la asistencia
 *         estudianteId:
 *           type: integer
 *           description: ID del estudiante
 *         periodoId:
 *           type: integer
 *           description: ID del periodo
 *         parcialId:
 *           type: integer
 *           description: ID del parcial
 *         claseId:
 *           type: integer
 *           description: ID de la clase
 *         fecha:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la asistencia
 *         estado:
 *           type: string
 *           enum: [PRESENTE, AUSENTE, TARDANZA]
 *           description: Estado de la asistencia
 *         descripcion:
 *           type: string
 *           description: Descripción opcional
 */

const router = Router();

// Validaciones para asistencia múltiple
const validacionesAsistenciaMultiple = [
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    body('claseId').isInt().withMessage('ID de clase requerido para calcular periodo/parcial'),
    body('seccionId').optional().isInt().withMessage('ID de sección inválido'),
    body('estadoPredeterminado').optional().isIn(['PRESENTE', 'AUSENTE', 'TARDANZA', 'EXCUSA']).withMessage('Estado predeterminado inválido'),
    body('estudiantes').optional().isArray().withMessage('El campo estudiantes debe ser un array'),
    body('estudiantes.*.id').optional().isInt().withMessage('ID de estudiante inválido'),
    body('estudiantes.*.estado').optional().isIn(['PRESENTE', 'AUSENTE', 'TARDANZA', 'EXCUSA']).withMessage('Estado inválido'),
    body('estudiantes.*.descripcion').optional().isString().isLength({ max: 255 }).withMessage('Descripción inválida')
];

// Validaciones comunes
const validacionesAsistencia = [
    body('estudianteId').isInt().withMessage('ID de estudiante inválido'),
    body('claseId').isInt().withMessage('ID de clase inválido'),
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    body('estado').isIn(['PRESENTE', 'AUSENTE', 'TARDANZA', 'EXCUSA']).withMessage('Estado inválido'),
    body('descripcion').optional().isString().isLength({ max: 255 }).withMessage('Descripción inválida')
];

/**
 * @swagger
 * /asistencias/listar:
 *   get:
 *     summary: Lista todas las asistencias
 *     tags: [Asistencias]
 *     responses:
 *       200:
 *         description: Lista de asistencias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asistencia'
 *       500:
 *         description: Error del servidor
 */
router.get('/listar', validarToken, verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']), controladorAsistencias.listarAsistencias);

/**
 * @swagger
 * /asistencias/guardar-multiple:
 *   post:
 *     summary: Guarda asistencias para múltiples estudiantes
 *     tags: [Asistencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fecha
 *               - periodoId
 *               - parcialId
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date-time
 *               claseId:
 *                 type: integer
 *               seccionId:
 *                 type: integer
 *               periodoId:
 *                 type: integer
 *               parcialId:
 *                 type: integer
 *               estadoPredeterminado:
 *                 type: string
 *                 enum: [PRESENTE, AUSENTE, TARDANZA]
 *               estudiantes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     estado:
 *                       type: string
 *                       enum: [PRESENTE, AUSENTE, TARDANZA]
 *                     descripcion:
 *                       type: string
 *     responses:
 *       201:
 *         description: Asistencias creadas correctamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
// Ruta para guardar asistencias múltiples
router.post('/guardar-multiple', 
    validarToken, 
    verificarRol(['ADMIN', 'DOCENTE']), 
    validacionesAsistenciaMultiple, 
    registrarAuditoria('CREAR', 'Asistencias', {
        obtenerIdDe: 'data',
        descripcion: (req, data) => `Registró asistencia múltiple para clase ${req.body.claseId} - ${req.body.fecha}`,
        incluirDatosNuevos: false
    }),
    controladorAsistencias.guardarAsistenciaMultiple
);

/**
 * @swagger
 * /asistencias/guardar:
 *   post:
 *     summary: Guarda una asistencia individual
 *     tags: [Asistencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Asistencia'
 *     responses:
 *       201:
 *         description: Asistencia creada correctamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
router.post('/guardar', 
    validarToken, 
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']), 
    uploadImagenExcusa, 
    validacionesAsistencia, 
    registrarAuditoria('CREAR', 'Asistencias', {
        obtenerIdDe: 'data',
        descripcion: (req, data) => `Registró asistencia estudiante ${req.body.estudianteId} - ${req.body.estado}`,
        incluirDatosNuevos: false
    }),
    controladorAsistencias.guardarAsistencia
);

/**
 * @swagger
 * /asistencias/editar:
 *   put:
 *     summary: Actualiza una asistencia existente
 *     tags: [Asistencias]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la asistencia a editar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Asistencia'
 *     responses:
 *       200:
 *         description: Asistencia actualizada correctamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Asistencia no encontrada
 *       500:
 *         description: Error del servidor
 */
router.put('/editar', [
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    uploadImagenExcusa,
    query('id').isInt().withMessage('ID inválido'),
    body('estudianteId').optional().isInt().withMessage('ID de estudiante inválido'),
    body('periodoId').optional().isInt().withMessage('ID de periodo inválido'),
    body('parcialId').optional().isInt().withMessage('ID de parcial inválido'),
    body('claseId').optional().isInt().withMessage('ID de clase inválido'),
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
    body('estado').optional().isIn(['PRESENTE', 'AUSENTE', 'TARDANZA', 'EXCUSA']).withMessage('Estado inválido'),
    body('descripcion').optional().isString().isLength({ max: 255 }).withMessage('Descripción inválida')
], controladorAsistencias.editarAsistencia);

/**
 * @swagger
 * /asistencias/eliminar:
 *   delete:
 *     summary: Elimina una asistencia
 *     tags: [Asistencias]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la asistencia a eliminar
 *     responses:
 *       200:
 *         description: Asistencia eliminada correctamente
 *       404:
 *         description: Asistencia no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/eliminar', [
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    query('id').isInt().withMessage('ID inválido')
], controladorAsistencias.eliminarAsistencia);

// Rutas de filtrado
/**
 * @swagger
 * /asistencias/filtrar-fecha:
 *   get:
 *     summary: Filtra asistencias por rango de fechas
 *     tags: [Asistencias]
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Fecha inicial (ISO 8601)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Fecha final (ISO 8601)
 *     responses:
 *       200:
 *         description: Lista de asistencias en el rango de fechas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asistencia'
 *       400:
 *         description: Formato de fecha inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/filtrar-fecha', [
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    query('fechaInicio').isISO8601().withMessage('Fecha de inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha de fin inválida')
], controladorAsistencias.filtrarPorFecha);

/**
 * @swagger
 * /asistencias/filtrar-estado-clase:
 *   get:
 *     summary: Filtra asistencias por estado y clase
 *     tags: [Asistencias]
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PRESENTE, AUSENTE, TARDANZA]
 *         required: true
 *         description: Estado de la asistencia
 *       - in: query
 *         name: claseId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la clase
 *     responses:
 *       200:
 *         description: Lista de asistencias filtradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asistencia'
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error del servidor
 */
router.get('/filtrar-estado-clase', [
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    query('estado').isIn(['PRESENTE', 'AUSENTE', 'TARDANZA']).withMessage('Estado inválido'),
    query('claseId').isInt().withMessage('ID de clase inválido')
], controladorAsistencias.filtrarPorEstadoYClase);

/**
 * @swagger
 * /asistencias/calcular-asistencia-perfecta:
 *   get:
 *     summary: Calcula la asistencia perfecta para una clase y parcial
 *     description: |
 *       Calcula estadísticas de asistencia considerando:
 *       - Clases de 3 créditos -> 16 asistencias (4 días × 4 semanas)
 *       - Clases de 4 créditos -> 20 asistencias (5 días × 4 semanas)
 *     tags: [Asistencias]
 *     parameters:
 *       - in: query
 *         name: claseId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la clase
 *       - in: query
 *         name: parcialId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del parcial
 *     responses:
 *       200:
 *         description: Estadísticas de asistencia perfecta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clase:
 *                   type: string
 *                 creditos:
 *                   type: integer
 *                   enum: [3, 4]
 *                 diasPorSemana:
 *                   type: integer
 *                 semanasEnParcial:
 *                   type: integer
 *                 totalAsistenciasEsperadas:
 *                   type: integer
 *                 estudiantes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       estudiante:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                           apellido:
 *                             type: string
 *                           correo:
 *                             type: string
 *                       totalAsistencias:
 *                         type: integer
 *                       asistenciasEsperadas:
 *                         type: integer
 *                       porcentajeAsistencia:
 *                         type: string
 *                       asistenciaPerfecta:
 *                         type: boolean
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Clase no encontrada
 *       500:
 *         description: Error del servidor
 */
// Calcular asistencia perfecta
router.get('/calcular-asistencia-perfecta', [
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    query('claseId').isInt().withMessage('ID de clase inválido'),
    query('parcialId').isInt().withMessage('ID de parcial inválido')
], controladorAsistencias.calcularAsistenciaPerfecta);

module.exports = router;