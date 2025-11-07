const { Router } = require('express');
const { body, param, query } = require('express-validator');
const controladorAsistencias = require('../controladores/controladorAsistencias');

const router = Router();

// Validaciones para asistencia múltiple
const validacionesAsistenciaMultiple = [
    body('fecha').isISO8601().withMessage('Fecha inválida'),
    body('periodoId').isInt().withMessage('ID de periodo inválido'),
    body('parcialId').isInt().withMessage('ID de parcial inválido'),
    body('claseId').optional().isInt().withMessage('ID de clase inválido'),
    body('seccionId').optional().isInt().withMessage('ID de sección inválido'),
    body('estadoPredeterminado').optional().isIn(['PRESENTE', 'AUSENTE', 'TARDANZA']).withMessage('Estado predeterminado inválido'),
    body('estudiantes').optional().isArray().withMessage('El campo estudiantes debe ser un array'),
    body('estudiantes.*.id').optional().isInt().withMessage('ID de estudiante inválido'),
    body('estudiantes.*.estado').optional().isIn(['PRESENTE', 'AUSENTE', 'TARDANZA']).withMessage('Estado inválido'),
    body('estudiantes.*.descripcion').optional().isString().isLength({ max: 255 }).withMessage('Descripción inválida')
];

// Validaciones comunes
const validacionesAsistencia = [
    body('estudianteId').isInt().withMessage('ID de estudiante inválido'),
    body('periodoId').isInt().withMessage('ID de periodo inválido'),
    body('parcialId').isInt().withMessage('ID de parcial inválido'),
    body('claseId').isInt().withMessage('ID de clase inválido'),
    body('fecha').isISO8601().withMessage('Fecha inválida'),
    body('estado').isIn(['PRESENTE', 'AUSENTE', 'TARDANZA']).withMessage('Estado inválido'),
    body('descripcion').optional().isString().isLength({ max: 255 }).withMessage('Descripción inválida')
];

// Rutas CRUD básicas
router.get('/listar', controladorAsistencias.listarAsistencias);

// Ruta para guardar asistencias múltiples
router.post('/guardar-multiple', validacionesAsistenciaMultiple, controladorAsistencias.guardarAsistenciaMultiple);

router.post('/guardar', validacionesAsistencia, controladorAsistencias.guardarAsistencia);

router.put('/editar', [
    query('id').isInt().withMessage('ID inválido'),
    ...validacionesAsistencia
], controladorAsistencias.editarAsistencia);

router.delete('/eliminar', [
    query('id').isInt().withMessage('ID inválido')
], controladorAsistencias.eliminarAsistencia);

// Rutas de filtrado
router.get('/filtrar-fecha', [
    query('fechaInicio').isISO8601().withMessage('Fecha de inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha de fin inválida')
], controladorAsistencias.filtrarPorFecha);

router.get('/filtrar-estado-clase', [
    query('estado').isIn(['PRESENTE', 'AUSENTE', 'TARDANZA']).withMessage('Estado inválido'),
    query('claseId').isInt().withMessage('ID de clase inválido')
], controladorAsistencias.filtrarPorEstadoYClase);

module.exports = router;