const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorProyectos = require('../controladores/controladorProyectos');
const { uploadFile } = require('../configuraciones/multer');
const rutas = Router();

/**
 * @swagger
 * tags:
 *   name: Proyectos
 *   description: Rutas para gestión de proyectos
 */

/**
 * @swagger
 * /api/proyectos/listar:
 *   get:
 *     summary: Obtener todos los proyectos
 *     tags: [Proyectos]
 *     responses:
 *       200:
 *         description: Lista de proyectos
 */
rutas.get('/listar', controladorProyectos.ListarProyectos);

rutas.get('/obtener', [
    query('id').notEmpty().isInt().withMessage('id requerido y debe ser entero')
], controladorProyectos.ObtenerProyecto);

rutas.post('/guardar', [
    body('nombre').notEmpty().withMessage('nombre requerido'),
    body('fecha_entrega').optional().isISO8601().withMessage('fecha_entrega debe ser fecha ISO')
], controladorProyectos.CrearProyecto);

rutas.put('/editar', [
    query('id').notEmpty().isInt().withMessage('id requerido'),
    body('nombre').notEmpty().withMessage('nombre requerido')
], controladorProyectos.ActualizarProyecto);

rutas.delete('/eliminar', [
    query('id').notEmpty().isInt().withMessage('id requerido')
], controladorProyectos.EliminarProyecto);

// Asignar manualmente
rutas.post('/asignar', [
    body('proyectoId').notEmpty().isInt(),
    body('estudiantes').isArray().withMessage('estudiantes debe ser arreglo de ids')
], controladorProyectos.AsignarProyecto);

// Asignación aleatoria (tipo rifa)
rutas.post('/asignar-aleatorio', [
    body('proyectoId').notEmpty().isInt(),
    body('cantidad').optional().isInt({ min: 1 })
], controladorProyectos.AsignarAleatorio);

// Subir entrega: multipart/form-data campo 'archivo'
rutas.post('/entregar', uploadFile.single('archivo'), controladorProyectos.SubirEntrega);

// Listar proyectos de un estudiante
rutas.get('/por-estudiante', [
    query('estudianteId').notEmpty().isInt()
], controladorProyectos.ListarPorEstudiante);

module.exports = rutas;
