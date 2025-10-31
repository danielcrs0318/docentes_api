const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { uploadExcel } = require('../configuraciones/multer');
const controladorEstudiantes = require('../controladores/controladorEstudiantes');

/**
 * @swagger
 * components:
 *   schemas:
 *     Estudiante:
 *       type: object
 *       required:
 *         - nombre
 *         - correo
 *       properties:
 *         id:
 *           type: integer
 *           description: ID autogenerado del estudiante
 *         nombre:
 *           type: string
 *           description: Nombre del estudiante
 *         apellido:
 *           type: string
 *           description: Apellido del estudiante
 *         correo:
 *           type: string
 *           format: email
 *           description: Correo electrónico único del estudiante
 *         seccionId:
 *           type: integer
 *           description: ID de la sección asignada
 *         claseId:
 *           type: integer
 *           description: ID de la clase asignada
 *         estado:
 *           type: string
 *           enum: [ACTIVO, INACTIVO, RETIRADO]
 *           default: ACTIVO
 *           description: Estado del estudiante
 */

/**
 * @swagger
 * /api/estudiantes/listar:
 *   get:
 *     summary: Listar todos los estudiantes
 *     tags: [Estudiantes]
 *     responses:
 *       200:
 *         description: Lista de estudiantes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Estudiante'
 */
router.get('/listar', controladorEstudiantes.ListarEstudiantes);

/**
 * @swagger
 * /api/estudiantes/guardar:
 *   post:
 *     summary: Crear un nuevo estudiante
 *     tags: [Estudiantes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - correo
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan
 *               apellido:
 *                 type: string
 *                 example: Pérez
 *               correo:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@example.com
 *               seccionId:
 *                 type: integer
 *                 example: 1
 *               claseId:
 *                 type: integer
 *                 example: 1
 *               estado:
 *                 type: string
 *                 enum: [ACTIVO, INACTIVO, RETIRADO]
 *                 default: ACTIVO
 *     responses:
 *       201:
 *         description: Estudiante creado exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/guardar', [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('correo').isEmail().withMessage('El correo debe ser válido'),
], controladorEstudiantes.CrearEstudiante);

/**
 * @swagger
 * /api/estudiantes/editar:
 *   put:
 *     summary: Actualizar un estudiante existente
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del estudiante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               correo:
 *                 type: string
 *                 format: email
 *               seccionId:
 *                 type: integer
 *               claseId:
 *                 type: integer
 *               estado:
 *                 type: string
 *                 enum: [ACTIVO, INACTIVO, RETIRADO]
 *     responses:
 *       200:
 *         description: Estudiante actualizado exitosamente
 *       404:
 *         description: Estudiante no encontrado
 */
router.put('/editar', [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('correo').isEmail().withMessage('El correo debe ser válido'),
], controladorEstudiantes.ActualizarEstudiante);

/**
 * @swagger
 * /api/estudiantes/eliminar:
 *   delete:
 *     summary: Eliminar un estudiante
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del estudiante a eliminar
 *     responses:
 *       200:
 *         description: Estudiante eliminado exitosamente
 *       404:
 *         description: Estudiante no encontrado
 */
router.delete('/eliminar', controladorEstudiantes.EliminarEstudiante);

/**
 * @swagger
 * /api/estudiantes/importar-excel:
 *   post:
 *     summary: Importar estudiantes desde archivo Excel
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
 *                 description: Archivo Excel (.xlsx o .xls) con columnas Cuenta, Nombre, Correo a partir de la fila 8
 *     responses:
 *       201:
 *         description: Estudiantes importados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
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
 *                 estudiantesCreados:
 *                   type: array
 *                   items:
 *                     type: object
 *                 erroresValidacion:
 *                   type: array
 *                   items:
 *                     type: object
 *                 erroresGuardado:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Error de validación o archivo inválido
 *       500:
 *         description: Error del servidor
 */
router.post('/importar-excel', 
    uploadExcel.single('excel'), 
    controladorEstudiantes.CargarDesdeExcel
);

module.exports = router;
