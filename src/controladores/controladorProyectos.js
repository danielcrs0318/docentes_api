const Proyectos = require('../modelos/Proyectos');
const Estudiantes = require('../modelos/Estudiantes');
<<<<<<< HEAD
const EstudiantesClases = require('../modelos/EstudiantesClases');
const ProyectoEstudiantes = require('../modelos/ProyectoEstudiantes');
=======
const Clases = require('../modelos/Clases');
const EstudiantesClases = require('../modelos/EstudiantesClases');
>>>>>>> 349642b084f1e7eff58c4e56074be4a47ca2b060
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
  
  // claseId es OBLIGATORIO
  if (!claseId) {
    return res.status(400).json({ error: 'claseId es obligatorio para crear un proyecto' });
  }

  try {
    // Verificar que la clase exista
    const claseExiste = await Clases.findByPk(claseId);
    if (!claseExiste) {
      return res.status(404).json({ error: `No existe una clase con id ${claseId}` });
    }

    const nuevo = await Proyectos.create({
      nombre,
      descripcion: descripcion || null,
      fecha_entrega: fecha_entrega || null,
      estado: estado || 'PENDIENTE',
      claseId: claseId
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

    if (!proyecto.claseId) {
      return res.status(400).json({ error: 'El proyecto no tiene una clase asignada' });
    }

    // Obtener estudiantes inscritos en la clase del proyecto
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId: proyecto.claseId },
      attributes: ['estudianteId']
    });
    const estudiantesEnClase = inscripciones.map(i => i.estudianteId);

    if (estudiantesEnClase.length === 0) {
      return res.status(400).json({ error: 'No hay estudiantes inscritos en la clase del proyecto' });
    }

    const asignados = [];
    const rechazados = [];
    
    for (const estId of estudiantes) {
      // Validar que el estudiante esté inscrito en la clase
      if (!estudiantesEnClase.includes(estId)) {
        rechazados.push({ estudianteId: estId, razon: 'No está inscrito en la clase del proyecto' });
        continue;
      }

      const est = await Estudiantes.findByPk(estId);
      if (!est) {
        rechazados.push({ estudianteId: estId, razon: 'Estudiante no encontrado' });
        continue;
      }

      // Evitar duplicados
      const existe = await proyecto.hasEstudiante(est);
      if (!existe) {
        await proyecto.addEstudiante(est);
        asignados.push(estId);
      } else {
        rechazados.push({ estudianteId: estId, razon: 'Ya estaba asignado al proyecto' });
      }
    }
    
    res.json({ 
      message: 'Asignación completada', 
      totalAsignados: asignados.length, 
      asignados,
      rechazados: rechazados.length > 0 ? rechazados : undefined
    });
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
<<<<<<< HEAD
    // determinar claseId objetivo
    let targetClaseId = claseId;
    if (proyectoId) {
      const proyecto = await Proyectos.findByPk(proyectoId);
      if (!proyecto) return res.status(404).json({ error: 'proyectoId no encontrado' });
      if (!proyecto.claseId) return res.status(400).json({ error: 'El proyecto no tiene asociada una clase (claseId)' });
      targetClaseId = proyecto.claseId;
=======
    const proyecto = await Proyectos.findByPk(proyectoId);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    if (!proyecto.claseId) {
      return res.status(400).json({ error: 'El proyecto no tiene una clase asignada' });
    }

    // Obtener SOLO estudiantes inscritos en la clase del proyecto
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId: proyecto.claseId },
      include: [{
        model: Estudiantes,
        as: 'estudiante',
        attributes: ['id', 'nombre', 'correo']
      }]
    });

    if (inscripciones.length === 0) {
      return res.status(400).json({ error: 'No hay estudiantes inscritos en la clase del proyecto' });
    }

    const pool = inscripciones.map(i => i.estudiante.id);
    const n = cantidad ? Math.min(parseInt(cantidad, 10), pool.length) : 1;
    
    const seleccion = [];
    const poolCopy = [...pool];
    while (seleccion.length < n && poolCopy.length > 0) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      const [id] = poolCopy.splice(idx, 1);
      seleccion.push(id);
>>>>>>> 349642b084f1e7eff58c4e56074be4a47ca2b060
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

<<<<<<< HEAD
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
=======
    res.json({ 
      message: 'Asignación aleatoria completada', 
      totalDisponibles: pool.length,
      asignados 
    });
  } catch (error) {
    console.error('Error asignar aleatorio:', error);
    res.status(500).json({ error: 'Error en asignación aleatoria', detalle: error.message });
>>>>>>> 349642b084f1e7eff58c4e56074be4a47ca2b060
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

/* Listar estudiantes disponibles para asignar a un proyecto (inscritos en su clase) */
exports.EstudiantesDisponibles = async (req, res) => {
  const { proyectoId } = req.query;
  if (!proyectoId) return res.status(400).json({ error: 'proyectoId requerido' });

  try {
    const proyecto = await Proyectos.findByPk(proyectoId);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    if (!proyecto.claseId) {
      return res.status(400).json({ error: 'El proyecto no tiene una clase asignada' });
    }

    // Obtener estudiantes inscritos en la clase del proyecto
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId: proyecto.claseId },
      include: [{
        model: Estudiantes,
        as: 'estudiante',
        attributes: ['id', 'nombre', 'correo', 'estado']
      }]
    });

    const estudiantesDisponibles = inscripciones.map(i => i.estudiante);

    res.json({ 
      proyectoId: proyecto.id,
      proyectoNombre: proyecto.nombre,
      claseId: proyecto.claseId,
      totalEstudiantes: estudiantesDisponibles.length,
      estudiantes: estudiantesDisponibles 
    });
  } catch (error) {
    console.error('Error obtener estudiantes disponibles:', error);
    res.status(500).json({ error: 'Error al obtener estudiantes disponibles' });
  }
};