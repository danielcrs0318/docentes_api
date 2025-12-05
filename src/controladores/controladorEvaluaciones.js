const Evaluaciones = require('../modelos/Evaluaciones');
const EvaluacionesEstudiantes = require('../modelos/EvaluacionesEstudiantes');
const Estudiantes = require('../modelos/Estudiantes');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const Parciales = require('../modelos/Parciales');
const Periodos = require('../modelos/Periodos');
const Clases = require('../modelos/Clases');
const Secciones = require('../modelos/Secciones');
const EstructuraCalificacion = require('../modelos/EstructuraCalificacion');
const { validationResult } = require('express-validator');
const { enviarCorreo, generarPlantillaCorreo } = require('../configuraciones/correo');

exports.Listar = async (req, res) => {
  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ msj: 'Usuario no autenticado' });
  }

  const { rol, docenteId } = req.usuario;

  // opcional: filtrar por claseId, parcialId o periodoId
  const { claseId, parcialId, periodoId } = req.query;
  const where = {};
  if (claseId) where.claseId = claseId;
  if (parcialId) where.parcialId = parcialId;
  if (periodoId) where.periodoId = periodoId;

  try {
    const lista = await Evaluaciones.findAll({ 
      where,
      include: [
        {
          model: Parciales,
          as: 'parcial',
          attributes: ['id', 'nombre'],
          required: false
        },
        {
          model: Clases,
          as: 'clase',
          attributes: ['id', 'codigo', 'nombre', 'docenteId'],
          required: false // LEFT JOIN para permitir evaluaciones sin clase
        },
        {
          model: Secciones,
          as: 'seccion',
          attributes: ['id', 'nombre'],
          required: false
        }
      ]
    });

    // Filtrar por docente después de la consulta si es necesario
    let listaFiltrada = lista;
    if (rol === 'DOCENTE') {
      listaFiltrada = lista.filter(evaluacion => {
        // Si tiene clase, debe ser del docente
        if (evaluacion.clase) {
          return evaluacion.clase.docenteId === docenteId;
        }
        // Si NO tiene clase, debe haber sido creada por el docente
        return evaluacion.creadoPor === docenteId;
      });
    }

    res.json(listaFiltrada);
  } catch (err) {
    console.error('Error al listar evaluaciones:', err);
    res.status(500).json({ msj: 'Error al listar evaluaciones', error: err.message });
  }
};

// Listar solo evaluaciones de tipo EXAMEN para una clase específica (para reposiciones)
exports.ListarExamenesPorClase = async (req, res) => {
  const { claseId } = req.query;

  if (!claseId) {
    return res.status(400).json({ msj: 'claseId es requerido' });
  }

  try {
    const examenes = await Evaluaciones.findAll({
      where: {
        claseId: claseId,
        tipo: 'EXAMEN',
        estado: 'ACTIVO'
      },
      include: [
        {
          model: Parciales,
          as: 'parcial',
          attributes: ['id', 'nombre'],
          required: false
        },
        {
          model: Periodos,
          as: 'periodo',
          attributes: ['id', 'nombre'],
          required: false
        }
      ],
      order: [['fechaInicio', 'DESC']]
    });

    res.json(examenes);
  } catch (err) {
    console.error('Error al listar exámenes:', err);
    res.status(500).json({ msj: 'Error al listar exámenes', error: err.message });
  }
};

exports.Guardar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msj: 'Hay errores', data: errors.array() });
  }

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ msj: 'Usuario no autenticado' });
  }

  try {
    const { titulo, notaMaxima, fechaInicio, fechaCierre, estructura, claseId, seccionId, estudiantes: estudiantesBody, parcialId, periodoId, tipo, peso, estado, evaluacionReemplazadaId } = req.body;

    const { docenteId } = req.usuario;

    // Si es tipo REPOSICION, validar y obtener datos del examen a reemplazar
    if (tipo === 'REPOSICION') {
      if (!evaluacionReemplazadaId) {
        return res.status(400).json({ msj: 'Para reposiciones debe especificar la evaluación a reemplazar (evaluacionReemplazadaId)' });
      }

      // Obtener el examen a reemplazar
      const examenOriginal = await Evaluaciones.findByPk(evaluacionReemplazadaId);
      if (!examenOriginal) {
        return res.status(404).json({ msj: 'Evaluación a reemplazar no encontrada' });
      }

      if (examenOriginal.tipo !== 'EXAMEN') {
        return res.status(400).json({ msj: 'Solo se pueden reemplazar evaluaciones de tipo EXAMEN' });
      }

      // Verificar que no exista ya una reposición para este examen
      const reposicionExistente = await Evaluaciones.findOne({
        where: {
          evaluacionReemplazadaId: evaluacionReemplazadaId,
          estado: 'ACTIVO'
        }
      });

      if (reposicionExistente) {
        return res.status(400).json({ 
          msj: 'Ya existe una reposición activa para este examen',
          reposicionId: reposicionExistente.id
        });
      }

      // Crear la reposición con datos heredados del examen
      const evaluacion = await Evaluaciones.create({
        titulo, 
        notaMaxima: examenOriginal.notaMaxima, // Heredada del examen
        fechaInicio, 
        fechaCierre, 
        estructura, 
        claseId: examenOriginal.claseId, // Heredada del examen
        seccionId: examenOriginal.seccionId, // Heredada del examen
        parcialId: examenOriginal.parcialId, // Heredada del examen
        periodoId: examenOriginal.periodoId, // Heredada del examen
        tipo: 'REPOSICION',
        peso: peso || 1.0,
        estado: estado || 'ACTIVO',
        creadoPor: docenteId,
        evaluacionReemplazadaId: evaluacionReemplazadaId // Referencia al examen
      });

      // Asignar automáticamente a los mismos estudiantes del examen
      const asignacionesExamen = await EvaluacionesEstudiantes.findAll({
        where: { evaluacionId: evaluacionReemplazadaId },
        attributes: ['estudianteId']
      });

      const estudiantesIds = asignacionesExamen.map(a => a.estudianteId);
      
      if (estudiantesIds.length > 0) {
        const asignaciones = estudiantesIds.map(id => ({ 
          evaluacionId: evaluacion.id, 
          estudianteId: id 
        }));
        await EvaluacionesEstudiantes.bulkCreate(asignaciones, { ignoreDuplicates: true });
      }

      return res.status(201).json({ 
        evaluacion, 
        asignadas: estudiantesIds.length,
        mensaje: `Reposición creada exitosamente. Se asignó a ${estudiantesIds.length} estudiante(s) del examen original.`
      });
    }

    // Flujo normal para evaluaciones tipo NORMAL o EXAMEN
    const parcial = await Parciales.findByPk(parcialId);
    if (!parcial) return res.status(400).json({ msj: 'Parcial no encontrado' });
    const periodo = await Periodos.findByPk(periodoId);
    if (!periodo) return res.status(400).json({ msj: 'Periodo no encontrado' });

    // ✅ Validar que exista estructura de calificación si se proporciona clase
    if (claseId && parcialId) {
      const estructuraExistente = await EstructuraCalificacion.findOne({
        where: { claseId, parcialId, estado: 'ACTIVO' }
      });
      
      if (!estructuraExistente) {
        return res.status(400).json({ 
          msj: 'Debe crear la estructura de calificación antes de registrar evaluaciones',
          error: 'ESTRUCTURA_REQUERIDA',
          detalle: `No existe estructura de calificación para la clase ${claseId} en el parcial ${parcialId}`
        });
      }
    }

    const evaluacion = await Evaluaciones.create({
      titulo, 
      notaMaxima, 
      fechaInicio, 
      fechaCierre, 
      estructura, 
      claseId: claseId || null,
      seccionId: seccionId || null,
      parcialId, 
      periodoId,
      tipo: tipo || 'NORMAL',
      peso: peso || 1.0,
      estado: estado || 'ACTIVO',
      creadoPor: docenteId // Registrar quién creó la evaluación
    });

    // Si no se proporcionan estudiantes, clase o sección, solo crear la evaluación
    if (!claseId && !seccionId && (!estudiantesBody || estudiantesBody.length === 0)) {
      return res.status(201).json({ 
        evaluacion, 
        asignadas: 0, 
        mensaje: 'Evaluación creada exitosamente. Puede asignar estudiantes posteriormente usando el endpoint /asignar' 
      });
    }

    // 🔹 Obtener información de la clase (si existe)
    let clase = null;
    if (claseId) {
      clase = await Clases.findByPk(claseId);
      if (!clase) {
        await evaluacion.destroy();
        return res.status(400).json({ msj: 'Clase no encontrada' });
      }
      
      // Si es docente, verificar que la clase le pertenezca
      const { rol, docenteId } = req.usuario;
      if (rol === 'DOCENTE' && clase?.docenteId !== docenteId) {
        await evaluacion.destroy();
        return res.status(403).json({ msj: 'No tiene permiso para crear evaluaciones en esta clase' });
      }
    }

    // 🔹 Validar sección si se proporciona
    if (seccionId) {
      const seccion = await Secciones.findByPk(seccionId);
      if (!seccion) {
        await evaluacion.destroy();
        return res.status(400).json({ msj: 'Sección no encontrada' });
      }
    }

    // 🔹 Obtener estudiantes usando EstudiantesClases
    let estudiantesIds = [];
    if (Array.isArray(estudiantesBody) && estudiantesBody.length > 0) {
      // Validar que los estudiantes proporcionados estén inscritos en la clase y sección
      if (claseId && seccionId) {
        // Verificar inscripción con clase y sección
        const inscripciones = await EstudiantesClases.findAll({
          where: { estudianteId: estudiantesBody, claseId, seccionId },
          attributes: ['estudianteId']
        });
        const inscritosIds = inscripciones.map(i => i.estudianteId);
        const noInscritos = estudiantesBody.filter(id => !inscritosIds.includes(id));
        
        if (noInscritos.length > 0) {
          await evaluacion.destroy();
          return res.status(400).json({ 
            msj: 'Algunos estudiantes no están inscritos en esta clase y sección', 
            estudiantesNoInscritos: noInscritos 
          });
        }
        estudiantesIds = inscritosIds;
      } else if (claseId) {
        // Verificar inscripción solo con clase
        const inscripciones = await EstudiantesClases.findAll({
          where: { estudianteId: estudiantesBody, claseId },
          attributes: ['estudianteId']
        });
        const inscritosIds = inscripciones.map(i => i.estudianteId);
        const noInscritos = estudiantesBody.filter(id => !inscritosIds.includes(id));
        
        if (noInscritos.length > 0) {
          await evaluacion.destroy();
          return res.status(400).json({ 
            msj: 'Algunos estudiantes no están inscritos en esta clase', 
            estudiantesNoInscritos: noInscritos 
          });
        }
        estudiantesIds = inscritosIds;
      } else if (seccionId) {
        // Verificar inscripción solo con sección
        const inscripciones = await EstudiantesClases.findAll({
          where: { estudianteId: estudiantesBody, seccionId },
          attributes: ['estudianteId']
        });
        const inscritosIds = inscripciones.map(i => i.estudianteId);
        const noInscritos = estudiantesBody.filter(id => !inscritosIds.includes(id));
        
        if (noInscritos.length > 0) {
          await evaluacion.destroy();
          return res.status(400).json({ 
            msj: 'Algunos estudiantes no están inscritos en esta sección', 
            estudiantesNoInscritos: noInscritos 
          });
        }
        estudiantesIds = inscritosIds;
      } else {
        // Sin clase ni sección, usar los IDs proporcionados directamente
        estudiantesIds = estudiantesBody;
      }
    } else if (seccionId && claseId) {
      // Filtrar por clase y sección
      const registros = await EstudiantesClases.findAll({ 
        where: { claseId, seccionId },
        attributes: ['estudianteId']
      });
      estudiantesIds = registros.map(r => r.estudianteId);
    } else if (claseId) {
      // Solo filtrar por clase
      const registros = await EstudiantesClases.findAll({ 
        where: { claseId },
        attributes: ['estudianteId']
      });
      estudiantesIds = registros.map(r => r.estudianteId);
    } else if (seccionId) {
      // Solo filtrar por sección
      const registros = await EstudiantesClases.findAll({ 
        where: { seccionId },
        attributes: ['estudianteId']
      });
      estudiantesIds = registros.map(r => r.estudianteId);
    }

    if (estudiantesIds.length === 0) {
      return res.status(201).json({ evaluacion, asignadas: 0, mensaje: 'Evaluación creada pero sin estudiantes asignados' });
    }

    // Obtener datos completos de estudiantes
    const estudiantes = await Estudiantes.findAll({ where: { id: estudiantesIds } });

    const asignaciones = estudiantes.map(e => ({ evaluacionId: evaluacion.id, estudianteId: e.id }));
    await EvaluacionesEstudiantes.bulkCreate(asignaciones, { ignoreDuplicates: true });

    // ---- Envío de correos en paralelo (no bloqueante)
    const promesasCorreos = estudiantes
      .filter(e => e.correo)
      .map(e => {
        const asunto = `Nueva evaluación asignada: ${evaluacion.titulo}`;
        const contenidoInterno = `
          <h2>¡Hola ${e.nombre || 'estudiante'}! 👋</h2>
          <p>Se te ha asignado una nueva evaluación en tu clase.</p>
          <div class="info-box">
            <p><strong>📝 Título:</strong> ${evaluacion.titulo}</p>
            <p><strong>📚 Clase:</strong> ${clase ? clase.nombre : 'Sin clase asociada'}</p>
            <p><strong>📊 Nota máxima:</strong> ${evaluacion.notaMaxima}</p>
            <p><strong>📅 Fecha de inicio:</strong> ${new Date(evaluacion.fechaInicio).toLocaleString('es-ES')}</p>
            <p><strong>⏰ Fecha de cierre:</strong> ${new Date(evaluacion.fechaCierre).toLocaleString('es-ES')}</p>
          </div>
          <p>Por favor ingresa a la plataforma para ver más detalles y completar la evaluación.</p>
        `;
        const contenido = generarPlantillaCorreo('Nueva Evaluación', contenidoInterno);
        return enviarCorreo(e.correo, asunto, contenido);
      });

    Promise.allSettled(promesasCorreos).then(results => {
      const fallos = results.filter(r => r.status === 'rejected');
      if (fallos.length) console.warn(` Fallaron ${fallos.length} envíos de correo`);
    });

    res.status(201).json({ 
      evaluacion, 
      asignadas: asignaciones.length,
      mensaje: 'Evaluación creada exitosamente' 
    });
  } catch (err) {
    console.error('Error al guardar evaluación:', err);
    res.status(500).json({ msj: 'Error al guardar evaluación', error: err.message || err });
  }
};


// ----------------------------------------------------------------------


exports.Editar = async (req, res) => {
  const errors = validationResult(req).errors;
  if (errors.length > 0) {
    return res.status(400).json({ msj: 'Hay errores', data: errors });
  }

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ msj: 'Usuario no autenticado' });
  }

  const { id } = req.query;
  try {
    const evaluacionAnterior = await Evaluaciones.findByPk(id, {
      include: [{
        model: Clases,
        as: 'clase',
        attributes: ['id', 'nombre', 'docenteId']
      }]
    });
    if (!evaluacionAnterior) return res.status(404).json({ msj: 'Evaluación no encontrada' });

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && evaluacionAnterior.clase?.docenteId !== docenteId) {
      return res.status(403).json({ msj: 'No tiene permiso para editar esta evaluación' });
    }

    await Evaluaciones.update({ ...req.body }, { where: { id } });
    const evaluacion = await Evaluaciones.findByPk(id);

    // 🔹 Obtener información de la clase
    const clase = evaluacion.claseId ? await Clases.findByPk(evaluacion.claseId) : null;

    const asignaciones = await EvaluacionesEstudiantes.findAll({
      where: { evaluacionId: id },
      include: [{ model: Estudiantes, as: 'estudiante' }]
    });

    // Correos en paralelo
    const promesasCorreos = asignaciones
      .filter(a => a.estudiante?.correo)
      .map(a => {
        const e = a.estudiante;
        const asunto = `Actualización en la evaluación: ${evaluacion.titulo}`;
        const contenidoInterno = `
          <h2>¡Hola ${e.nombre || 'estudiante'}! 👋</h2>
          <p>Se ha actualizado la evaluación a la que estás asignado.</p>
          <div class="info-box">
            <p><strong>📝 Título:</strong> ${evaluacion.titulo}</p>
            <p><strong>📚 Clase:</strong> ${clase ? clase.nombre : 'Sin clase asociada'}</p>
            <p><strong>📊 Nota máxima:</strong> ${evaluacion.notaMaxima}</p>
            <p><strong>📅 Fecha de inicio:</strong> ${new Date(evaluacion.fechaInicio).toLocaleString('es-ES')}</p>
            <p><strong>⏰ Fecha de cierre:</strong> ${new Date(evaluacion.fechaCierre).toLocaleString('es-ES')}</p>
          </div>
          <p>Por favor revisa la plataforma para ver los cambios.</p>
        `;
        const contenido = generarPlantillaCorreo('Evaluación Actualizada', contenidoInterno);
        return enviarCorreo(e.correo, asunto, contenido);
      });

    Promise.allSettled(promesasCorreos).then(r => {
      const fallos = r.filter(x => x.status === 'rejected');
      if (fallos.length) console.warn(` ${fallos.length} correos fallaron en Editar`);
    });

    res.json({ msj: 'Evaluación actualizada (envío de correos en proceso)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msj: 'Error al actualizar evaluación', error: err });
  }
};


// ----------------------------------------------------------------------


exports.Eliminar = async (req, res) => {
  const errors = validationResult(req).errors;
  if (errors.length > 0) {
    return res.status(400).json({ msj: 'Hay errores', data: errors });
  }

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ msj: 'Usuario no autenticado' });
  }

  const { id } = req.query;
  try {
    const evaluacion = await Evaluaciones.findByPk(id, {
      include: [{
        model: Clases,
        as: 'clase',
        attributes: ['id', 'nombre', 'docenteId']
      }]
    });
    if (!evaluacion) return res.status(404).json({ msj: 'Evaluación no encontrada' });

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && evaluacion.clase?.docenteId !== docenteId) {
      return res.status(403).json({ msj: 'No tiene permiso para eliminar esta evaluación' });
    }

    // 🔹 Obtener información de la clase
    const clase = evaluacion.clase;

    const asignaciones = await EvaluacionesEstudiantes.findAll({
      where: { evaluacionId: id },
      include: [{ model: Estudiantes, as: 'estudiante' }]
    });

    await EvaluacionesEstudiantes.destroy({ where: { evaluacionId: id } });
    await Evaluaciones.destroy({ where: { id } });

    // Enviar correos en paralelo
    const promesasCorreos = asignaciones
      .filter(a => a.estudiante?.correo)
      .map(a => {
        const e = a.estudiante;
        const asunto = `Evaluación eliminada: ${evaluacion.titulo}`;
        const contenidoInterno = `
          <h2>¡Hola ${e.nombre || 'estudiante'}! 👋</h2>
          <p>La evaluación <strong>${evaluacion.titulo}</strong> de la clase <strong>${clase ? clase.nombre : 'Sin clase asociada'}</strong> ha sido eliminada.</p>
          <div class="info-box">
            <p><strong>📝 Evaluación:</strong> ${evaluacion.titulo}</p>
            <p><strong>📚 Clase:</strong> ${clase ? clase.nombre : 'Sin clase asociada'}</p>
            <p><strong>ℹ️ Estado:</strong> Eliminada</p>
          </div>
          <p>Ya no aparecerá en tu lista de evaluaciones. Si tienes dudas, contacta a tu docente.</p>
        `;
        const contenido = generarPlantillaCorreo('Evaluación Eliminada', contenidoInterno);
        return enviarCorreo(e.correo, asunto, contenido);
      });

    Promise.allSettled(promesasCorreos).then(r => {
      const fallos = r.filter(x => x.status === 'rejected');
      if (fallos.length) console.warn(` ${fallos.length} correos fallaron en Eliminar`);
    });

    res.json({ msj: 'Evaluación eliminada (envío de correos en proceso)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msj: 'Error al eliminar evaluación', error: err });
  }
};

exports.RegistrarNota = async (req, res) => {
  const { evaluacionId, estudianteId, claseId, seccionId } = req.query;
  const { nota } = req.body;

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ msj: 'Usuario no autenticado' });
  }

  try {
    // Validar que claseId y seccionId estén presentes
    if (!claseId || !seccionId) {
      return res.status(400).json({ msj: 'claseId y seccionId son requeridos' });
    }

    const evaluacion = await Evaluaciones.findByPk(evaluacionId, {
      include: [{
        model: Clases,
        as: 'clase',
        attributes: ['id', 'nombre', 'docenteId']
      }]
    });
    if (!evaluacion) return res.status(404).json({ msj: 'Evaluación no encontrada' });

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && evaluacion.clase?.docenteId !== docenteId) {
      return res.status(403).json({ msj: 'No tiene permiso para registrar notas en esta evaluación' });
    }

    // Verificar que el estudiante esté inscrito en la clase y sección
    const inscripcion = await EstudiantesClases.findOne({
      where: { estudianteId, claseId, seccionId }
    });
    if (!inscripcion) {
      return res.status(400).json({ msj: 'El estudiante no está inscrito en esta clase y sección' });
    }

    // 🔹 Obtener nombre de la clase
    const claseNombre = evaluacion.clase?.nombre || 'Sin clase asignada';

    const valor = parseFloat(nota);
    if (isNaN(valor) || valor < 0) return res.status(400).json({ msj: 'Nota inválida' });
    if (evaluacion.notaMaxima && valor > parseFloat(evaluacion.notaMaxima)) {
      return res.status(400).json({ msj: `La nota no puede ser mayor a la notaMaxima (${evaluacion.notaMaxima})` });
    }

    const registro = await EvaluacionesEstudiantes.findOne({
      where: { evaluacionId, estudianteId },
      include: [{ model: Estudiantes, as: 'estudiante' }]
    });
    if (!registro) return res.status(404).json({ msj: 'Asignación no encontrada' });

    registro.nota = valor;
    registro.estado = 'CALIFICADO';
    await registro.save();

    const total = await calcularTotalParcial(estudianteId, evaluacion.parcialId);

    const estudiante = registro.estudiante;
    if (estudiante?.correo) {
      const asunto = `Nota registrada - ${evaluacion.titulo}`;
      const contenidoInterno = `
        <h2>¡Hola ${estudiante.nombre || 'estudiante'}! 👋</h2>
        <p>Se ha registrado tu nota para la evaluación <strong>${evaluacion.titulo}</strong> de la clase <strong>${claseNombre}</strong>.</p>
        <div class="info-box">
          <p><strong>📊 Nota obtenida:</strong> ${valor}</p>
          <p><strong>📈 Nota máxima:</strong> ${evaluacion.notaMaxima}</p>
          <p><strong>📋 Total del parcial:</strong> ${total.final}</p>
        </div>
        <p>Revisa la plataforma para ver más detalles de tus calificaciones.</p>
      `;
      const contenido = generarPlantillaCorreo('Nota Registrada', contenidoInterno);
      enviarCorreo(estudiante.correo, asunto, contenido).catch(err =>
        console.error(`Error al enviar correo a ${estudiante.correo}:`, err.message)
      );
    }

    res.json({ msj: 'Nota registrada (correo enviándose en segundo plano)', registro, totalParcial: total });
  } catch (err) {
    res.status(500).json({ msj: 'Error al registrar nota', error: err.message || err });
  }
};

// Helper: calcula acumulativo, examen, reposicion y total final para un estudiante en un parcial
// LÓGICA: Suma directa de puntos obtenidos
const calcularTotalParcial = async (estudianteId, parcialId) => {
  // Obtener el parcial para saber la clase asociada
  const parcial = await Parciales.findByPk(parcialId);
  if (!parcial) {
    throw new Error('Parcial no encontrado');
  }

  // Obtener la evaluación para determinar la clase
  const primeraEvaluacion = await Evaluaciones.findOne({
    where: { parcialId },
    attributes: ['claseId']
  });

  let estructura = null;
  if (primeraEvaluacion && primeraEvaluacion.claseId) {
    // Buscar estructura de calificación configurada para este parcial y clase
    estructura = await EstructuraCalificacion.findOne({
      where: {
        parcialId: parcialId,
        claseId: primeraEvaluacion.claseId,
        estado: 'ACTIVO'
      }
    });
  }

  // Usar pesos configurados o valores por defecto
  const pesoAcumulativo = estructura ? parseFloat(estructura.pesoAcumulativo) : 60;
  const pesoExamen = estructura ? parseFloat(estructura.pesoExamen) : 40;
  const pesoReposicion = estructura ? parseFloat(estructura.pesoReposicion) : 0;
  const notaMaximaParcial = estructura ? parseFloat(estructura.notaMaximaParcial) : 100;

  // Traer asignaciones del estudiante para evaluaciones de ese parcial
  const registros = await EvaluacionesEstudiantes.findAll({
    where: { estudianteId },
    include: [
      {
        model: Evaluaciones,
        as: 'evaluacion',
        where: { parcialId }
      }
    ]
  });

  // Calcular suma directa de puntos por tipo
  let puntosAcumulativo = 0;
  let puntosExamen = 0;
  let puntosReposicion = 0;
  let examenesReemplazadosConNota = new Set(); // IDs de exámenes que tienen reposición CON NOTA

  // Primer paso: identificar qué exámenes tienen reposición CON NOTA registrada
  for (const r of registros) {
    const ev = r.evaluacion;
    const nota = r.nota !== null && r.nota !== undefined ? parseFloat(r.nota) : null;
    
    if (ev.tipo === 'REPOSICION' && ev.evaluacionReemplazadaId && nota !== null) {
      // Solo marcar el examen como reemplazado si la reposición tiene nota
      examenesReemplazadosConNota.add(ev.evaluacionReemplazadaId);
    }
  }

  // Segundo paso: sumar puntos según tipo
  for (const r of registros) {
    const ev = r.evaluacion;
    const nota = r.nota !== null && r.nota !== undefined ? parseFloat(r.nota) : null;

    if (nota === null) continue; // Saltar si no hay nota

    if (ev.tipo === 'REPOSICION') {
      // Sumar puntos de reposición
      puntosReposicion += nota;
    } else if (ev.tipo === 'EXAMEN') {
      // Solo sumar examen si NO tiene reposición CON NOTA
      if (!examenesReemplazadosConNota.has(ev.id)) {
        puntosExamen += nota;
      }
      // Si tiene reposición con nota, ignorar este examen
    } else {
      // NORMAL o cualquier otro tipo = acumulativo
      puntosAcumulativo += nota;
    }
  }

  // Calcular total final
  let finalParcial = puntosAcumulativo + puntosExamen + puntosReposicion;

  // Asegurar que no exceda la nota máxima del parcial
  if (finalParcial > notaMaximaParcial) {
    finalParcial = notaMaximaParcial;
  }

  // Redondear a 2 decimales
  const round = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
  
  return {
    acumulativo: round(puntosAcumulativo),
    examen: round(puntosExamen),
    reposicion: puntosReposicion > 0 ? round(puntosReposicion) : null,
    final: round(finalParcial),
    estructura: estructura ? {
      pesoAcumulativo,
      pesoExamen,
      pesoReposicion,
      notaMaximaParcial
    } : null
  };
};

// Endpoint: obtener total del parcial para un estudiante
exports.GetTotalParcial = async (req, res) => {
  const { estudianteId, parcialId } = req.query;
  if (!estudianteId || !parcialId) return res.status(400).json({ msj: 'estudianteId y parcialId son requeridos' });
  try {
    const total = await calcularTotalParcial(estudianteId, parcialId);
    res.json(total);
  } catch (err) {
    res.status(500).json({ msj: 'Error al calcular total parcial', error: err.message || err });
  }
};

// Endpoint: promedio de parciales (por periodo)
exports.GetPromedioPorPeriodo = async (req, res) => {
  const { estudianteId, periodoId } = req.query;
  if (!estudianteId || !periodoId) return res.status(400).json({ msj: 'estudianteId y periodoId son requeridos' });
  try {
    const parciales = await Parciales.findAll({ where: { periodoId } });
    if (!parciales || parciales.length === 0) return res.json({ promedio: 0, detalles: [] });

    const detalles = [];
    let suma = 0;
    let contador = 0;
    for (const p of parciales) {
      const t = await calcularTotalParcial(estudianteId, p.id);
      detalles.push({ parcialId: p.id, acumulativo: t.acumulativo, reposicion: t.reposicion, final: t.final });
      if (typeof t.final === 'number') {
        suma += t.final;
        contador++;
      }
    }
    const promedio = contador > 0 ? Math.round((suma / contador) * 100) / 100 : 0;
    res.json({ promedio, detalles });
  } catch (err) {
    res.status(500).json({ msj: 'Error al calcular promedio', error: err.message || err });
  }
};

// Asignar una evaluación existente a estudiantes (por lista, por sección o por clase)
exports.Asignar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msj: 'Hay errores', data: errors.array() });
  }

  try {
    const { evaluacionId } = req.query;
    const { estudiantes: estudiantesBody, seccionId, claseId } = req.body;

    const evaluacion = await Evaluaciones.findByPk(evaluacionId);
    if (!evaluacion) return res.status(404).json({ msj: 'Evaluación no encontrada' });

    // Validar que se proporcione clase Y sección, o lista de estudiantes
    if (!claseId || !seccionId) {
      if (!estudiantesBody || estudiantesBody.length === 0) {
        return res.status(400).json({ msj: 'Debe especificar claseId Y seccionId, o proporcionar un array de estudiantes' });
      }
    }

    // 🔹 Validar que la clase y sección existan
    let clase = null;
    if (claseId) {
      clase = await Clases.findByPk(claseId);
      if (!clase) return res.status(400).json({ msj: 'Clase no encontrada' });
    }
    if (seccionId) {
      const seccion = await Secciones.findByPk(seccionId);
      if (!seccion) return res.status(400).json({ msj: 'Sección no encontrada' });
    }

    // 🔹 Obtener estudiantes usando EstudiantesClases
    let estudiantesIds = [];
    if (Array.isArray(estudiantesBody) && estudiantesBody.length > 0) {
      // Validar que los estudiantes proporcionados estén inscritos
      if (claseId && seccionId) {
        const inscripciones = await EstudiantesClases.findAll({
          where: { estudianteId: estudiantesBody, claseId, seccionId },
          attributes: ['estudianteId']
        });
        const inscritosIds = inscripciones.map(i => i.estudianteId);
        const noInscritos = estudiantesBody.filter(id => !inscritosIds.includes(id));
        
        if (noInscritos.length > 0) {
          return res.status(400).json({ 
            msj: 'Algunos estudiantes no están inscritos en esta clase y sección', 
            estudiantesNoInscritos: noInscritos 
          });
        }
        estudiantesIds = inscritosIds;
      } else {
        // Si no hay clase ni sección, usar los IDs proporcionados
        estudiantesIds = estudiantesBody;
      }
    } else if (claseId && seccionId) {
      // Filtrar por clase y sección
      const registros = await EstudiantesClases.findAll({ 
        where: { claseId, seccionId },
        attributes: ['estudianteId']
      });
      estudiantesIds = registros.map(r => r.estudianteId);
    }

    if (estudiantesIds.length === 0) {
      return res.status(200).json({ msj: 'No se encontraron estudiantes para asignar', asignadas: 0 });
    }

    // Obtener datos completos de estudiantes
    const estudiantes = await Estudiantes.findAll({ where: { id: estudiantesIds } });

    const asignaciones = estudiantesIds.map(id => ({ evaluacionId: evaluacion.id, estudianteId: id }));
    try {
      await EvaluacionesEstudiantes.bulkCreate(asignaciones, { ignoreDuplicates: true });
    } catch (bulkErr) {
      const existentes = await EvaluacionesEstudiantes.findAll({ 
        where: { 
          evaluacionId: evaluacion.id, 
          estudianteId: estudiantesIds 
        } 
      });
      const existentesIds = existentes.map(e => e.estudianteId);
      const aInsertar = asignaciones.filter(a => !existentesIds.includes(a.estudianteId));
      if (aInsertar.length > 0) await EvaluacionesEstudiantes.bulkCreate(aInsertar);
    }

    // ---- Envío de correos en paralelo (no bloqueante)
    const promesasCorreos = estudiantes
      .filter(e => e.correo)
      .map(e => {
        const asunto = `Nueva evaluación asignada: ${evaluacion.titulo}`;
        const contenidoInterno = `
          <h2>¡Hola ${e.nombre || 'estudiante'}! 👋</h2>
          <p>Se te ha asignado una nueva evaluación en tu clase.</p>
          <div class="info-box">
            <p><strong>📝 Título:</strong> ${evaluacion.titulo}</p>
            <p><strong>📚 Clase:</strong> ${clase ? clase.nombre : 'Sin clase asociada'}</p>
            <p><strong>📊 Nota máxima:</strong> ${evaluacion.notaMaxima}</p>
            <p><strong>📅 Fecha de inicio:</strong> ${new Date(evaluacion.fechaInicio).toLocaleString('es-ES')}</p>
            <p><strong>⏰ Fecha de cierre:</strong> ${new Date(evaluacion.fechaCierre).toLocaleString('es-ES')}</p>
          </div>
          <p>Por favor ingresa a la plataforma para ver más detalles y completar la evaluación.</p>
        `;
        const contenido = generarPlantillaCorreo('Nueva Evaluación', contenidoInterno);
        return enviarCorreo(e.correo, asunto, contenido);
      });

    Promise.allSettled(promesasCorreos).then(results => {
      const fallos = results.filter(r => r.status === 'rejected');
      if (fallos.length) console.warn(` Fallaron ${fallos.length} envíos de correo`);
    });

    res.json({ msj: 'Asignación completada (envío de correos en proceso)', asignadas: asignaciones.length });
  } catch (err) {
    res.status(500).json({ msj: 'Error al asignar evaluación', error: err.message || err });
  }
};
