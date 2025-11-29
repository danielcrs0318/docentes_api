const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorProyectos = require('../controladores/controladorProyectos');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');
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
 * /proyectos/listar:
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
                            

rutas.get('/listar', validarToken, verificarRol(['ADMIN', 'DOCENTE']), controladorProyectos.ListarProyectos);

/* Obtener */
rutas.get('/obtener', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
  query('id').notEmpty().isInt().withMessage('id requerido y debe ser entero')
], controladorProyectos.ObtenerProyecto);

/**
 * @swagger
 * /proyectos/guardar:
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
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  body('nombre').notEmpty().isLength({ min: 2 }).withMessage('nombre obligatorio (min 2 chars)'),
  body('claseId').notEmpty().isInt().withMessage('claseId es obligatorio y debe ser entero'),
  body('fecha_entrega').optional().isISO8601().withMessage('agregue una fecha de entrega válida'),
  body('estado').optional().isIn(['PENDIENTE','EN_CURSO','ENTREGADO','CERRADO']).withMessage('estado inválido'),
  body('estudiantes').optional().isArray().withMessage('estudiantes debe ser un arreglo de ids').bail()
], controladorProyectos.CrearProyecto);

/* Editar */
/**
 * @swagger
 * /proyectos/editar:
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
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  query('id').notEmpty().isInt(),
  body('nombre').notEmpty().isLength({ min: 2 })
], controladorProyectos.ActualizarProyecto);

/* Eliminar */
/**
 * @swagger
 * /proyectos/eliminar:
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
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  query('id').notEmpty().isInt()
], controladorProyectos.EliminarProyecto);

/* Asignar manual */
rutas.post('/asignar', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  body('proyectoId').notEmpty().isInt(),
  body('estudiantes').isArray({ min: 1 }).withMessage('estudiantes debe tener al menos 1 id')
], controladorProyectos.AsignarProyecto);

/* Asignar aleatorio */
/**
 * @swagger
 * /proyectos/asignar-aleatorio:
 *   post:
 *     summary: Asignar aleatoriamente estudiantes a un proyecto
 *     tags: [Proyectos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proyectoId
 *             properties:
 *               proyectoId:
 *                 type: integer
 *                 description: ID del proyecto
 *                 example: 1
 *               cantidad:
 *                 type: integer
 *                 minimum: 1
 *                 description: Cantidad de estudiantes a asignar
 *                 example: 5
 *     responses:
 *       200:
 *         description: Estudiantes asignados exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Proyecto no encontrado o no hay suficientes estudiantes disponibles
 */

rutas.post('/asignar-aleatorio', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  body('proyectoId').notEmpty().isInt(),
  body('cantidad').optional().isInt({ min: 1 })
], controladorProyectos.AsignarAleatorio);


/* Listar por estudiante */
/**swagger
 * @swagger
 * /proyectos/por-estudiante:
 *   get:
 *     summary: Listar proyectos por estudiante
 *     tags: [Proyectos]
 *     parameters:
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del estudiante
 *     responses:
 *       200:
 *         description: Proyectos del estudiante encontrados
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Estudiante no encontrado
 */
rutas.get('/por-estudiante', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
  query('estudianteId').notEmpty().isInt()
], controladorProyectos.ListarPorEstudiante);

/* Estudiantes disponibles para asignar (inscritos en la clase del proyecto) */
/**
 * @swagger
 * /proyectos/estudiantes-disponibles:
 *   get:
 *     summary: Obtener estudiantes disponibles para asignar a un proyecto
 *     description: Retorna solo los estudiantes inscritos en la clase del proyecto
 *     tags: [Proyectos]
 *     parameters:
 *       - in: query
 *         name: proyectoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto
 *     responses:
 *       200:
 *         description: Lista de estudiantes disponibles
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Proyecto no encontrado
 */
rutas.get('/estudiantes-disponibles', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  query('proyectoId').notEmpty().isInt()
], controladorProyectos.EstudiantesDisponibles);

module.exports = rutas;
