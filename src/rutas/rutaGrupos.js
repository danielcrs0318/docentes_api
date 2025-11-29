const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorGrupos = require('../controladores/controladorGrupos');
const { validarToken } = require('../configuraciones/passport');
const { verificarRol } = require('../configuraciones/autorizacion');

const rutas = Router();

/**
 * @swagger
 * tags:
 *   name: Grupos
 *   description: API para gestionar grupos de proyectos
 */

// Validar cantidad de estudiantes aleatorios
rutas.get('/validar-cantidad', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  query('claseId').isInt().withMessage('claseId debe ser un número entero'),
  query('cantidad').isInt({ min: 1 }).withMessage('cantidad debe ser un número entero mayor a 0')
], controladorGrupos.ValidarCantidadEstudiantes);

// Rifar proyectos y crear grupos
rutas.post('/rifar-proyectos', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  body('claseId').isInt().withMessage('claseId debe ser un número entero')
], controladorGrupos.RifarProyectosAGrupos);

// Asignar estudiantes a un grupo
rutas.post('/asignar-estudiantes', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  body('grupoId').isInt().withMessage('grupoId debe ser un número entero'),
  body('estudiantesIds').isArray({ min: 1 }).withMessage('estudiantesIds debe ser un array con al menos un estudiante')
], controladorGrupos.AsignarEstudiantesAGrupo);

// Listar grupos de una clase
rutas.get('/listar', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
  query('claseId').isInt().withMessage('claseId debe ser un número entero')
], controladorGrupos.ListarGruposPorClase);

// Eliminar todos los grupos de una clase
rutas.delete('/eliminar-clase', [
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  query('claseId').isInt().withMessage('claseId debe ser un número entero')
], controladorGrupos.EliminarGruposDeClase);

module.exports = rutas;
