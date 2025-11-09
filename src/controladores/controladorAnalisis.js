const Estudiantes = require('../modelos/Estudiantes');
const Clases = require('../modelos/Clases');
const Docentes = require('../modelos/Docentes');
const Parciales = require('../modelos/Parciales');
const Periodos = require('../modelos/Periodos');
const Evaluaciones = require('../modelos/Evaluaciones');
const EvaluacionesEstudiantes = require('../modelos/EvaluacionesEstudiantes');
const Asistencia = require('../modelos/Asistencia');
const Proyectos = require('../modelos/Proyectos');
const ProyectoEstudiantes = require('../modelos/ProyectoEstudiantes');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/* ========================================
   ANÁLISIS POR PARCIAL
   ======================================== */
exports.AnalizarParcial = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { parcialId, claseId } = req.query;

  try {
    // Obtener información del parcial
    const parcial = await Parciales.findByPk(parcialId, {
      include: [{ model: Periodos, as: 'periodo', attributes: ['id', 'nombre'] }]
    });

    if (!parcial) {
      return res.status(404).json({ error: 'Parcial no encontrado' });
    }

    // Obtener información de la clase
    const clase = await Clases.findByPk(claseId, {
      include: [{ model: Docentes, as: 'docente', attributes: ['id', 'nombre'] }]
    });

    if (!clase) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    // Validar que el docente autenticado sea el de la clase (si no es admin)
    if (req.usuario && req.usuario.docenteId && clase.docenteId !== req.usuario.docenteId) {
      return res.status(403).json({ error: 'No autorizado para ver esta clase' });
    }

    // Obtener estudiantes inscritos en la clase
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId },
      include: [{
        model: Estudiantes,
        as: 'estudiante',
        attributes: ['id', 'nombre', 'correo']
      }]
    });

    const estudiantesIds = inscripciones.map(i => i.estudianteId);

    if (estudiantesIds.length === 0) {
      return res.json({
        parcial: {
          id: parcial.id,
          nombre: parcial.nombre,
          periodo: parcial.periodo
        },
        clase: {
          id: clase.id,
          codigo: clase.codigo,
          nombre: clase.nombre,
          docente: clase.docente
        },
        estadisticas: {
          promedioGeneral: 0,
          promedioAsistencia: 0,
          porcentajeInasistencias: 0,
          totalEstudiantes: 0
        },
        detalleEstudiantes: []
      });
    }

    // Obtener evaluaciones del parcial para esta clase
    const evaluaciones = await Evaluaciones.findAll({
      where: {
        parcialId,
        claseId
      },
      attributes: ['id', 'titulo', 'notaMaxima']
    });

    const evaluacionesIds = evaluaciones.map(e => e.id);

    // Calcular estadísticas por estudiante
    const detalleEstudiantes = [];
    let sumaPromedios = 0;
    let sumaAsistencias = 0;
    let sumaInasistencias = 0;

    for (const inscripcion of inscripciones) {
      const estudiante = inscripcion.estudiante;

      // Obtener notas del estudiante en este parcial
      const notas = await EvaluacionesEstudiantes.findAll({
        where: {
          estudianteId: estudiante.id,
          evaluacionId: { [Op.in]: evaluacionesIds }
        },
        attributes: ['nota']
      });

      const promedioNotas = notas.length > 0
        ? notas.reduce((sum, n) => sum + parseFloat(n.nota || 0), 0) / notas.length
        : 0;

      // Obtener asistencias del estudiante en este parcial
      const asistencias = await Asistencia.findAll({
        where: {
          estudianteId: estudiante.id,
          claseId,
          parcialId
        },
        attributes: ['estado']
      });

      const totalAsistencias = asistencias.length;
      const presentes = asistencias.filter(a => a.estado === 'PRESENTE').length;
      const tardanzas = asistencias.filter(a => a.estado === 'TARDANZA').length;
      const ausentes = asistencias.filter(a => a.estado === 'AUSENTE').length;

      // Calcular porcentaje de asistencia (TARDANZA cuenta como 0.5)
      const asistenciaEfectiva = presentes + (tardanzas * 0.5);
      const porcentajeAsistencia = totalAsistencias > 0
        ? (asistenciaEfectiva / totalAsistencias) * 100
        : 0;

      detalleEstudiantes.push({
        estudianteId: estudiante.id,
        nombre: estudiante.nombre,
        correo: estudiante.correo,
        promedioNotas: parseFloat(promedioNotas.toFixed(2)),
        asistencias: presentes,
        tardanzas,
        inasistencias: ausentes,
        totalClases: totalAsistencias,
        porcentajeAsistencia: parseFloat(porcentajeAsistencia.toFixed(2))
      });

      sumaPromedios += promedioNotas;
      sumaAsistencias += presentes + tardanzas;
      sumaInasistencias += ausentes;
    }

    const totalEstudiantes = estudiantesIds.length;
    const totalClasesTotales = detalleEstudiantes.reduce((sum, e) => sum + e.totalClases, 0);

    const estadisticas = {
      promedioGeneral: totalEstudiantes > 0
        ? parseFloat((sumaPromedios / totalEstudiantes).toFixed(2))
        : 0,
      promedioAsistencia: totalClasesTotales > 0
        ? parseFloat(((sumaAsistencias / totalClasesTotales) * 100).toFixed(2))
        : 0,
      porcentajeInasistencias: totalClasesTotales > 0
        ? parseFloat(((sumaInasistencias / totalClasesTotales) * 100).toFixed(2))
        : 0,
      totalEstudiantes
    };

    res.json({
      parcial: {
        id: parcial.id,
        nombre: parcial.nombre,
        fechaInicio: parcial.fechaInicio,
        fechaFin: parcial.fechaFin,
        periodo: parcial.periodo
      },
      clase: {
        id: clase.id,
        codigo: clase.codigo,
        nombre: clase.nombre,
        docente: clase.docente
      },
      estadisticas,
      detalleEstudiantes
    });

  } catch (error) {
    console.error('Error al analizar parcial:', error);
    res.status(500).json({ error: 'Error al analizar parcial', detalle: error.message });
  }
};

/* ========================================
   ANÁLISIS POR PERIODO
   ======================================== */
exports.AnalizarPeriodo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { periodoId, claseId } = req.query;

  try {
    // Obtener información del periodo
    const periodo = await Periodos.findByPk(periodoId, {
      attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin']
    });

    if (!periodo) {
      return res.status(404).json({ error: 'Periodo no encontrado' });
    }

    // Obtener información de la clase
    const clase = await Clases.findByPk(claseId, {
      include: [{ model: Docentes, as: 'docente', attributes: ['id', 'nombre'] }]
    });

    if (!clase) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    // Validar que el docente autenticado sea el de la clase
    if (req.usuario && req.usuario.docenteId && clase.docenteId !== req.usuario.docenteId) {
      return res.status(403).json({ error: 'No autorizado para ver esta clase' });
    }

    // Obtener parciales del periodo
    const parciales = await Parciales.findAll({
      where: { periodoId },
      attributes: ['id', 'nombre'],
      order: [['fechaInicio', 'ASC']]
    });

    // Obtener estudiantes inscritos en la clase
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId },
      include: [{
        model: Estudiantes,
        as: 'estudiante',
        attributes: ['id', 'nombre', 'correo']
      }]
    });

    const estudiantesIds = inscripciones.map(i => i.estudianteId);

    if (estudiantesIds.length === 0) {
      return res.json({
        periodo,
        clase: {
          id: clase.id,
          codigo: clase.codigo,
          nombre: clase.nombre,
          docente: clase.docente
        },
        estadisticas: {
          promedioAcumulado: 0,
          porcentajeAsistencia: 0,
          porcentajeInasistencias: 0,
          proyectosEntregados: 0,
          proyectosPendientes: 0,
          totalProyectos: 0
        },
        evolucionPorParcial: [],
        detalleEstudiantes: []
      });
    }

    // Obtener todas las evaluaciones del periodo para esta clase
    const evaluaciones = await Evaluaciones.findAll({
      where: {
        periodoId,
        claseId
      },
      attributes: ['id', 'titulo', 'parcialId']
    });

    const evaluacionesIds = evaluaciones.map(e => e.id);

    // Calcular evolución por parcial
    const evolucionPorParcial = [];
    for (const parcial of parciales) {
      const evaluacionesParcial = evaluaciones.filter(e => e.parcialId === parcial.id);
      const evalIds = evaluacionesParcial.map(e => e.id);

      if (evalIds.length > 0) {
        const notasParcial = await EvaluacionesEstudiantes.findAll({
          where: {
            evaluacionId: { [Op.in]: evalIds },
            estudianteId: { [Op.in]: estudiantesIds }
          },
          attributes: ['nota']
        });

        const promedio = notasParcial.length > 0
          ? notasParcial.reduce((sum, n) => sum + parseFloat(n.nota || 0), 0) / notasParcial.length
          : 0;

        evolucionPorParcial.push({
          parcialId: parcial.id,
          nombre: parcial.nombre,
          promedio: parseFloat(promedio.toFixed(2))
        });
      }
    }

    // Obtener proyectos de la clase
    const proyectos = await Proyectos.findAll({
      where: { claseId },
      attributes: ['id', 'nombre']
    });

    const proyectosIds = proyectos.map(p => p.id);

    // Contar proyectos entregados y pendientes
    const asignacionesProyectos = await ProyectoEstudiantes.findAll({
      where: {
        proyectoId: { [Op.in]: proyectosIds },
        estudianteId: { [Op.in]: estudiantesIds }
      },
      attributes: ['estadoEntrega', 'estudianteId', 'proyectoId']
    });

    const proyectosEntregados = asignacionesProyectos.filter(p => p.estadoEntrega === 'ENTREGADO').length;
    const proyectosPendientes = asignacionesProyectos.filter(p => p.estadoEntrega === 'NO_ENTREGADO').length;

    // Calcular estadísticas por estudiante
    const detalleEstudiantes = [];
    let sumaPromedios = 0;
    let sumaAsistenciasTotal = 0;
    let sumaInasistenciasTotal = 0;
    let totalClasesGlobal = 0;

    for (const inscripcion of inscripciones) {
      const estudiante = inscripcion.estudiante;

      // Obtener todas las notas del periodo
      const notas = await EvaluacionesEstudiantes.findAll({
        where: {
          estudianteId: estudiante.id,
          evaluacionId: { [Op.in]: evaluacionesIds }
        },
        attributes: ['nota']
      });

      const promedioGeneral = notas.length > 0
        ? notas.reduce((sum, n) => sum + parseFloat(n.nota || 0), 0) / notas.length
        : 0;

      // Obtener asistencias del periodo
      const asistencias = await Asistencia.findAll({
        where: {
          estudianteId: estudiante.id,
          claseId,
          periodoId
        },
        attributes: ['estado']
      });

      const totalAsistencias = asistencias.length;
      const presentes = asistencias.filter(a => a.estado === 'PRESENTE').length;
      const tardanzas = asistencias.filter(a => a.estado === 'TARDANZA').length;
      const ausentes = asistencias.filter(a => a.estado === 'AUSENTE').length;

      const asistenciaEfectiva = presentes + (tardanzas * 0.5);
      const porcentajeAsistencia = totalAsistencias > 0
        ? (asistenciaEfectiva / totalAsistencias) * 100
        : 0;

      // Proyectos del estudiante
      const proyectosEstudiante = asignacionesProyectos.filter(p => p.estudianteId === estudiante.id);
      const proyectosEntregadosEst = proyectosEstudiante.filter(p => p.estadoEntrega === 'ENTREGADO').length;
      const proyectosPendientesEst = proyectosEstudiante.filter(p => p.estadoEntrega === 'NO_ENTREGADO').length;

      detalleEstudiantes.push({
        estudianteId: estudiante.id,
        nombre: estudiante.nombre,
        correo: estudiante.correo,
        promedioGeneral: parseFloat(promedioGeneral.toFixed(2)),
        asistenciaTotal: presentes,
        tardanzasTotal: tardanzas,
        inasistenciasTotal: ausentes,
        totalClases: totalAsistencias,
        porcentajeAsistencia: parseFloat(porcentajeAsistencia.toFixed(2)),
        proyectosEntregados: proyectosEntregadosEst,
        proyectosPendientes: proyectosPendientesEst
      });

      sumaPromedios += promedioGeneral;
      sumaAsistenciasTotal += presentes + tardanzas;
      sumaInasistenciasTotal += ausentes;
      totalClasesGlobal += totalAsistencias;
    }

    const totalEstudiantes = estudiantesIds.length;

    const estadisticas = {
      promedioAcumulado: totalEstudiantes > 0
        ? parseFloat((sumaPromedios / totalEstudiantes).toFixed(2))
        : 0,
      porcentajeAsistencia: totalClasesGlobal > 0
        ? parseFloat(((sumaAsistenciasTotal / totalClasesGlobal) * 100).toFixed(2))
        : 0,
      porcentajeInasistencias: totalClasesGlobal > 0
        ? parseFloat(((sumaInasistenciasTotal / totalClasesGlobal) * 100).toFixed(2))
        : 0,
      proyectosEntregados,
      proyectosPendientes,
      totalProyectos: proyectosEntregados + proyectosPendientes
    };

    res.json({
      periodo,
      clase: {
        id: clase.id,
        codigo: clase.codigo,
        nombre: clase.nombre,
        docente: clase.docente
      },
      estadisticas,
      evolucionPorParcial,
      detalleEstudiantes
    });

  } catch (error) {
    console.error('Error al analizar periodo:', error);
    res.status(500).json({ error: 'Error al analizar periodo', detalle: error.message });
  }
};

/* ========================================
   REPORTE POR ESTUDIANTE
   ======================================== */
exports.ReporteEstudiante = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { estudianteId, periodoId } = req.query;

  try {
    const estudiante = await Estudiantes.findByPk(estudianteId);
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    const periodo = await Periodos.findByPk(periodoId);
    if (!periodo) {
      return res.status(404).json({ error: 'Periodo no encontrado' });
    }

    // Obtener clases del estudiante en este periodo
    const inscripciones = await EstudiantesClases.findAll({
      where: { estudianteId },
      include: [{
        model: Clases,
        as: 'clase',
        attributes: ['id', 'codigo', 'nombre'],
        include: [{
          model: Docentes,
          as: 'docente',
          attributes: ['nombre']
        }]
      }]
    });

    const reporteClases = [];

    for (const inscripcion of inscripciones) {
      const clase = inscripcion.clase;

      // Evaluaciones del periodo para esta clase
      const evaluaciones = await Evaluaciones.findAll({
        where: { periodoId, claseId: clase.id },
        attributes: ['id']
      });

      const evalIds = evaluaciones.map(e => e.id);

      // Notas del estudiante
      const notas = await EvaluacionesEstudiantes.findAll({
        where: {
          estudianteId,
          evaluacionId: { [Op.in]: evalIds }
        },
        attributes: ['nota']
      });

      const promedio = notas.length > 0
        ? notas.reduce((sum, n) => sum + parseFloat(n.nota || 0), 0) / notas.length
        : 0;

      // Asistencias
      const asistencias = await Asistencia.findAll({
        where: {
          estudianteId,
          claseId: clase.id,
          periodoId
        },
        attributes: ['estado']
      });

      const totalAsistencias = asistencias.length;
      const presentes = asistencias.filter(a => a.estado === 'PRESENTE').length;
      const porcentajeAsistencia = totalAsistencias > 0
        ? (presentes / totalAsistencias) * 100
        : 0;

      // Proyectos
      const proyectos = await Proyectos.findAll({
        where: { claseId: clase.id },
        attributes: ['id']
      });

      const proyectosIds = proyectos.map(p => p.id);
      const asignacionesProyectos = await ProyectoEstudiantes.findAll({
        where: {
          estudianteId,
          proyectoId: { [Op.in]: proyectosIds }
        },
        attributes: ['estadoEntrega']
      });

      const proyectosEntregados = asignacionesProyectos.filter(p => p.estadoEntrega === 'ENTREGADO').length;
      const proyectosPendientes = asignacionesProyectos.filter(p => p.estadoEntrega === 'NO_ENTREGADO').length;

      reporteClases.push({
        claseId: clase.id,
        codigo: clase.codigo,
        nombre: clase.nombre,
        docente: clase.docente.nombre,
        promedio: parseFloat(promedio.toFixed(2)),
        porcentajeAsistencia: parseFloat(porcentajeAsistencia.toFixed(2)),
        proyectosEntregados,
        proyectosPendientes
      });
    }

    res.json({
      estudiante: {
        id: estudiante.id,
        nombre: estudiante.nombre,
        correo: estudiante.correo
      },
      periodo: {
        id: periodo.id,
        nombre: periodo.nombre
      },
      clases: reporteClases
    });

  } catch (error) {
    console.error('Error al generar reporte de estudiante:', error);
    res.status(500).json({ error: 'Error al generar reporte de estudiante', detalle: error.message });
  }
};

/* ========================================
   REPORTE POR CLASE
   ======================================== */
exports.ReporteClase = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { claseId, periodoId } = req.query;

  try {
    const clase = await Clases.findByPk(claseId, {
      include: [{ model: Docentes, as: 'docente', attributes: ['id', 'nombre'] }]
    });

    if (!clase) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    // Validar autorización
    if (req.usuario && req.usuario.docenteId && clase.docenteId !== req.usuario.docenteId) {
      return res.status(403).json({ error: 'No autorizado para ver esta clase' });
    }

    const periodo = await Periodos.findByPk(periodoId);
    if (!periodo) {
      return res.status(404).json({ error: 'Periodo no encontrado' });
    }

    // Obtener parciales
    const parciales = await Parciales.findAll({
      where: { periodoId },
      order: [['fechaInicio', 'ASC']]
    });

    // Obtener estudiantes
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId },
      include: [{
        model: Estudiantes,
        as: 'estudiante',
        attributes: ['id', 'nombre', 'correo']
      }]
    });

    const estadisticasPorParcial = [];

    for (const parcial of parciales) {
      const evaluaciones = await Evaluaciones.findAll({
        where: { parcialId: parcial.id, claseId },
        attributes: ['id']
      });

      const evalIds = evaluaciones.map(e => e.id);
      const estudiantesIds = inscripciones.map(i => i.estudianteId);

      const notas = await EvaluacionesEstudiantes.findAll({
        where: {
          evaluacionId: { [Op.in]: evalIds },
          estudianteId: { [Op.in]: estudiantesIds }
        },
        attributes: ['nota']
      });

      const promedio = notas.length > 0
        ? notas.reduce((sum, n) => sum + parseFloat(n.nota || 0), 0) / notas.length
        : 0;

      estadisticasPorParcial.push({
        parcialId: parcial.id,
        nombre: parcial.nombre,
        promedio: parseFloat(promedio.toFixed(2))
      });
    }

    res.json({
      clase: {
        id: clase.id,
        codigo: clase.codigo,
        nombre: clase.nombre,
        docente: clase.docente
      },
      periodo: {
        id: periodo.id,
        nombre: periodo.nombre
      },
      estadisticasPorParcial,
      totalEstudiantes: inscripciones.length
    });

  } catch (error) {
    console.error('Error al generar reporte de clase:', error);
    res.status(500).json({ error: 'Error al generar reporte de clase', detalle: error.message });
  }
};

/* ========================================
   REPORTE POR DOCENTE
   ======================================== */
exports.ReporteDocente = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { docenteId, periodoId } = req.query;

  try {
    const docente = await Docentes.findByPk(docenteId);
    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }

    // Validar autorización
    if (req.usuario && req.usuario.docenteId && req.usuario.docenteId !== parseInt(docenteId)) {
      return res.status(403).json({ error: 'No autorizado para ver este docente' });
    }

    const periodo = await Periodos.findByPk(periodoId);
    if (!periodo) {
      return res.status(404).json({ error: 'Periodo no encontrado' });
    }

    // Obtener todas las clases del docente
    const clases = await Clases.findAll({
      where: { docenteId },
      attributes: ['id', 'codigo', 'nombre']
    });

    const reporteClases = [];

    for (const clase of clases) {
      // Estudiantes inscritos
      const inscripciones = await EstudiantesClases.findAll({
        where: { claseId: clase.id }
      });

      const estudiantesIds = inscripciones.map(i => i.estudianteId);

      // Evaluaciones del periodo
      const evaluaciones = await Evaluaciones.findAll({
        where: { claseId: clase.id, periodoId },
        attributes: ['id']
      });

      const evalIds = evaluaciones.map(e => e.id);

      // Notas
      const notas = await EvaluacionesEstudiantes.findAll({
        where: {
          evaluacionId: { [Op.in]: evalIds },
          estudianteId: { [Op.in]: estudiantesIds }
        },
        attributes: ['nota']
      });

      const promedio = notas.length > 0
        ? notas.reduce((sum, n) => sum + parseFloat(n.nota || 0), 0) / notas.length
        : 0;

      // Asistencias
      const asistencias = await Asistencia.findAll({
        where: {
          claseId: clase.id,
          periodoId,
          estudianteId: { [Op.in]: estudiantesIds }
        },
        attributes: ['estado']
      });

      const totalAsistencias = asistencias.length;
      const presentes = asistencias.filter(a => a.estado === 'PRESENTE').length;
      const porcentajeAsistencia = totalAsistencias > 0
        ? (presentes / totalAsistencias) * 100
        : 0;

      reporteClases.push({
        claseId: clase.id,
        codigo: clase.codigo,
        nombre: clase.nombre,
        totalEstudiantes: estudiantesIds.length,
        promedioGeneral: parseFloat(promedio.toFixed(2)),
        porcentajeAsistencia: parseFloat(porcentajeAsistencia.toFixed(2))
      });
    }

    res.json({
      docente: {
        id: docente.id,
        nombre: docente.nombre,
        correo: docente.correo
      },
      periodo: {
        id: periodo.id,
        nombre: periodo.nombre
      },
      clases: reporteClases,
      totalClases: clases.length
    });

  } catch (error) {
    console.error('Error al generar reporte de docente:', error);
    res.status(500).json({ error: 'Error al generar reporte de docente', detalle: error.message });
  }
};

module.exports = exports;
