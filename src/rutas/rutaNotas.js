const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const controladorNotas = require('../controladores/controladorNotas');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');

/**
 * @swagger
 * /notas/obtener:
 *   get:
 *     summary: Obtener notas de estudiantes por clase y periodo
 *     tags: [Notas]
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
 *         name: periodoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo
 *       - in: query
 *         name: parcialId
 *         schema:
 *           type: integer
 *         description: ID del parcial (opcional, si no se envía muestra todos)
 *       - in: query
 *         name: seccionId
 *         schema:
 *           type: integer
 *         description: ID de la sección (opcional)
 *     responses:
 *       200:
 *         description: Notas obtenidas exitosamente
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: Sin permisos
 */
router.get(
    '/obtener',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
    [
        query('claseId').isInt({ min: 1 }).withMessage('claseId debe ser un entero positivo'),
        query('periodoId').isInt({ min: 1 }).withMessage('periodoId debe ser un entero positivo'),
        query('parcialId').optional().isInt({ min: 1 }).withMessage('parcialId debe ser un entero positivo'),
        query('seccionId').optional().isInt({ min: 1 }).withMessage('seccionId debe ser un entero positivo')
    ],
    controladorNotas.ObtenerNotas
);

/**
 * @swagger
 * /notas/mis-notas:
 *   get:
 *     summary: Obtener mis notas (estudiante)
 *     tags: [Notas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodoId
 *         schema:
 *           type: integer
 *         description: ID del periodo (opcional)
 *     responses:
 *       200:
 *         description: Notas obtenidas exitosamente
 *       403:
 *         description: Sin permisos
 */
router.get(
    '/mis-notas',
    validarToken,
    verificarRol(['ESTUDIANTE']),
    [
        query('periodoId').optional().isInt({ min: 1 }).withMessage('periodoId debe ser un entero positivo')
    ],
    controladorNotas.ObtenerMisNotas
);

module.exports = router;
