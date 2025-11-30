const Proyectos = require('../modelos/Proyectos');
const Estudiantes = require('../modelos/Estudiantes');
const Clases = require('../modelos/Clases');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const { validationResult } = require('express-validator');
const { enviarCorreo, generarPlantillaCorreo } = require('../configuraciones/correo');

/* Listar todos los proyectos con estudiantes asignados */
exports.ListarProyectos = async (req, res) => {
  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const { rol, docenteId } = req.usuario;
  const where = {};

  // Filtrar por docente si el rol es DOCENTE
  if (rol === 'DOCENTE') {
    where['$clase.docenteId$'] = docenteId;
  }

  try {
    const proyectos = await Proyectos.findAll({
      where,
      include: [
        {
          model: Clases,
          as: 'clase',
          attributes: ['id', 'nombre', 'docenteId'],
          required: rol === 'DOCENTE' // INNER JOIN para DOCENTE, LEFT JOIN para ADMIN
        },
        {
          model: Estudiantes,
          as: 'estudiantes',
          attributes: ['id', 'nombre', 'correo']
        }
      ]
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

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const proyecto = await Proyectos.findByPk(id, {
      include: [
        {
          model: Clases,
          as: 'clase',
          attributes: ['id', 'nombre', 'docenteId']
        },
        {
          model: Estudiantes,
          as: 'estudiantes',
          attributes: ['id', 'nombre', 'correo']
        }
      ]
    });

    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && proyecto.clase?.docenteId !== docenteId) {
      return res.status(403).json({ error: 'No tiene permiso para ver este proyecto' });
    }

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

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

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

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && claseExiste?.docenteId !== docenteId) {
      return res.status(403).json({ error: 'No tiene permiso para crear proyectos en esta clase' });
    }

    const nuevo = await Proyectos.create({
      nombre,
      descripcion: descripcion || null,
      fecha_entrega: fecha_entrega || null,
      estado: estado || 'PENDIENTE',
      claseId: claseId
    });

    // Obtener estudiantes de la clase para notificar
    const inscripciones = await EstudiantesClases.findAll({
      where: { claseId },
      include: [{ model: Estudiantes, as: 'estudiante', attributes: ['correo', 'nombre'] }]
    });

    // Enviar correos a estudiantes
    inscripciones.forEach(inscripcion => {
      if (inscripcion.estudiante?.correo) {
        const asunto = `Nuevo proyecto asignado - ${nombre}`;
        const contenidoInterno = `
          <h2>¡Hola ${inscripcion.estudiante.nombre}! 👋</h2>
          <p>Se ha creado un nuevo proyecto en tu clase.</p>
          <div class="info-box">
            <p><strong>📚 Clase:</strong> ${claseExiste.nombre}</p>
            <p><strong>📝 Proyecto:</strong> ${nombre}</p>
            ${descripcion ? `<p><strong>📖 Descripción:</strong> ${descripcion}</p>` : ''}
            ${fecha_entrega ? `<p><strong>📅 Fecha de entrega:</strong> ${new Date(fecha_entrega).toLocaleDateString('es-ES')}</p>` : ''}
            <p><strong>📋 Estado:</strong> ${estado || 'PENDIENTE'}</p>
          </div>
          <p>Por favor revisa la plataforma para más detalles y comenzar tu trabajo.</p>
        `;
        const contenido = generarPlantillaCorreo('Nuevo Proyecto', contenidoInterno);
        enviarCorreo(inscripcion.estudiante.correo, asunto, contenido).catch(err => 
          console.error(`Error enviando correo a ${inscripcion.estudiante.correo}:`, err.message)
        );
      }
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

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id es requerido' });
  const { nombre, descripcion, fecha_entrega, estado, claseId } = req.body;

  try {
    const proyecto = await Proyectos.findByPk(id, {
      include: [{
        model: Clases,
        as: 'clase',
        attributes: ['id', 'nombre', 'docenteId']
      }]
    });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && proyecto.clase?.docenteId !== docenteId) {
      return res.status(403).json({ error: 'No tiene permiso para actualizar este proyecto' });
    }

    proyecto.nombre = nombre;
    proyecto.descripcion = (typeof descripcion !== 'undefined') ? descripcion : proyecto.descripcion;
    proyecto.fecha_entrega = fecha_entrega || proyecto.fecha_entrega;
    proyecto.estado = estado || proyecto.estado;
    proyecto.claseId = (typeof claseId !== 'undefined') ? claseId : proyecto.claseId;

    await proyecto.save();

    // Obtener estudiantes asignados al proyecto
    const proyectoConEstudiantes = await Proyectos.findByPk(id, {
      include: [{ model: Estudiantes, as: 'estudiantes', attributes: ['correo', 'nombre'] }]
    });

    // Enviar correos a estudiantes asignados
    if (proyectoConEstudiantes?.estudiantes) {
      proyectoConEstudiantes.estudiantes.forEach(estudiante => {
        if (estudiante.correo) {
          const asunto = `Proyecto actualizado - ${nombre}`;
          const contenidoInterno = `
            <h2>¡Hola ${estudiante.nombre}! 👋</h2>
            <p>Se ha actualizado el proyecto <strong>${nombre}</strong> en el que estás trabajando.</p>
            <div class="info-box">
              <p><strong>📝 Proyecto:</strong> ${nombre}</p>
              ${descripcion ? `<p><strong>📖 Descripción:</strong> ${descripcion}</p>` : ''}
              ${fecha_entrega ? `<p><strong>📅 Fecha de entrega:</strong> ${new Date(fecha_entrega).toLocaleDateString('es-ES')}</p>` : ''}
              <p><strong>📋 Estado:</strong> ${estado || 'PENDIENTE'}</p>
            </div>
            <p>Por favor revisa la plataforma para ver los cambios completos.</p>
          `;
          const contenido = generarPlantillaCorreo('Proyecto Actualizado', contenidoInterno);
          enviarCorreo(estudiante.correo, asunto, contenido).catch(err => 
            console.error(`Error enviando correo a ${estudiante.correo}:`, err.message)
          );
        }
      });
    }

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

  // Validar autenticación
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const proyecto = await Proyectos.findByPk(id, {
      include: [
        {
          model: Clases,
          as: 'clase',
          attributes: ['id', 'nombre', 'docenteId']
        },
        {
          model: Estudiantes,
          as: 'estudiantes',
          attributes: ['correo', 'nombre']
        }
      ]
    });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && proyecto.clase?.docenteId !== docenteId) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar este proyecto' });
    }

    // Enviar correos antes de eliminar
    if (proyecto.estudiantes) {
      proyecto.estudiantes.forEach(estudiante => {
        if (estudiante.correo) {
          const asunto = `Proyecto eliminado - ${proyecto.nombre}`;
          const contenidoInterno = `
            <h2>¡Hola ${estudiante.nombre}! 👋</h2>
            <p>El proyecto <strong>${proyecto.nombre}</strong> ha sido eliminado.</p>
            <div class="info-box">
              <p><strong>📝 Proyecto:</strong> ${proyecto.nombre}</p>
              <p><strong>ℹ️ Estado:</strong> Eliminado</p>
            </div>
            <p>Por favor contacta a tu docente si tienes alguna duda sobre esta acción.</p>
          `;
          const contenido = generarPlantillaCorreo('Proyecto Eliminado', contenidoInterno);
          enviarCorreo(estudiante.correo, asunto, contenido).catch(err => 
            console.error(`Error enviando correo a ${estudiante.correo}:`, err.message)
          );
        }
      });
    }

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

    // Obtener estudiantes ya asignados a cualquier proyecto de la misma clase
    const proyectosEnClase = await Proyectos.findAll({
      where: { claseId: proyecto.claseId },
      include: [{ model: Estudiantes, as: 'estudiantes', attributes: ['id'] }]
    });
    const asignadosEnClase = new Set();
    proyectosEnClase.forEach((pr) => {
      if (!pr.estudiantes) return
      pr.estudiantes.forEach((e) => {
        // No incluir estudiantes que ya están en el proyecto objetivo (serán manejados más abajo)
        if (pr.id !== proyecto.id) asignadosEnClase.add(e.id)
      })
    })

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

      // Validar que el estudiante no esté ya asignado a otro proyecto de la misma clase
      if (asignadosEnClase.has(estId)) {
        rechazados.push({ estudianteId: estId, razon: 'Ya tiene un proyecto en la misma clase' });
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
        
        // Enviar correo de notificación
        if (est.correo) {
          const asunto = `Proyecto asignado - ${proyecto.nombre}`;
          const contenidoInterno = `
            <h2>¡Hola ${est.nombre}! 👋</h2>
            <p>Se te ha asignado un nuevo proyecto.</p>
            <div class="info-box">
              <p><strong>📝 Proyecto:</strong> ${proyecto.nombre}</p>
              ${proyecto.descripcion ? `<p><strong>📖 Descripción:</strong> ${proyecto.descripcion}</p>` : ''}
              ${proyecto.fecha_entrega ? `<p><strong>📅 Fecha de entrega:</strong> ${new Date(proyecto.fecha_entrega).toLocaleDateString('es-ES')}</p>` : ''}
              <p><strong>📋 Estado:</strong> ${proyecto.estado}</p>
            </div>
            <p>Por favor revisa la plataforma para más detalles y comenzar tu trabajo.</p>
          `;
          const contenido = generarPlantillaCorreo('Proyecto Asignado', contenidoInterno);
          enviarCorreo(est.correo, asunto, contenido).catch(err => 
            console.error(`Error enviando correo a ${est.correo}:`, err.message)
          );
        }
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

/* Asignación aleatoria (body: proyectoId, cantidad) */
exports.AsignarAleatorio = async (req, res) => {
  const { proyectoId, cantidad } = req.body;
  if (!proyectoId) return res.status(400).json({ error: 'proyectoId requerido' });

  try {
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

    // Construir pool excluyendo estudiantes ya asignados a otro proyecto de la misma clase
    // Recuperar proyectos en la misma clase y sus estudiantes
    const proyectosEnClase = await Proyectos.findAll({
      where: { claseId: proyecto.claseId },
      include: [{ model: Estudiantes, as: 'estudiantes', attributes: ['id'] }]
    });
    const asignadosEnClase = new Set();
    proyectosEnClase.forEach((pr) => {
      if (!pr.estudiantes) return
      pr.estudiantes.forEach((e) => {
        if (pr.id !== proyecto.id) asignadosEnClase.add(e.id)
      })
    })

    const pool = inscripciones.map(i => i.estudiante.id).filter(id => !asignadosEnClase.has(id));
    const n = cantidad ? Math.min(parseInt(cantidad, 10), pool.length) : 1;
    
    const seleccion = [];
    const poolCopy = [...pool];
    while (seleccion.length < n && poolCopy.length > 0) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      const [id] = poolCopy.splice(idx, 1);
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

    res.json({ 
      message: 'Asignación aleatoria completada', 
      totalDisponibles: pool.length,
      asignados 
    });
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