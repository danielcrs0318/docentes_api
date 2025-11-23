const Proyectos = require('../modelos/Proyectos');
const Estudiantes = require('../modelos/Estudiantes');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const ProyectoEstudiantes = require('../modelos/ProyectoEstudiantes');
const { validationResult } = require('express-validator');

/* Listar todos los proyectos con estudiantes asignados */
exports.ListarProyectos = async (req, res) => {
  try {
    const proyectos = await Proyectos.findAll({
      include: [{
        model: Estudiantes,
        as: 'estudiantes',
        attributes: ['id', 'nombre', 'correo']
      }]
    });
    res.json(proyectos);
  } catch (error) {
    console.error('Error listar proyectos:', error);
    res.status(500).json({ error: 'Error al listar proyectos' });
  }
};

// Obtener proyecto por id (query: id)
exports.ObtenerProyecto = async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id es requerido' });

  try {
    const proyecto = await Proyectos.findByPk(id, {
      include: [{
        model: Estudiantes,
        as: 'estudiantes',
        attributes: ['id', 'nombre', 'correo']
      }]
    });

    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json(proyecto);
  } catch (error) {
    console.error('Error obtener proyecto:', error);
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
};

/* Crear proyecto */
exports.CrearProyecto = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, descripcion, fecha_entrega, estado, claseId } = req.body;
  try {
    const nuevo = await Proyectos.create({
      nombre,
      descripcion: descripcion || null,
      fecha_entrega: fecha_entrega || null,
      estado: estado || 'PENDIENTE, ENCURSO, ENTREGADO, CERRADO',
      claseId: claseId || null 
    });
    res.status(201).json({ message: 'Proyecto creado', proyecto: nuevo });
  } catch (error) {
    console.error('Error crear proyecto:', error);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
};

/* Actualizar proyecto (query.id) */
exports.ActualizarProyecto = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id es requerido' });
  const { nombre, descripcion, fecha_entrega, estado, claseId } = req.body;

  try {
    const proyecto = await Proyectos.findByPk(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    proyecto.nombre = nombre;
    proyecto.descripcion = (typeof descripcion !== 'undefined') ? descripcion : proyecto.descripcion;
    proyecto.fecha_entrega = fecha_entrega || proyecto.fecha_entrega;
    proyecto.estado = estado || proyecto.estado;
    proyecto.claseId = (typeof claseId !== 'undefined') ? claseId : proyecto.claseId;

    await proyecto.save();
    res.json({ message: 'Proyecto actualizado', proyecto });
  } catch (error) {
    console.error('Error actualizar proyecto:', error);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
};

/* Eliminar proyecto (query.id) */
exports.EliminarProyecto = async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id es requerido' });
  try {
    const proyecto = await Proyectos.findByPk(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
    await proyecto.destroy();
    res.json({ message: 'Proyecto eliminado', proyecto });
  } catch (error) {
    console.error('Error eliminar proyecto:', error);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
};

/* Asignar proyecto a lista de estudiantes (body: proyectoId, estudiantes: [id,...]) */
exports.AsignarProyecto = async (req, res) => {
  const { proyectoId, estudiantes } = req.body;
  if (!proyectoId || !Array.isArray(estudiantes)) return res.status(400).json({ error: 'proyectoId y estudiantes[] requeridos' });

  try {
    const proyecto = await Proyectos.findByPk(proyectoId);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const asignados = [];
    for (const estId of estudiantes) {
      const est = await Estudiantes.findByPk(estId);
      if (!est) continue;
      // evitar duplicados: verificar existencia antes de agregar
      const existe = await proyecto.hasEstudiante(est);
      if (!existe) {
        await proyecto.addEstudiante(est); // método generado por Sequelize (alias 'estudiantes')
        asignados.push(estId);
      }
    }
    res.json({ message: 'Asignación completada', totalAsignados: asignados.length, asignados });
  } catch (error) {
    console.error('Error asignar proyecto:', error);
    res.status(500).json({ error: 'Error al asignar proyecto' });
  }
};

/* Asignación aleatoria por clase: asigna aleatoriamente estudiantes a proyectos
   Requisitos:
   - Si se envía `proyectoId`, se valida y se usa su `claseId`.
   - Si no, se requiere `claseId` en body.
   - Cada estudiante se asigna a un único proyecto (1:1 por esta operación).
   - Si hay más estudiantes que proyectos, los sobrantes no se asignan.
   - No se crean asignaciones ya existentes.
   Respuesta: { totalProyectos, totalEstudiantes, asignaciones: [{ proyectoId, estudianteId }] }
*/
exports.AsignarAleatorio = async (req, res) => {
  const { proyectoId, claseId, maxPorProyecto } = req.body;

  try {
    // determinar claseId objetivo
    let targetClaseId = claseId;
    if (proyectoId) {
      const proyecto = await Proyectos.findByPk(proyectoId);
      if (!proyecto) return res.status(404).json({ error: 'proyectoId no encontrado' });
      if (!proyecto.claseId) return res.status(400).json({ error: 'El proyecto no tiene asociada una clase (claseId)' });
      targetClaseId = proyecto.claseId;
    }

    if (!targetClaseId) return res.status(400).json({ error: 'Se requiere proyectoId o claseId' });

    // obtener proyectos y estudiantes de la misma clase
    const proyectos = await Proyectos.findAll({ where: { claseId: targetClaseId } });

    // Los estudiantes están relacionados a clases a través de la tabla EstudiantesClases
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId: targetClaseId },
      include: [{ model: Estudiantes, as: 'estudiante', attributes: ['id', 'nombre', 'correo'] }]
    });
    const estudiantes = inscripciones.map(i => i.estudiante).filter(Boolean);

      // validar y normalizar maxPorProyecto
      const maxPerProject = (typeof maxPorProyecto !== 'undefined') ? parseInt(maxPorProyecto, 10) : 1;
      if (Number.isNaN(maxPerProject) || maxPerProject < 1) {
        return res.status(400).json({ error: 'maxPorProyecto debe ser entero mayor o igual a 1' });
      }

    if (!proyectos || proyectos.length === 0) return res.status(400).json({ error: 'No hay proyectos en la clase indicada' });
    if (!estudiantes || estudiantes.length === 0) return res.status(400).json({ error: 'No hay estudiantes en la clase indicada' });

    // helper: Fisher-Yates shuffle
    const shuffleInPlace = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };

    const proyectosShuffled = proyectos.slice();
    const estudiantesShuffled = estudiantes.slice();
    shuffleInPlace(proyectosShuffled);
    shuffleInPlace(estudiantesShuffled);

    // usar una transacción para agrupación segura
    const sequelize = Proyectos.sequelize || (Estudiantes.sequelize);
    const transaction = sequelize ? await sequelize.transaction() : null;

    try {
      const asignaciones = [];

      // cargar asignaciones existentes para los proyectos de la clase
      const proyectoIds = proyectos.map(p => p.id);
      const existing = await ProyectoEstudiantes.findAll({ where: { proyectoId: proyectoIds } });

      // map de conteo por proyecto y set de estudiantes ya asignados en estos proyectos
      const assignedCountByProject = {};
      const estudianteYaAsignadoSet = new Set();
      for (const row of existing) {
        assignedCountByProject[row.proyectoId] = (assignedCountByProject[row.proyectoId] || 0) + 1;
        estudianteYaAsignadoSet.add(row.estudianteId);
      }

      // inicializar counts para proyectos que no aparecen en existing
      for (const proyecto of proyectos) {
        if (!assignedCountByProject[proyecto.id]) assignedCountByProject[proyecto.id] = 0;
      }

      // asignar: por cada estudiante intentar encontrar un proyecto con capacidad (< maxPerProject)
      const proyectosCapacidad = proyectosShuffled.map(p => ({ id: p.id, nombre: p.nombre }));

      for (const estudiante of estudiantesShuffled) {
        // saltar si el estudiante ya está asignado en alguno de los proyectos de la clase
        if (estudianteYaAsignadoSet.has(estudiante.id)) continue;

        let asignado = false;
        for (const proyecto of proyectosCapacidad) {
          const currentCount = assignedCountByProject[proyecto.id] || 0;
          if (currentCount >= maxPerProject) continue;

          // realizar la asignación
          await ProyectoEstudiantes.create({ proyectoId: proyecto.id, estudianteId: estudiante.id }, transaction ? { transaction } : undefined);
          assignedCountByProject[proyecto.id] = currentCount + 1;
          estudianteYaAsignadoSet.add(estudiante.id);
          asignaciones.push({ proyectoId: proyecto.id, estudianteId: estudiante.id, estudianteNombre: estudiante.nombre });
          asignado = true;
          break;
        }

        // si no hay proyectos con capacidad, terminamos
        if (!asignado) {
          const todosLlenos = proyectosCapacidad.every(p => (assignedCountByProject[p.id] || 0) >= maxPerProject);
          if (todosLlenos) break;
        }
      }

      if (transaction) await transaction.commit();

      return res.json({
        totalProyectos: proyectos.length,
        totalEstudiantes: estudiantes.length,
        maxPorProyecto: maxPerProject,
        asignaciones
      });
    } catch (innerErr) {
      if (transaction) await transaction.rollback();
      console.error('Error durante la asignación en transacción:', innerErr);
      return res.status(500).json({ error: 'Error al realizar asignaciones' });
    }
  } catch (error) {
    console.error('Error asignar aleatorio por clase:', error);
    return res.status(500).json({ error: 'Error en asignación aleatoria por clase' });
  }
};

/* Listar proyectos de un estudiante (query: estudianteId) */
exports.ListarPorEstudiante = async (req, res) => {
  const { estudianteId } = req.query;
  if (!estudianteId) return res.status(400).json({ error: 'estudianteId requerido' });

  try {
    const estudiante = await Estudiantes.findByPk(estudianteId, {
      include: [{ model: Proyectos, as: 'proyectos' }]
    });
    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json(estudiante.proyectos);
  } catch (error) {
    console.error('Error listar por estudiante:', error);
    res.status(500).json({ error: 'Error al listar proyectos del estudiante' });
  }
};