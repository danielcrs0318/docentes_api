const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorProyectos = require('../controladores/controladorProyectos');
const rutas = Router();

/* Listar */
rutas.get('/listar', controladorProyectos.ListarProyectos);

/* Obtener */
rutas.get('/obtener', [
  query('id').notEmpty().isInt().withMessage('id requerido y debe ser entero')
], controladorProyectos.ObtenerProyecto);

/* Guardar */
rutas.post('/guardar', [
  body('nombre').notEmpty().isLength({ min: 2 }).withMessage('nombre obligatorio (min 2 chars)'),
  body('fecha_entrega').optional().isISO8601().withMessage('fecha_entrega debe ser ISO'),
  body('estado').optional().isIn(['PENDIENTE','EN_CURSO','ENTREGADO','CERRADO']).withMessage('estado inválido'),
  body('claseId').optional().isInt().withMessage('claseId debe ser entero'),
  body('estudiantes').optional().isArray().withMessage('estudiantes debe ser un arreglo de ids').bail()
], controladorProyectos.CrearProyecto);

/* Editar */
rutas.put('/editar', [
  query('id').notEmpty().isInt(),
  body('nombre').notEmpty().isLength({ min: 2 })
], controladorProyectos.ActualizarProyecto);

/* Eliminar */
rutas.delete('/eliminar', [
  query('id').notEmpty().isInt()
], controladorProyectos.EliminarProyecto);

/* Asignar manual */
rutas.post('/asignar', [
  body('proyectoId').notEmpty().isInt(),
  body('estudiantes').isArray({ min: 1 }).withMessage('estudiantes debe tener al menos 1 id')
], controladorProyectos.AsignarProyecto);

/* Asignar aleatorio */
rutas.post('/asignar-aleatorio', [
  body('proyectoId').notEmpty().isInt(),
  body('cantidad').optional().isInt({ min: 1 })
], controladorProyectos.AsignarAleatorio);

/* Listar por estudiante */
rutas.get('/por-estudiante', [
  query('estudianteId').notEmpty().isInt()
], controladorProyectos.ListarPorEstudiante);

module.exports = rutas;
