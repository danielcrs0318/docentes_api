const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorProyectos = require('../controladores/controladorProyectos');
const rutas = Router();

/* Listar 
/**
 * @swagger
 * tags:
 *   name: Proyectos
 *   description: Rutas para la gestión de proyectos
 */

/**
 * @swagger
 * /api/proyectos/listar:
 *   get:
 *     summary: Lista todos los proyectos con estudiantes asignados
 *     tags: [Proyectos]
 *     responses:
 *       200:
 *         description: Lista de proyectos recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: ID del proyecto
 *                     example: 1
 *                   nombre:
 *                     type: string
 *                     description: Nombre del proyecto
 *                     example: "Proyecto 1"
 *                   descripcion:
 *                     type: string
 *                     description: Descripción del proyecto
 *                     example: "Descripción del proyecto 1"
 *                   fecha_entrega:
 *                     type: string
 *                     format: date-time
 *                     description: Fecha de entrega del proyecto
 *                     example: "2024-12-31T23:59:59Z"
 *                   estado:
 *                     type: string
 *                     description: Estado del proyecto
 *                     example: "PENDIENTE"
 *                   estudiantes:
 *                     type: array
 *                     description: Lista de estudiantes asignados al proyecto
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           description: ID del estudiante
 *                           example: 1
 *                         nombre:
 *                           type: string
 *                           description: Nombre del estudiante
 *                           example: "Juan"
 *                         apellido:
 *                           type: string
 *                           description: Apellido del estudiante
 *                           example: "Pérez"
 *                         correo:
 *                           type: string
 *                           description: Correo del estudiante
 *                           example: "juan@example.com"
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       atributo:
 *                         type: string
 *                       msj:
 *                         type: string
 */
                            

rutas.get('/listar', controladorProyectos.ListarProyectos);

/* Obtener */
rutas.get('/obtener', [
  query('id').notEmpty().isInt().withMessage('id requerido y debe ser entero')
], controladorProyectos.ObtenerProyecto);

/**
 * @swagger
 * /api/proyectos/guardar:
 *   post:
 *     summary: Crear un nuevo proyecto
 *     tags: [Proyectos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 description: Nombre del proyecto
 *                 example: "Proyecto Final"
 *               fecha_entrega:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha límite de entrega
 *                 example: "2024-12-31T23:59:59Z"
 *               estado:
 *                 type: string
 *                 enum: [PENDIENTE, EN_CURSO, ENTREGADO, CERRADO]
 *                 description: Estado actual del proyecto
 *                 example: "PENDIENTE"
 *               claseId:
 *                 type: integer
 *                 description: ID de la clase asociada
 *                 example: 1
 *               estudiantes:
 *                 type: array
 *                 description: Lista de IDs de estudiantes asignados
 *                 items:
 *                   type: string
 *                 example: ["0321200300147", "0321200300148"]
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       atributo:
 *                         type: string
 *                       msj:
 *                         type: string
 */

/* Guardar */
rutas.post('/guardar', [
  body('nombre').notEmpty().isLength({ min: 2 }).withMessage('nombre obligatorio (min 2 chars)'),
  body('fecha_entrega').optional().isISO8601().withMessage('agregue una fecha de entrega válida'),
  body('estado').optional().isIn(['PENDIENTE','EN_CURSO','ENTREGADO','CERRADO']).withMessage('estado inválido'),
  body('claseId').optional().isInt().withMessage('claseId debe ser entero'),
  body('estudiantes').optional().isArray().withMessage('estudiantes debe ser un arreglo de ids').bail()
], controladorProyectos.CrearProyecto);

/* Editar */
/**
 * @swagger
 * /api/proyectos/editar:
 *   put:
 *     summary: Actualizar un proyecto existente
 *     tags: [Proyectos]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 description: Nuevo nombre del proyecto
 *     responses:
 *       200:
 *         description: Proyecto actualizado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Proyecto no encontrado
 */
rutas.put('/editar', [
  query('id').notEmpty().isInt(),
  body('nombre').notEmpty().isLength({ min: 2 })
], controladorProyectos.ActualizarProyecto);

/* Eliminar */
/**
 * @swagger
 * /api/proyectos/eliminar:
 *   delete:
 *     summary: Eliminar un proyecto
 *     tags: [Proyectos]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto a eliminar
 *     responses:
 *       200:
 *         description: Proyecto eliminado exitosamente
 *       400:
 *         description: Error en la solicitud
 *       404:
 *         description: Proyecto no encontrado
 */

rutas.delete('/eliminar', [
  query('id').notEmpty().isInt()
], controladorProyectos.EliminarProyecto);

/* Asignar manual */
rutas.post('/asignar', [
  body('proyectoId').notEmpty().isInt(),
  body('estudiantes').isArray({ min: 1 }).withMessage('estudiantes debe tener al menos 1 id')
], controladorProyectos.AsignarProyecto);

/* Asignar aleatorio por clase */
/**
 * @swagger
 * /api/proyectos/asignar-aleatorio:
 *   post:
 *     summary: Asignar aleatoriamente estudiantes a proyectos de una misma clase
 *     tags: [Proyectos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Proporcione `proyectoId` (opcional) o `claseId` (opcional). Al menos uno es requerido.
 *             oneOf:
 *               - required: [proyectoId]
 *               - required: [claseId]
 *             properties:
 *               proyectoId:
 *                 type: integer
 *                 description: ID del proyecto cuyo `claseId` será usado para la operación (opcional)
 *                 example: 1
 *               claseId:
 *                 type: integer
 *                 description: ID de la clase cuyos proyectos y estudiantes serán usados (opcional)
 *                 example: 3
 *     responses:
 *       200:
 *         description: Asignaciones realizadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProyectos:
 *                   type: integer
 *                   description: Número total de proyectos en la clase
 *                   example: 5
 *                 totalEstudiantes:
 *                   type: integer
 *                   description: Número total de estudiantes en la clase
 *                   example: 12
 *                 asignaciones:
 *                   type: array
 *                   description: Lista de asignaciones realizadas (proyectoId, estudianteId)
 *                   items:
 *                     type: object
 *                     properties:
 *                       proyectoId:
 *                         type: integer
 *                         example: 2
 *                       estudianteId:
 *                         type: integer
 *                         example: 45
 *       400:
 *         description: Entrada inválida o no hay proyectos/estudiantes en la clase
 *       404:
 *         description: `proyectoId` no encontrado (si se envió)
 */

rutas.post(
  '/asignar-aleatorio',
  [
    body('proyectoId').optional().isInt().withMessage('proyectoId debe ser entero'),
    body('claseId').optional().isInt().withMessage('claseId debe ser entero'),
    body('maxPorProyecto').optional().isInt({ min: 1 }).withMessage('maxPorProyecto debe ser entero >= 1'),
    body().custom(body => {
      if (!body.proyectoId && !body.claseId) {
        throw new Error('Se requiere proyectoId o claseId');
      }
      return true;
    })
  ],
  controladorProyectos.AsignarAleatorio
);

/* Listar por estudiante */
rutas.get('/por-estudiante', [
  query('estudianteId').notEmpty().isInt()
], controladorProyectos.ListarPorEstudiante);

module.exports = rutas;
