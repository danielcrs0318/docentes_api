const { Router } = require('express');
const { body, query, validationResult } = require('express-validator');
const rutas = Router();
const controladorDocentes = require('../controladores/controladorDocentes');

// Middleware de validación personalizado
const validarFiltros = (validaciones) => {
    return async (req, res, next) => {
        await Promise.all(validaciones.map(validacion => validacion.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                msj: 'Errores de validación',
                data: errors.array().map(i => ({
                    atributo: i.path,
                    msg: i.msg
                }))
            });
        }
        next();
    };
};

// Validaciones para filtrar por nombre
const validacionesFiltrarPorNombre = [
    query('nombre')
        .notEmpty()
        .withMessage('El parámetro nombre es obligatorio')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .trim()
        .escape()
];

// Validaciones para filtrar por especialidad
const validacionesFiltrarPorEspecialidad = [
    query('especialidad')
        .notEmpty()
        .withMessage('El parámetro especialidad es obligatorio')
        .isLength({ min: 2, max: 100 })
        .withMessage('La especialidad debe tener entre 2 y 100 caracteres')
        .trim()
        .escape()
];


/**
 * @swagger
 * components:
 *   schemas:
 *     Docente:
 *       type: object
 *       required:
 *         - nombre
 *         - correo
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         correo:
 *           type: string
 *           format: email
 */

rutas.get('/Listar', controladorDocentes.ListarDocentes);

/**
 * @swagger
 * /docentes/Listar:
 *   get:
 *     summary: Obtener lista de docentes
 *     tags: [Docentes]
 *     responses:
 *       200:
 *         description: Lista de docentes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Docente'
 *       500:
 *         description: Error del servidor
 */

rutas.post('/guardar', [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('correo').isEmail().withMessage('El correo debe ser válido')
], controladorDocentes.CrearDocente);

/**
 * @swagger
 * /docentes/guardar:
 *   post:
 *     summary: Crear un nuevo docente
 *     tags: [Docentes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Docente'
 *     responses:
 *       201:
 *         description: Docente creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Docente'
 *       400:
 *         description: Error de validación
 */

rutas.put('/Editar', [
    query('id').notEmpty().withMessage('El ID del docente es obligatorio'),
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('correo').optional().isEmail().withMessage('El correo debe ser válido')
], controladorDocentes.ActualizarDocente);

/**
 * @swagger
 * /docentes/Editar:
 *   put:
 *     summary: Actualizar un docente existente
 *     tags: [Docentes]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del docente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Docente'
 *     responses:
 *       200:
 *         description: Docente actualizado
 *       404:
 *         description: Docente no encontrado
 */

rutas.delete('/Eliminar', [
    query('id').notEmpty().withMessage('El ID del docente es obligatorio')
], controladorDocentes.EliminarDocente);

/**
 * @swagger
 * /docentes/Eliminar:
 *   delete:
 *     summary: Eliminar un docente
 *     tags: [Docentes]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del docente a eliminar
 *     responses:
 *       200:
 *         description: Docente eliminado correctamente
 *       404:
 *         description: Docente no encontrado
 */

/**
 * @swagger
 * /docentes/filtrar-nombre:
 *   get:
 *     summary: Filtrar docentes por nombre o apellido (búsqueda parcial)
 *     description: Busca docentes que coincidan parcialmente con el nombre o apellido proporcionado
 *     tags: [Docentes]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *           example: "María"
 *         description: Nombre o apellido del docente a buscar
 *     responses:
 *       200:
 *         description: Lista de docentes que coinciden con el criterio de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Se encontraron 2 docente(s)"
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
 *                         example: "María García"
 *                       correo:
 *                         type: string
 *                         example: "maria.garcia@universidad.edu"
 *                       especialidad:
 *                         type: string
 *                         example: "Matemáticas"
 *                       estado:
 *                         type: string
 *                         example: "ACTIVO"
 *                       clases:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             codigo:
 *                               type: string
 *                             nombre:
 *                               type: string
 *                             creditos:
 *                               type: integer
 *                             secciones:
 *                               type: array
 *                 count:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: Parámetro nombre no proporcionado o inválido
 *       500:
 *         description: Error interno del servidor
 */


rutas.get('/filtrar-nombre', 
    validarFiltros(validacionesFiltrarPorNombre), 
    controladorDocentes.filtrarDocentesPorNombre
);


module.exports = rutas;
