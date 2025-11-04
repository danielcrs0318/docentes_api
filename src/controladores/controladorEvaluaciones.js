const Evaluaciones = require('../modelos/Evaluaciones');
const EvaluacionesEstudiantes = require('../modelos/EvaluacionesEstudiantes');
const Estudiantes = require('../modelos/Estudiantes');
const Parciales = require('../modelos/Parciales');
const Periodos = require('../modelos/Periodos');
const Clases = require('../modelos/Clases');
const Secciones = require('../modelos/Secciones');
const { validationResult } = require('express-validator');

exports.Listar = async (req, res) => {
  // opcional: filtrar por claseId, parcialId o periodoId
  const { claseId, parcialId, periodoId } = req.query;
  const where = {};
  if (claseId) where.claseId = claseId;
  if (parcialId) where.parcialId = parcialId;
  if (periodoId) where.periodoId = periodoId;

  try {
    const lista = await Evaluaciones.findAll({ where });
    res.json(lista);
  } catch (err) {
    res.status(500).json({ msj: 'Error al listar evaluaciones', error: err });
  }
};

exports.Guardar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msj: 'Hay errores', data: errors.array() });
  }

  try {
    const { titulo, notaMaxima, fechaInicio, fechaCierre, estructura, claseId, seccionId, estudiantes: estudiantesBody, parcialId, periodoId } = req.body;

    // validar que existan parcial y periodo
    const parcial = await Parciales.findOne({ where: { id: parcialId } });
    if (!parcial) return res.status(400).json({ msj: 'Parcial no encontrado' });
    const periodo = await Periodos.findOne({ where: { id: periodoId } });
    if (!periodo) return res.status(400).json({ msj: 'Periodo no encontrado' });

    // Validar que se especifique al menos un objetivo de asignación
    if (!claseId && !seccionId && (!estudiantesBody || estudiantesBody.length === 0)) {
      return res.status(400).json({ msj: 'Debe especificar al menos uno: claseId, seccionId o estudiantes (array de IDs)' });
    }

    // crear la definición de la evaluación
    const evaluacion = await Evaluaciones.create({ titulo, notaMaxima, fechaInicio, fechaCierre, estructura, claseId: claseId || null, parcialId, periodoId });

    // Determinar estudiantes objetivo
    let estudiantes = [];
    if (Array.isArray(estudiantesBody) && estudiantesBody.length > 0) {
      estudiantes = await Estudiantes.findAll({ where: { id: estudiantesBody } });
    } else if (seccionId) {
      // validar seccion
      const seccion = await Secciones.findByPk(seccionId);
      if (!seccion) return res.status(400).json({ msj: 'Sección no encontrada' });
      estudiantes = await Estudiantes.findAll({ where: { seccionId: seccionId } });
    } else if (claseId) {
      // validar clase
      const clase = await Clases.findByPk(claseId);
      if (!clase) return res.status(400).json({ msj: 'Clase no encontrada' });
      estudiantes = await Estudiantes.findAll({ where: { claseId: claseId } });
    }

    if (!estudiantes || estudiantes.length === 0) {
      return res.status(201).json({ evaluacion, asignadas: 0, mensaje: 'Evaluación creada pero no se encontraron estudiantes para asignar' });
    }

    const asignaciones = estudiantes.map(e => ({ evaluacionId: evaluacion.id, estudianteId: e.id }));

    // Evitar duplicados: bulkCreate con ignoreDuplicates si el dialecto lo soporta
    try {
      await EvaluacionesEstudiantes.bulkCreate(asignaciones, { ignoreDuplicates: true });
    } catch (bulkErr) {
      // Si el dialecto no soporta ignoreDuplicates, intentar insertar filtrando duplicados manualmente
      const estudianteIds = asignaciones.map(a => a.estudianteId);
      const existentes = await EvaluacionesEstudiantes.findAll({ where: { evaluacionId: evaluacion.id, estudianteId: estudianteIds } });
      const existentesIds = existentes.map(e => e.estudianteId);
      const aInsertar = asignaciones.filter(a => !existentesIds.includes(a.estudianteId));
      if (aInsertar.length > 0) {
        await EvaluacionesEstudiantes.bulkCreate(aInsertar);
      }
    }

    res.status(201).json({ evaluacion, asignadas: asignaciones.length });
  } catch (err) {
    res.status(500).json({ msj: 'Error al guardar evaluación', error: err.message || err });
  }
};

exports.Editar = async (req, res) => {
  const errors = validationResult(req).errors;
  if (errors.length > 0) {
    return res.status(400).json({ msj: 'Hay errores', data: errors });
  }
  const { id } = req.query;
  try {
    await Evaluaciones.update({ ...req.body }, { where: { id } });
    res.json({ msj: 'Evaluación actualizada' });
  } catch (err) {
    res.status(500).json({ msj: 'Error al actualizar evaluación', error: err });
  }
};

exports.Eliminar = async (req, res) => {
  const errors = validationResult(req).errors;
  if (errors.length > 0) {
    return res.status(400).json({ msj: 'Hay errores', data: errors });
  }
  const { id } = req.query;
  try {
    // eliminar asignaciones primero
    await EvaluacionesEstudiantes.destroy({ where: { evaluacionId: id } });
    await Evaluaciones.destroy({ where: { id } });
    res.json({ msj: 'Evaluación eliminada' });
  } catch (err) {
    res.status(500).json({ msj: 'Error al eliminar evaluación', error: err });
  }
};

// opcional: registrar nota para un estudiante específico
exports.RegistrarNota = async (req, res) => {
  const { evaluacionId, estudianteId } = req.query;
  const { nota } = req.body;
  try {
    const registro = await EvaluacionesEstudiantes.findOne({ where: { evaluacionId, estudianteId } });
    if (!registro) return res.status(404).json({ msj: 'Asignación no encontrada' });
    registro.nota = nota;
    registro.estado = 'CALIFICADO';
    await registro.save();
    res.json({ msj: 'Nota registrada', registro });
  } catch (err) {
    res.status(500).json({ msj: 'Error al registrar nota', error: err });
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

    if (!claseId && !seccionId && (!estudiantesBody || estudiantesBody.length === 0)) {
      return res.status(400).json({ msj: 'Debe especificar al menos uno: claseId, seccionId o estudiantes (array de IDs)' });
    }

    let estudiantes = [];
    if (Array.isArray(estudiantesBody) && estudiantesBody.length > 0) {
      estudiantes = await Estudiantes.findAll({ where: { id: estudiantesBody } });
    } else if (seccionId) {
      const seccion = await Secciones.findByPk(seccionId);
      if (!seccion) return res.status(400).json({ msj: 'Sección no encontrada' });
      estudiantes = await Estudiantes.findAll({ where: { seccionId } });
    } else if (claseId) {
      const clase = await Clases.findByPk(claseId);
      if (!clase) return res.status(400).json({ msj: 'Clase no encontrada' });
      estudiantes = await Estudiantes.findAll({ where: { claseId } });
    }

    if (!estudiantes || estudiantes.length === 0) {
      return res.status(200).json({ msj: 'No se encontraron estudiantes para asignar', asignadas: 0 });
    }

    const asignaciones = estudiantes.map(e => ({ evaluacionId: evaluacion.id, estudianteId: e.id }));
    try {
      await EvaluacionesEstudiantes.bulkCreate(asignaciones, { ignoreDuplicates: true });
    } catch (bulkErr) {
      const estudianteIds = asignaciones.map(a => a.estudianteId);
      const existentes = await EvaluacionesEstudiantes.findAll({ where: { evaluacionId: evaluacion.id, estudianteId: estudianteIds } });
      const existentesIds = existentes.map(e => e.estudianteId);
      const aInsertar = asignaciones.filter(a => !existentesIds.includes(a.estudianteId));
      if (aInsertar.length > 0) await EvaluacionesEstudiantes.bulkCreate(aInsertar);
    }

    res.json({ msj: 'Asignación completada', asignadas: asignaciones.length });
  } catch (err) {
    res.status(500).json({ msj: 'Error al asignar evaluación', error: err.message || err });
  }
};
