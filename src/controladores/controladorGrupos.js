const Grupos = require('../modelos/Grupos');
const GrupoEstudiantes = require('../modelos/GrupoEstudiantes');
const Estudiantes = require('../modelos/Estudiantes');
const Proyectos = require('../modelos/Proyectos');
const Clases = require('../modelos/Clases');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const { validationResult } = require('express-validator');

/* Validar cantidad de estudiantes aleatorios */
exports.ValidarCantidadEstudiantes = async (req, res) => {
  const { claseId, cantidad } = req.query;
  
  if (!claseId) {
    return res.status(400).json({ error: 'claseId es requerido' });
  }
  
  if (!cantidad) {
    return res.status(400).json({ error: 'cantidad es requerida' });
  }

  try {
    // Obtener estudiantes inscritos en la clase
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId: parseInt(claseId) }
    });

    const totalEstudiantes = inscripciones.length;
    const cantidadSolicitada = parseInt(cantidad);

    if (cantidadSolicitada > totalEstudiantes) {
      return res.status(400).json({
        error: 'Cantidad excedida',
        mensaje: `La cantidad solicitada (${cantidadSolicitada}) es mayor a los estudiantes disponibles (${totalEstudiantes})`,
        totalDisponibles: totalEstudiantes,
        cantidadSolicitada: cantidadSolicitada,
        valido: false
      });
    }

    res.json({
      mensaje: 'Cantidad válida',
      totalDisponibles: totalEstudiantes,
      cantidadSolicitada: cantidadSolicitada,
      valido: true
    });
  } catch (error) {
    console.error('Error validar cantidad estudiantes:', error);
    res.status(500).json({ error: 'Error al validar cantidad de estudiantes' });
  }
};

/* Rifar proyectos y crear grupos automáticamente */
exports.RifarProyectosAGrupos = async (req, res) => {
  const { claseId } = req.body;

  if (!claseId) {
    return res.status(400).json({ error: 'claseId es requerido' });
  }

  try {
    // Verificar que la clase exista
    const clase = await Clases.findByPk(claseId);
    if (!clase) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    // Obtener proyectos de la clase
    const proyectos = await Proyectos.findAll({
      where: { claseId: claseId }
    });

    if (proyectos.length === 0) {
      return res.status(400).json({ error: 'No hay proyectos en esta clase para rifar' });
    }

    // Verificar si ya existen grupos para esta clase
    const gruposExistentes = await Grupos.findAll({
      where: { claseId: claseId }
    });

    if (gruposExistentes.length > 0) {
      return res.status(400).json({ 
        error: 'Ya existen grupos para esta clase',
        mensaje: 'Elimine los grupos existentes antes de rifar nuevamente'
      });
    }

    // Mezclar proyectos aleatoriamente (Fisher-Yates shuffle)
    const proyectosMezclados = [...proyectos];
    for (let i = proyectosMezclados.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [proyectosMezclados[i], proyectosMezclados[j]] = [proyectosMezclados[j], proyectosMezclados[i]];
    }

    // Crear grupos y asignar proyectos
    const gruposCreados = [];
    for (let i = 0; i < proyectosMezclados.length; i++) {
      const proyecto = proyectosMezclados[i];
      const grupo = await Grupos.create({
        nombre: `Grupo ${i + 1}`,
        claseId: claseId,
        proyectoId: proyecto.id
      });

      gruposCreados.push({
        grupoId: grupo.id,
        grupoNombre: grupo.nombre,
        proyectoId: proyecto.id,
        proyectoNombre: proyecto.nombre,
        orden: i + 1
      });
    }

    res.status(201).json({
      mensaje: 'Proyectos rifados y grupos creados exitosamente',
      totalGrupos: gruposCreados.length,
      grupos: gruposCreados
    });
  } catch (error) {
    console.error('Error rifar proyectos:', error);
    res.status(500).json({ error: 'Error al rifar proyectos', detalle: error.message });
  }
};

/* Asignar estudiantes a un grupo */
exports.AsignarEstudiantesAGrupo = async (req, res) => {
  const { grupoId, estudiantesIds } = req.body;

  if (!grupoId) {
    return res.status(400).json({ error: 'grupoId es requerido' });
  }

  if (!estudiantesIds || !Array.isArray(estudiantesIds) || estudiantesIds.length === 0) {
    return res.status(400).json({ error: 'estudiantesIds debe ser un array con al menos un estudiante' });
  }

  try {
    // Verificar que el grupo exista
    const grupo = await Grupos.findByPk(grupoId);
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Verificar que los estudiantes pertenezcan a la clase
    const inscripciones = await EstudiantesClases.findAll({
      where: { 
        claseId: grupo.claseId,
        estudianteId: estudiantesIds
      }
    });

    if (inscripciones.length !== estudiantesIds.length) {
      return res.status(400).json({ 
        error: 'Algunos estudiantes no están inscritos en esta clase' 
      });
    }

    // Verificar que los estudiantes no estén ya en otro grupo de la misma clase
    const gruposClase = await Grupos.findAll({
      where: { claseId: grupo.claseId },
      include: [{
        model: Estudiantes,
        as: 'estudiantes',
        attributes: ['id']
      }]
    });

    const estudiantesEnGrupos = new Set();
    gruposClase.forEach(g => {
      if (g.id !== grupo.id && g.estudiantes) {
        g.estudiantes.forEach(e => estudiantesEnGrupos.add(e.id));
      }
    });

    const estudiantesDuplicados = estudiantesIds.filter(id => estudiantesEnGrupos.has(id));
    if (estudiantesDuplicados.length > 0) {
      return res.status(400).json({ 
        error: 'Algunos estudiantes ya están en otro grupo',
        estudiantesDuplicados: estudiantesDuplicados
      });
    }

    // Limpiar asignaciones anteriores del grupo
    await GrupoEstudiantes.destroy({
      where: { grupoId: grupoId }
    });

    // Asignar nuevos estudiantes
    const asignaciones = estudiantesIds.map(estudianteId => ({
      grupoId: grupoId,
      estudianteId: estudianteId
    }));

    await GrupoEstudiantes.bulkCreate(asignaciones);

    res.json({
      mensaje: 'Estudiantes asignados al grupo exitosamente',
      grupoId: grupoId,
      totalEstudiantes: estudiantesIds.length
    });
  } catch (error) {
    console.error('Error asignar estudiantes:', error);
    res.status(500).json({ error: 'Error al asignar estudiantes al grupo', detalle: error.message });
  }
};

/* Listar grupos de una clase con sus estudiantes y proyectos */
exports.ListarGruposPorClase = async (req, res) => {
  const { claseId } = req.query;

  if (!claseId) {
    return res.status(400).json({ error: 'claseId es requerido' });
  }

  try {
    const grupos = await Grupos.findAll({
      where: { claseId: claseId },
      include: [
        {
          model: Proyectos,
          as: 'proyecto',
          attributes: ['id', 'nombre', 'descripcion', 'fecha_entrega', 'estado']
        },
        {
          model: Estudiantes,
          as: 'estudiantes',
          attributes: ['id', 'nombre', 'correo', 'estado'],
          through: { attributes: [] }
        }
      ],
      order: [['nombre', 'ASC']]
    });

    res.json({
      claseId: parseInt(claseId),
      totalGrupos: grupos.length,
      grupos: grupos
    });
  } catch (error) {
    console.error('Error listar grupos:', error);
    res.status(500).json({ error: 'Error al listar grupos' });
  }
};

/* Eliminar todos los grupos de una clase */
exports.EliminarGruposDeClase = async (req, res) => {
  const { claseId } = req.query;

  if (!claseId) {
    return res.status(400).json({ error: 'claseId es requerido' });
  }

  try {
    // Obtener grupos de la clase
    const grupos = await Grupos.findAll({
      where: { claseId: claseId }
    });

    if (grupos.length === 0) {
      return res.status(404).json({ mensaje: 'No hay grupos en esta clase' });
    }

    const grupoIds = grupos.map(g => g.id);

    // Eliminar asignaciones de estudiantes
    await GrupoEstudiantes.destroy({
      where: { grupoId: grupoIds }
    });

    // Eliminar grupos
    await Grupos.destroy({
      where: { claseId: claseId }
    });

    res.json({
      mensaje: 'Grupos eliminados exitosamente',
      totalEliminados: grupos.length
    });
  } catch (error) {
    console.error('Error eliminar grupos:', error);
    res.status(500).json({ error: 'Error al eliminar grupos' });
  }
};
