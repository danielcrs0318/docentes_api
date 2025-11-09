const Proyectos = require('../modelos/Proyectos');
const Estudiantes = require('../modelos/Estudiantes');
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

/* Asignación aleatoria (body: proyectoId, cantidad) */
exports.AsignarAleatorio = async (req, res) => {
  const { proyectoId, cantidad } = req.body;
  if (!proyectoId) return res.status(400).json({ error: 'proyectoId requerido' });

  try {
    const proyecto = await Proyectos.findByPk(proyectoId);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const where = proyecto.claseId ? { claseId: proyecto.claseId } : {};
    const pool = await Estudiantes.findAll({ where, attributes: ['id'] });
    if (!pool.length) return res.status(400).json({ error: 'No hay estudiantes disponibles' });

    const ids = pool.map(p => p.id);
    const n = cantidad ? Math.min(parseInt(cantidad,10), ids.length) : 1;
    const seleccion = [];
    while (seleccion.length < n) {
      const idx = Math.floor(Math.random() * ids.length);
      const [id] = ids.splice(idx, 1);
      seleccion.push(id);
    }

    const asignados = [];
    for (const estId of seleccion) {
      const est = await Estudiantes.findByPk(estId);
      const existe = await proyecto.hasEstudiante(est);
      if (!existe) {
        await proyecto.addEstudiante(est);
        asignados.push(estId);
      }
    }

    res.json({ message: 'Asignación aleatoria completada', asignados });
  } catch (error) {
    console.error('Error asignar aleatorio:', error);
    res.status(500).json({ error: 'Error en asignación aleatoria', detalle: error.message });
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