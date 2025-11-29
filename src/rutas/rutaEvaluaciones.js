const { Router } = require('express');
const { body, query } = require('express-validator');
const controladorEvaluaciones = require('../controladores/controladorEvaluaciones');
const rutas = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Evaluacion:
 *       type: object
 *       required:
 *         - titulo
 *         - peso
 *         - tipo
 *         - fechaInicio
 *         - fechaCierre
 *         - claseId
 *         - parcialId
 *         - periodoId
 *       properties:
 *         id:
 *           type: integer
 *           description: ID autogenerado de la evaluación
 *         titulo:
 *           type: string
 *           maxLength: 200
 *           description: Título o nombre de la evaluación
 *         notaMaxima:
 *           type: number
 *           format: float
 *           description: Nota máxima que se puede obtener en la evaluación
 *         peso:
 *           type: number
 *           format: float
 *           description: Peso relativo de la evaluación dentro del parcial (para promedio ponderado)
 *           default: 1.0
 *         tipo:
 *           type: string
 *           enum: [NORMAL, REPOSICION]
 *           description: Tipo de evaluación (normal o de reposición)
 *           default: NORMAL
 *         fechaInicio:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de inicio de la evaluación
 *         fechaCierre:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de cierre de la evaluación
 *         estructura:
 *           type: object
 *           description: Estructura personalizada de la evaluación (almacenada como JSON)
 *           example:
 *             preguntas:
 *               - enunciado: "Explica el concepto de encapsulación en POO"
 *                 valor: 5
 *               - enunciado: "Define herencia y da un ejemplo"
 *                 valor: 5
 *         estado:
 *           type: string
 *           enum: [ACTIVO, INACTIVO]
 *           description: Estado actual de la evaluación
 *           default: ACTIVO
 *         claseId:
 *           type: integer
 *           description: ID de la clase asociada a la evaluación
 *         parcialId:
 *           type: integer
 *           description: ID del parcial al que pertenece la evaluación
 *         periodoId:
 *           type: integer
 *           description: ID del periodo académico asociado
 *       example:
 *         titulo: "Evaluación Parcial 1 - Programación"
 *         notaMaxima: 100
 *         peso: 1.5
 *         tipo: "NORMAL"
 *         fechaInicio: "2025-11-25T08:00:00Z"
 *         fechaCierre: "2025-11-30T23:59:00Z"
 *         estructura:
 *           preguntas:
 *             - enunciado: "Describa el ciclo de vida del software"
 *               valor: 10
 *             - enunciado: "Implemente una función recursiva en C#"
 *               valor: 10
 *         estado: "ACTIVO"
 *         claseId: 3
 *         parcialId: 1
 *         periodoId: 4
 */

/**
 * @swagger
 * /evaluaciones/listar:
 *   get:
 *     summary: Lista evaluaciones (filtros opcionales por claseId, parcialId, periodoId)
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: claseId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: parcialId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: periodoId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de evaluaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Evaluacion'
 */

/**
 * @swagger
 * /evaluaciones/guardar:
 *   post:
 *     summary: Crea una evaluación con asignación opcional de estudiantes
 *     description: >
 *       Crea una nueva evaluación. La asignación de estudiantes es **opcional** y puede hacerse en dos momentos:
 *       
 *       **Opción 1:** Crear evaluación SIN asignar estudiantes (asignación posterior con `/asignar`)
 *       - Solo proporciona los datos básicos de la evaluación
 *       - Útil cuando aún no se define a qué estudiantes asignar
 *       
 *       **Opción 2:** Crear evaluación Y asignar estudiantes inmediatamente
 *       - Proporciona `claseId` Y `seccionId` para asignar a todos los inscritos
 *       - O proporciona una lista de `estudiantes` específicos
 *       - Valida inscripciones mediante la tabla EstudiantesClases
 *       - Envía correos automáticamente a los estudiantes asignados
 *     tags: [Evaluaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - fechaInicio
 *               - fechaCierre
 *               - parcialId
 *               - periodoId
 *               - estado
 *               - notaMaxima
 *               - estructura
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: "Examen Parcial 1 - Programación Orientada a Objetos"
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-25T08:00:00Z"
 *               fechaCierre:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-30T23:59:00Z"
 *               claseId:
 *                 type: integer
 *                 nullable: true
 *                 description: |-
 *                   (OPCIONAL) ID de la clase. Si se proporciona, debe usarse junto con seccionId.
 *                   Si no se proporciona, la evaluación se crea sin asignar estudiantes.
 *                 example: 3
 *               seccionId:
 *                 type: integer
 *                 nullable: true
 *                 description: |-
 *                   (OPCIONAL) ID de la sección. Si se proporciona, debe usarse junto con claseId.
 *                   Si no se proporciona, la evaluación se crea sin asignar estudiantes.
 *                 example: 2
 *               estudiantes:
 *                 type: array
 *                 nullable: true
 *                 description: |-
 *                   (OPCIONAL) Lista de IDs de estudiantes específicos.
 *                   Si se proporciona con claseId/seccionId, se valida la inscripción.
 *                   Si no se proporciona, la evaluación se crea sin asignar estudiantes.
 *                 items:
 *                   type: integer
 *                 example: [15, 22, 38, 41]
 *               parcialId:
 *                 type: integer
 *                 example: 1
 *               periodoId:
 *                 type: integer
 *                 example: 4
 *               estado:
 *                 type: string
 *                 enum: [ACTIVO, INACTIVO]
 *                 example: "ACTIVO"
 *               notaMaxima:
 *                 type: number
 *                 format: float
 *                 example: 100
 *               peso:
 *                 type: number
 *                 format: float
 *                 example: 1.5
 *               tipo:
 *                 type: string
 *                 enum: [NORMAL, REPOSICION, EXAMEN]
 *                 example: "NORMAL"
 *               estructura:
 *                 type: object
 *                 description: Estructura personalizada de la evaluación
 *                 example:
 *                   instrucciones: "Responder todas las preguntas con claridad"
 *                   preguntas: 15
 *                   tiempoLimite: "120 minutos"
 *           examples:
 *             crearSinAsignar:
 *               summary: Crear evaluación sin asignar estudiantes
 *               description: Crea la evaluación sin asignar a ningún estudiante. Se puede asignar después con /asignar
 *               value:
 *                 titulo: "Examen Parcial 1 - Programación Orientada a Objetos"
 *                 fechaInicio: "2025-11-25T08:00:00Z"
 *                 fechaCierre: "2025-11-30T23:59:00Z"
 *                 parcialId: 1
 *                 periodoId: 4
 *                 estado: "ACTIVO"
 *                 notaMaxima: 100
 *                 tipo: "EXAMEN"
 *                 estructura:
 *                   instrucciones: "Responder con claridad"
 *                   preguntas: 10
 *             crearYAsignarPorClaseSeccion:
 *               summary: Crear y asignar por clase y sección
 *               description: Crea la evaluación y la asigna inmediatamente a todos los estudiantes de clase 3, sección 2
 *               value:
 *                 titulo: "Quiz 1 - POO"
 *                 fechaInicio: "2025-11-25T08:00:00Z"
 *                 fechaCierre: "2025-11-30T23:59:00Z"
 *                 claseId: 3
 *                 seccionId: 2
 *                 parcialId: 1
 *                 periodoId: 4
 *                 estado: "ACTIVO"
 *                 notaMaxima: 100
 *                 tipo: "NORMAL"
 *                 estructura: {}
 *             crearYAsignarEstudiantesEspecificos:
 *               summary: Crear y asignar a estudiantes específicos
 *               description: Crea la evaluación y la asigna a estudiantes específicos validando inscripción
 *               value:
 *                 titulo: "Taller Práctico 1"
 *                 fechaInicio: "2025-11-25T08:00:00Z"
 *                 fechaCierre: "2025-11-30T23:59:00Z"
 *                 estudiantes: [15, 22, 38]
 *                 claseId: 3
 *                 seccionId: 2
 *                 parcialId: 1
 *                 periodoId: 4
 *                 estado: "ACTIVO"
 *                 notaMaxima: 100
 *                 tipo: "REPOSICION"
 *                 estructura: {}
 *     responses:
 *       201:
 *         description: Evaluación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 evaluacion:
 *                   type: object
 *                 asignadas:
 *                   type: integer
 *                 mensaje:
 *                   type: string
 *             examples:
 *               creadaSinAsignar:
 *                 summary: Evaluación creada sin asignar estudiantes
 *                 value:
 *                   evaluacion:
 *                     id: 15
 *                     titulo: "Examen Parcial 1 - POO"
 *                     notaMaxima: 100
 *                   asignadas: 0
 *                   mensaje: "Evaluación creada exitosamente. Puede asignar estudiantes posteriormente usando el endpoint /asignar"
 *               creadaYAsignada:
 *                 summary: Evaluación creada y asignada
 *                 value:
 *                   evaluacion:
 *                     id: 16
 *                     titulo: "Quiz 1 - POO"
 *                     notaMaxima: 100
 *                   asignadas: 28
 *                   mensaje: "Evaluación creada (envío de correos en proceso)"
 *       400:
 *         description: Error en los datos enviados o estudiantes no inscritos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                 estudiantesNoInscritos:
 *                   type: array
 *                   items:
 *                     type: integer
 *       500:
 *         description: Error interno del servidor
 */


/**
 * @swagger
 * /evaluaciones/editar:
 *   put:
 *     summary: Edita los datos de una evaluación (id en query)
 *     description: >
 *       Actualiza los campos de una evaluación existente.  
 *       Los correos de notificación a los estudiantes asignados se envían **en paralelo**.
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               fechaInicio:
 *                 type: string
 *                 format: date-time
 *               fechaCierre:
 *                 type: string
 *                 format: date-time
 *               notaMaxima:
 *                 type: number
 *               estructura:
 *                 type: object
 *     responses:
 *       200:
 *         description: Evaluación actualizada y correos enviados en paralelo.
 *       404:
 *         description: Evaluación no encontrada
 */

/**
 * @swagger
 * /evaluaciones/eliminar:
 *   delete:
 *     summary: Elimina una evaluación (id en query)
 *     description: >
 *       Elimina la evaluación y sus asignaciones.  
 *       Los correos de notificación se envían **en paralelo** a los estudiantes afectados.
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluación eliminada y correos enviados en paralelo
 *       404:
 *         description: Evaluación no encontrada
 */

/**
 * @swagger
 * /evaluaciones/registrarNota:
 *   post:
 *     summary: Registra la nota de un estudiante para una evaluación (requiere claseId y seccionId)
 *     description: >
 *       Registra o actualiza la nota de un estudiante y recalcula el total del parcial.
 *       Valida que el estudiante esté inscrito en la clase y sección mediante EstudiantesClases.
 *       Envía un correo al estudiante notificando la calificación.
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: evaluacionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 22
 *       - in: query
 *         name: claseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase donde está inscrito el estudiante
 *         example: 3
 *       - in: query
 *         name: seccionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sección donde está inscrito el estudiante
 *         example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nota:
 *                 type: number
 *                 example: 87.5
 *     responses:
 *       200:
 *         description: Nota registrada y correo enviado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Nota registrada (correo enviándose en segundo plano)"
 *                 registro:
 *                   type: object
 *                 totalParcial:
 *                   type: object
 *                   properties:
 *                     acumulativo:
 *                       type: number
 *                     reposicion:
 *                       type: number
 *                     final:
 *                       type: number
 *       400:
 *         description: Nota inválida, fuera de rango, o estudiante no inscrito en clase/sección
 *       404:
 *         description: Evaluación o estudiante no encontrado
 */


/**
 * @swagger
 * /evaluaciones/total-parcial:
 *   get:
 *     summary: Obtiene acumulativo, reposicion y total final de un parcial para un estudiante
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: parcialId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Totales calculados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 acumulativo:
 *                   type: number
 *                 reposicion:
 *                   type: number
 *                 final:
 *                   type: number
 */

/**
 * @swagger
 * /evaluaciones/promedio-periodo:
 *   get:
 *     summary: Calcula el promedio de los parciales de un periodo para un estudiante
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: periodoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Promedio y detalle por parcial
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 promedio:
 *                   type: number
 *                 detalles:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /evaluaciones/asignar:
 *   post:
 *     summary: Asigna una evaluación existente a estudiantes con envío de correos
 *     description: >
 *       Asigna una evaluación ya creada a estudiantes y les envía correos de notificación.
 *       Utiliza la tabla EstudiantesClases para validar que los estudiantes estén inscritos correctamente.
 *       
 *       **OPCIONES DE ASIGNACIÓN:**
 *       - **Opción 1:** Proporciona `claseId` Y `seccionId` para asignar a todos los estudiantes inscritos en esa clase y sección
 *       - **Opción 2:** Proporciona una lista de `estudiantes` (IDs) junto con `claseId` Y `seccionId` para asignar solo a esos estudiantes específicos (validando su inscripción)
 *       - **Opción 3:** Proporciona solo una lista de `estudiantes` (IDs) sin validación de inscripción
 *       
 *       **IMPORTANTE:** La opción de asignar solo por clase ha sido eliminada. Ahora se requiere especificar clase Y sección juntas.
 *       
 *       Después de la asignación, se envían correos electrónicos automáticamente a todos los estudiantes asignados.
 *     tags: [Evaluaciones]
 *     parameters:
 *       - in: query
 *         name: evaluacionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la evaluación que se desea asignar
 *         example: 8
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estudiantes:
 *                 type: array
 *                 description: |-
 *                   Lista opcional de IDs de estudiantes específicos.
 *                   Si se proporciona junto con claseId Y seccionId, se validará que estén inscritos.
 *                   Si se proporciona sin clase/sección, se asignarán sin validación.
 *                 items:
 *                   type: integer
 *                 example: [12, 25, 33]
 *               seccionId:
 *                 type: integer
 *                 description: |-
 *                   ID de la sección. DEBE usarse junto con claseId.
 *                   Filtra estudiantes inscritos en esa sección mediante EstudiantesClases.
 *                 example: 2
 *               claseId:
 *                 type: integer
 *                 description: |-
 *                   ID de la clase. DEBE usarse junto con seccionId.
 *                   Filtra estudiantes inscritos en esa clase mediante EstudiantesClases.
 *                 example: 3
 *           examples:
 *             asignarPorClaseYSeccion:
 *               summary: Asignar a toda una clase y sección
 *               description: Asigna la evaluación a todos los estudiantes inscritos en clase 3, sección 2 y les envía correos
 *               value:
 *                 claseId: 3
 *                 seccionId: 2
 *             asignarEstudiantesConValidacion:
 *               summary: Asignar estudiantes específicos con validación
 *               description: Asigna a estudiantes específicos validando su inscripción en clase 3, sección 2 y les envía correos
 *               value:
 *                 estudiantes: [12, 25, 33]
 *                 claseId: 3
 *                 seccionId: 2
 *             asignarEstudiantesSinValidacion:
 *               summary: Asignar estudiantes específicos sin validación
 *               description: Asigna a estudiantes específicos sin validar inscripción y les envía correos
 *               value:
 *                 estudiantes: [12, 25, 33]
 *     responses:
 *       200:
 *         description: Asignación completada correctamente y correos enviándose
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Asignación completada (envío de correos en proceso)"
 *                 asignadas:
 *                   type: integer
 *                   example: 28
 *             examples:
 *               exitoso:
 *                 summary: Asignación exitosa con correos
 *                 value:
 *                   msj: "Asignación completada (envío de correos en proceso)"
 *                   asignadas: 28
 *               sinEstudiantes:
 *                 summary: Sin estudiantes para asignar
 *                 value:
 *                   msj: "No se encontraron estudiantes para asignar"
 *                   asignadas: 0
 *       400:
 *         description: Error en los datos enviados o estudiantes no inscritos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                 estudiantesNoInscritos:
 *                   type: array
 *                   items:
 *                     type: integer
 *             examples:
 *               estudiantesNoInscritos:
 *                 summary: Estudiantes no inscritos
 *                 value:
 *                   msj: "Algunos estudiantes no están inscritos en esta clase y sección"
 *                   estudiantesNoInscritos: [15, 22]
 *               faltanDatos:
 *                 summary: Faltan clase Y sección
 *                 value:
 *                   msj: "Debe especificar claseId Y seccionId, o proporcionar un array de estudiantes"
 *               claseNoExiste:
 *                 summary: Clase no encontrada
 *                 value:
 *                   msj: "Clase no encontrada"
 *               seccionNoExiste:
 *                 summary: Sección no encontrada
 *                 value:
 *                   msj: "Sección no encontrada"
 *       404:
 *         description: Evaluación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msj:
 *                   type: string
 *                   example: "Evaluación no encontrada"
 *       500:
 *         description: Error interno del servidor
 */


// Listar evaluaciones (opcionalmente filtrar por claseId, parcialId, periodoId)
rutas.get('/listar', controladorEvaluaciones.Listar);

// Crear evaluación (asignación de estudiantes es opcional, se puede hacer después con /asignar)
rutas.post('/guardar', [
    body('titulo').notEmpty().withMessage('El título es obligatorio'),
    body('fechaInicio').notEmpty().isISO8601().withMessage('Fecha de inicio inválida'),
    body('fechaCierre').notEmpty().isISO8601().withMessage('Fecha de cierre inválida'),
    body('tipo').optional().isIn(['NORMAL', 'REPOSICION', 'EXAMEN']).withMessage('tipo inválido'),
    body('peso').optional().isDecimal().withMessage('peso inválido'),
    // Campos opcionales: claseId, seccionId y estudiantes (pueden ser null)
    body('claseId').optional().custom(value => value === null || Number.isInteger(value)).withMessage('claseId inválido'),
    body('seccionId').optional().custom(value => value === null || Number.isInteger(value)).withMessage('seccionId inválido'),
    body('estudiantes').optional().isArray().withMessage('estudiantes debe ser un arreglo de IDs'),
    body('estudiantes.*').optional().isInt().withMessage('estudiantes debe contener IDs numéricos'),
    body('parcialId').notEmpty().isInt().withMessage('parcialId inválido'),
    body('periodoId').notEmpty().isInt().withMessage('periodoId inválido'),
    body('estado').notEmpty().isIn(['ACTIVO', 'INACTIVO']).withMessage('estado inválido'),
    body('notaMaxima').isDecimal().withMessage('notaMaxima inválida'),
    body('estructura').isObject().withMessage('estructura debe ser un objeto JSON'),
], controladorEvaluaciones.Guardar);

// Editar evaluación
rutas.put('/editar', [
    query('id').notEmpty().isInt().withMessage('id inválido'),
    body('titulo').optional().notEmpty().withMessage('El título no puede estar vacío'),
    body('fechaInicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
    body('fechaCierre').optional().isISO8601().withMessage('Fecha de cierre inválida'),
    body('tipo').optional().isIn(['NORMAL', 'REPOSICION', 'EXAMEN']).withMessage('tipo inválido'),
    body('peso').optional().isDecimal().withMessage('peso inválido'),
    body('notaMaxima').optional().isDecimal().withMessage('notaMaxima inválida'),
    body('estructura').optional().isObject().withMessage('estructura debe ser un objeto JSON'),
    body('claseId').optional().custom(value => value === null || Number.isInteger(value)).withMessage('claseId inválido'),
    body('seccionId').optional().custom(value => value === null || Number.isInteger(value)).withMessage('seccionId inválido'),
    body('estudiantes').optional().isArray().withMessage('estudiantes debe ser un arreglo de IDs'),
    body('estudiantes.*').optional().isInt().withMessage('estudiantes debe contener IDs numéricos'),
    body('parcialId').optional().isInt().withMessage('parcialId inválido'),
    body('periodoId').optional().isInt().withMessage('periodoId inválido'),
    body('estado').optional().isIn(['ACTIVO', 'INACTIVO']).withMessage('estado inválido'),
], controladorEvaluaciones.Editar);

// Eliminar evaluación
rutas.delete('/eliminar', [
    query('id').notEmpty().isInt().withMessage('id inválido')
], controladorEvaluaciones.Eliminar);

// Registrar nota para estudiante
//ruta POST /registrarNota?evaluacionId=1&estudianteId=2&claseId=3&seccionId=2
rutas.post('/registrarNota', [
    query('evaluacionId').notEmpty().isInt().withMessage('evaluacionId inválido'),
    query('estudianteId').notEmpty().isInt().withMessage('estudianteId inválido'),
    query('claseId').notEmpty().isInt().withMessage('claseId es requerido'),
    query('seccionId').notEmpty().isInt().withMessage('seccionId es requerido'),
    body('nota').notEmpty().isDecimal().withMessage('nota inválida')
], controladorEvaluaciones.RegistrarNota);

// Obtener total del parcial para un estudiante
// GET /total-parcial?estudianteId=1&parcialId=2
rutas.get('/total-parcial', [
    query('estudianteId').notEmpty().isInt().withMessage('estudianteId inválido'),
    query('parcialId').notEmpty().isInt().withMessage('parcialId inválido'),
], controladorEvaluaciones.GetTotalParcial);

// Obtener promedio de parciales para un estudiante en un periodo
// GET /promedio-periodo?estudianteId=1&periodoId=1
rutas.get('/promedio-periodo', [
    query('estudianteId').notEmpty().isInt().withMessage('estudianteId inválido'),
    query('periodoId').notEmpty().isInt().withMessage('periodoId inválido'),
], controladorEvaluaciones.GetPromedioPorPeriodo);

// Asignar evaluación existente a estudiantes (lista, sección o clase)
rutas.post('/asignar', [
    query('evaluacionId').notEmpty().isInt().withMessage('evaluacionId inválido'),
    body('estudiantes').optional().isArray().withMessage('estudiantes debe ser un arreglo de IDs'),
    body('estudiantes.*').optional().isInt().withMessage('estudiantes debe contener IDs numéricos'),
    body('seccionId').optional().isInt().withMessage('seccionId inválido'),
    body('claseId').optional().isInt().withMessage('claseId inválido')
], controladorEvaluaciones.Asignar);

module.exports = rutas;
