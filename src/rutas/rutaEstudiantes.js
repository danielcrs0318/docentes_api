const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorEstudiantes = require('../controladores/controladorEstudiantes');
const { uploadExcel } = require('../configuraciones/multer');
const rutas = Router();
const Estudiantes = require('../modelos/Estudiantes');
const Secciones = require('../modelos/Secciones');
const Clases = require('../modelos/Clases');

/**
 * @swagger
 * components:
 *   schemas:
 *     Estudiante:
 *       type: object
 *       required:
 *         - nombre
 *         - apellido
 *         - correo
 *         - seccionId
 *         - claseId
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del estudiante
 *         nombre:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Nombre del estudiante
 *         apellido:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Apellido del estudiante
 *         correo:
 *           type: string
 *           format: email
 *           description: Correo electrónico único del estudiante
 *         seccionId:
 *           type: integer
 *           description: ID de la sección a la que pertenece
 *         claseId:
 *           type: integer
 *           description: ID de la clase a la que pertenece
 *         estado:
 *           type: string
 *           enum: [ACTIVO, INACTIVO, RETIRADO]
 *           default: ACTIVO
 *           description: Estado del estudiante
 *
 * tags:
 *   name: Estudiantes
 *   description: Rutas para la gestión de estudiantes
 */

/**
 * @swagger
 * /api/estudiantes/listar:
 *   get:
 *     summary: Obtiene la lista de todos los estudiantes
 *     tags: [Estudiantes]
 *     responses:
 *       200:
 *         description: Lista de estudiantes recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Estudiante'
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   description: Mensaje de error
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

// Ruta para obtener todos los estudiantes
rutas.get('/listar',
    controladorEstudiantes.ListarEstudiantes
);

/**
 * @swagger
 * /api/estudiantes/guardar:
 *   post:
 *     summary: Crea un nuevo estudiante
 *     tags: [Estudiantes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - correo
 *               - seccionId
 *               - claseId
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Nombre del estudiante
 *               apellido:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Apellido del estudiante
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único del estudiante
 *               seccionId:
 *                 type: integer
 *                 description: ID de la sección
 *               claseId:
 *                 type: integer
 *                 description: ID de la clase
 *               estado:
 *                 type: string
 *                 enum: [ACTIVO, INACTIVO, RETIRADO]
 *                 default: ACTIVO
 *                 description: Estado del estudiante
 *     responses:
 *       201:
 *         description: Estudiante creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Estudiante'
 *       400:
 *         description: Error en los datos proporcionados
 *       409:
 *         description: Ya existe un estudiante con ese correo
 */

// Ruta para crear un nuevo estudiante
rutas.post('/guardar', [
    body('nombre')
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('apellido')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('El apellido debe tener entre 2 y 100 caracteres'),
    body('correo')
        .notEmpty()
        .withMessage('El correo es obligatorio')
        .isEmail()
        .withMessage('Debe ser un correo electrónico válido'),
    body('seccionId')
        .optional()
        .isInt()
        .withMessage('El ID de sección debe ser un número entero'),
    body('claseId')
        .optional()
        .isInt()
        .withMessage('El ID de clase debe ser un número entero'),
    body('estado')
        .optional()
        .isIn(['ACTIVO', 'INACTIVO', 'RETIRADO'])
        .withMessage('El estado debe ser ACTIVO, INACTIVO o RETIRADO')
], controladorEstudiantes.CrearEstudiante);

/**
 * @swagger
 * /api/estudiantes/editar:
 *   put:
 *     summary: Actualiza un estudiante existente
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del estudiante a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - correo
 *               - seccionId
 *               - claseId
 *               - estado
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Nuevo nombre del estudiante
 *               apellido:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Nuevo apellido del estudiante
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Nuevo correo electrónico
 *               seccionId:
 *                 type: integer
 *                 description: Nuevo ID de la sección
 *               claseId:
 *                 type: integer
 *                 description: Nuevo ID de la clase
 *               estado:
 *                 type: string
 *                 enum: [ACTIVO, INACTIVO, RETIRADO]
 *                 description: Nuevo estado del estudiante
 *     responses:
 *       200:
 *         description: Estudiante actualizado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Estudiante no encontrado
 *       409:
 *         description: Ya existe otro estudiante con ese correo
 */

// Ruta para actualizar un estudiante existente
rutas.put('/editar', [
    query('id')
        .notEmpty()
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero válido'),
    body('nombre')
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('apellido')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('El apellido debe tener entre 2 y 100 caracteres'),
    body('correo')
        .notEmpty()
        .withMessage('El correo es obligatorio')
        .isEmail()
        .withMessage('Debe ser un correo electrónico válido'),
    body('seccionId')
        .optional()
        .isInt()
        .withMessage('El ID de sección debe ser un número entero'),
    body('claseId')
        .optional()
        .isInt()
        .withMessage('El ID de clase debe ser un número entero'),
    body('estado')
        .optional()
        .isIn(['ACTIVO', 'INACTIVO', 'RETIRADO'])
        .withMessage('El estado debe ser ACTIVO, INACTIVO o RETIRADO')
], controladorEstudiantes.ActualizarEstudiante);

/**
 * @swagger
 * /api/estudiantes/eliminar:
 *   delete:
 *     summary: Elimina un estudiante
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del estudiante a eliminar
 *     responses:
 *       200:
 *         description: Estudiante eliminado exitosamente
 *       400:
 *         description: Error en la solicitud
 *       404:
 *         description: Estudiante no encontrado
 */

// Ruta para eliminar un estudiante
rutas.delete('/eliminar', [
    query('id')
        .notEmpty()
        .isInt()
        .withMessage('El ID debe ser un número entero')
], controladorEstudiantes.EliminarEstudiante);

/**
 * @swagger
 * /api/estudiantes/importar-excel:
 *   post:
 *     summary: Importar estudiantes desde un archivo Excel
 *     tags: [Estudiantes]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - excel
 *             properties:
 *               excel:
 *                 type: string
 *                 format: binary
 *                 description: Archivo Excel (.xlsx o .xls) con los datos de estudiantes
 *     responses:
 *       201:
 *         description: Estudiantes importados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 resumen:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     creados:
 *                       type: integer
 *                     errores:
 *                       type: integer
 *       400:
 *         description: Error en el archivo o datos inválidos
 *       500:
 *         description: Error al procesar el archivo
 */
rutas.post('/importar-excel',
    (req, res, next) => {
        console.log('=== DEBUG MULTER ===');
        console.log('Headers:', req.headers);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Body:', req.body);
        next();
    },
    uploadExcel.single('excel'),
    (err, req, res, next) => {
        if (err) {
            console.error('Error en multer:', err);
            return res.status(400).json({
                error: 'Error al procesar el archivo',
                detalle: err.message,
                codigo: err.code,
                ayuda: 'Verifica que en Postman: 1) El campo se llame "excel", 2) El tipo sea "File" (no "Text"), 3) Hayas seleccionado un archivo'
            });
        }
        next();
    },
    controladorEstudiantes.CargarDesdeExcel
);

// Endpoint de prueba para verificar que multer funciona
rutas.post('/test-upload',
    uploadExcel.single('excel'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }
        res.json({
            message: 'Archivo recibido correctamente',
            archivo: {
                nombre: req.file.filename,
                nombreOriginal: req.file.originalname,
                tamaño: req.file.size,
                tipo: req.file.mimetype
            }
        });
    }
);

module.exports = rutas;
