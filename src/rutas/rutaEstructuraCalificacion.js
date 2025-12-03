const { Router } = require('express');
const rutas = Router();
const controlador = require('../controladores/controladorEstructuraCalificacion');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');
const { body, query } = require('express-validator');

/**
 * @swagger
 * /estructura-calificacion/listar:
 *   get:
 *     summary: Listar estructuras de calificación (filtros opcionales)
 *     tags: [Estructura Calificación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parcialId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: claseId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: docenteId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de estructuras
 */
rutas.get('/listar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
    controlador.Listar
);

/**
 * @swagger
 * /estructura-calificacion/obtener:
 *   get:
 *     summary: Obtener una estructura específica por ID
 */
rutas.get('/obtener',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
    query('id').isInt({ min: 1 }).withMessage('ID debe ser un entero positivo'),
    controlador.Obtener
);

/**
 * @swagger
 * /estructura-calificacion/por-parcial-clase:
 *   get:
 *     summary: Obtener estructura por parcial y clase (para calificar)
 */
rutas.get('/por-parcial-clase',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
    query('parcialId').isInt({ min: 1 }).withMessage('parcialId debe ser un entero positivo'),
    query('claseId').isInt({ min: 1 }).withMessage('claseId debe ser un entero positivo'),
    controlador.ObtenerPorParcialYClase
);

/**
 * @swagger
 * /estructura-calificacion/guardar:
 *   post:
 *     summary: Crear una nueva estructura de calificación
 */
rutas.post('/guardar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    [
        body('parcialId').isInt({ min: 1 }).withMessage('parcialId debe ser un entero positivo'),
        body('claseId').isInt({ min: 1 }).withMessage('claseId debe ser un entero positivo'),
        body('pesoAcumulativo').isFloat({ min: 0, max: 100 }).withMessage('pesoAcumulativo debe estar entre 0 y 100'),
        body('pesoExamen').isFloat({ min: 0, max: 100 }).withMessage('pesoExamen debe estar entre 0 y 100'),
        body('pesoReposicion').optional().isFloat({ min: 0, max: 100 }).withMessage('pesoReposicion debe estar entre 0 y 100'),
        body('notaMaximaParcial').optional().isFloat({ min: 0, max: 100 }).withMessage('notaMaximaParcial debe estar entre 0 y 100'),
        body('notaMinimaAprobacion').optional().isFloat({ min: 0, max: 100 }).withMessage('notaMinimaAprobacion debe estar entre 0 y 100'),
    ],
    controlador.Guardar
);

/**
 * @swagger
 * /estructura-calificacion/editar:
 *   put:
 *     summary: Editar una estructura de calificación existente
 */
rutas.put('/editar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    [
        query('id').isInt({ min: 1 }).withMessage('ID debe ser un entero positivo'),
        body('pesoAcumulativo').optional().isFloat({ min: 0, max: 100 }),
        body('pesoExamen').optional().isFloat({ min: 0, max: 100 }),
        body('pesoReposicion').optional().isFloat({ min: 0, max: 100 }),
        body('notaMaximaParcial').optional().isFloat({ min: 0, max: 100 }),
        body('notaMinimaAprobacion').optional().isFloat({ min: 0, max: 100 }),
        body('estado').optional().isIn(['ACTIVO', 'INACTIVO']),
    ],
    controlador.Editar
);

/**
 * @swagger
 * /estructura-calificacion/eliminar:
 *   delete:
 *     summary: Eliminar una estructura de calificación
 */
rutas.delete('/eliminar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    query('id').isInt({ min: 1 }).withMessage('ID debe ser un entero positivo'),
    controlador.Eliminar
);

module.exports = rutas;
