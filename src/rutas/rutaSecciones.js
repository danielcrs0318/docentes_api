const {Router} = require('express');
const {body, query} = require('express-validator');
const controladorSecciones = require('../controladores/controladorSecciones');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');
const rutas = Router();

// Validaciones para filtrar por nombre
const validarFiltrarPorNombre = [
    query('nombre')
        .notEmpty()
        .withMessage('El parámetro nombre es obligatorio')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .trim()
        .escape()
];

// Validaciones para filtrar por aula y clase
const validarFiltrarPorAulaYClase = [
    query('aulaId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El aulaId debe ser un número entero mayor a 0'),
    query('claseId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El claseId debe ser un número entero mayor a 0')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Seccion:
 *       type: object
 *       required:
 *         - nombre
 *         - aulaId
 *         - claseId
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la sección
 *         nombre:
 *           type: string
 *           description: Nombre de la sección
 *         aulaId:
 *           type: integer
 *           description: ID del aula asignada a la sección
 *         claseId:
 *           type: integer
 *           description: ID de la clase a la que pertenece la sección
 */

/**
 * @swagger
 * /secciones/listar:
 *   get:
 *     summary: Obtiene la lista de todas las secciones
 *     tags: [Secciones]
 *     responses:
 *       200:
 *         description: Lista de secciones recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Seccion'
 *       500:
 *         description: Error del servidor
 */
rutas.get('/listar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    controladorSecciones.ListarSecciones
);

/**
 * @swagger
 * /secciones/guardar:
 *   post:
 *     summary: Crea una nueva sección
 *     tags: [Secciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Seccion'
 *     responses:
 *       201:
 *         description: Sección creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seccion'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       500:
 *         description: Error del servidor
 */
rutas.post('/guardar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('aulaId').isInt().withMessage('El ID de aula debe ser un número entero'),
    body('claseId').isInt().withMessage('El ID de clase debe ser un número entero'),
    controladorSecciones.CrearSeccion
);

/**
 * @swagger
 * /secciones/editar:
 *   put:
 *     summary: Actualiza una sección existente
 *     tags: [Secciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sección a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Seccion'
 *     responses:
 *       200:
 *         description: Sección actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seccion'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       404:
 *         description: Sección no encontrada
 *       500:
 *         description: Error del servidor
 */
rutas.put('/editar',
    validarToken,
    verificarRol(['ADMIN', 'DOCENTE']),
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('aulaId').isInt().withMessage('El ID de aula debe ser un número entero'),
    body('claseId').isInt().withMessage('El ID de clase debe ser un número entero'),
    controladorSecciones.ActualizarSeccion
);

/**
 * @swagger
 * /secciones/eliminar:
 *   delete:
 *     summary: Elimina una sección
 *     tags: [Secciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sección a eliminar
 *     responses:
 *       200:
 *         description: Sección eliminada exitosamente
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Sección no encontrada
 *       500:
 *         description: Error del servidor
 */
rutas.delete('/eliminar',
    validarToken,
    verificarRol(['ADMIN']),
    query('id').isInt().withMessage('El ID debe ser un número entero'),
    controladorSecciones.EliminarSeccion
);

/**
 * @swagger
 * /secciones/filtrar-nombre:
 *   get:
 *     summary: Filtrar secciones por nombre (búsqueda parcial)
 *     description: Busca secciones que coincidan parcialmente con el nombre proporcionado
 *     tags: [Secciones]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *           example: "1401"
 *         description: Nombre o parte del nombre de la sección a buscar
 *     responses:
 *       200:
 *         description: Lista de secciones que coinciden con el criterio de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Se encontraron 3 sección(es)"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Sección A"
 *                       aula:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           nombre:
 *                             type: string
 *                             example: "Aula 101"
 *                       clase:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           nombre:
 *                             type: string
 *                             example: "Matemáticas Avanzadas"
 *                 count:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Parámetro nombre no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Errores de validación"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       atributo:
 *                         type: string
 *                         example: "nombre"
 *                       msg:
 *                         type: string
 *                         example: "El parámetro nombre es obligatorio"
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /secciones/filtrar-aula-clase:
 *   get:
 *     summary: Filtrar secciones por aula y/o clase
 *     description: Busca secciones por aula específica, clase específica o combinación de ambas
 *     tags: [Secciones]
 *     parameters:
 *       - in: query
 *         name: aulaId
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *         description: ID del aula para filtrar
 *       - in: query
 *         name: claseId
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         description: ID de la clase para filtrar
 *     responses:
 *       200:
 *         description: Lista de secciones que coinciden con los criterios especificados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Se encontraron 2 sección(es)"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Sección A"
 *                       aulaId:
 *                         type: integer
 *                         example: 1
 *                       claseId:
 *                         type: integer
 *                         example: 2
 *                       aula:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                           capacidad:
 *                             type: integer
 *                       clase:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                           codigo:
 *                             type: string
 *                           creditos:
 *                             type: integer
 *                           docente:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               nombre:
 *                                 type: string
 *                               correo:
 *                                 type: string
 *                 count:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: Parámetros inválidos o faltantes
 *       500:
 *         description: Error interno del servidor
 */

rutas.get('/filtrar-nombre', validarToken, verificarRol(['ADMIN', 'DOCENTE']), validarFiltrarPorNombre, controladorSecciones.filtrarSeccionesPorNombre);
rutas.get('/filtrar-aula-clase', validarToken, verificarRol(['ADMIN', 'DOCENTE']), validarFiltrarPorAulaYClase, controladorSecciones.filtrarSeccionesPorAulaYClase);

module.exports = rutas;