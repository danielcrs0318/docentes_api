const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const db = require('../configuraciones/db');
const Asistencia = require('../modelos/Asistencia');
const Estudiante = require('../modelos/Estudiantes');
const Clase = require('../modelos/Clases');
const Periodo = require('../modelos/Periodos');
const Parcial = require('../modelos/Parciales');
const Secciones = require('../modelos/Secciones');
const { enviarCorreo, generarPlantillaCorreo } = require('../configuraciones/correo');

// Listar todas las asistencias
exports.listarAsistencias = async (req, res) => {
    try {
        const asistencias = await Asistencia.findAll({
            include: [
                {
                    model: Estudiante,
                    as: 'estudiante',
                    attributes: ['nombre', 'correo']
                },
                {
                    model: Clase,
                    as: 'clase',
                    attributes: ['nombre']
                },
                {
                    model: Periodo,
                    as: 'periodo',
                    attributes: ['nombre']
                },
                {
                    model: Parcial,
                    as: 'parcial',
                    attributes: ['nombre']
                }
            ]
        });
        res.json(asistencias);
    } catch (error) {
        console.error('Error listarAsistencias:', error);
        // Devolver mensaje de error para depuración local
        return res.status(500).json({ mensaje: 'Error al obtener las asistencias', error: error.message });
    }
};

// Guardar asistencia
exports.guardarAsistencia = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        // Normalizar entrada
        const payload = { ...req.body };
        if (payload.estado && typeof payload.estado === 'string') payload.estado = payload.estado.toUpperCase().trim();
        if (payload.fecha) payload.fecha = new Date(payload.fecha);

    // Verificar que existan las referencias foráneas antes de crear
    if (!payload.estudianteId) return res.status(400).json({ mensaje: 'estudianteId es requerido' });
    if (!payload.periodoId) return res.status(400).json({ mensaje: 'periodoId es requerido' });
    if (!payload.parcialId) return res.status(400).json({ mensaje: 'parcialId es requerido' });
    if (!payload.claseId) return res.status(400).json({ mensaje: 'claseId es requerido' });

    const estudiante = await Estudiante.findByPk(payload.estudianteId);
    if (!estudiante) return res.status(400).json({ mensaje: `Estudiante con id ${payload.estudianteId} no encontrado` });
    const periodoExists = await Periodo.findByPk(payload.periodoId);
    if (!periodoExists) return res.status(400).json({ mensaje: `Periodo con id ${payload.periodoId} no encontrado` });
    const parcialExists = await Parcial.findByPk(payload.parcialId);
    if (!parcialExists) return res.status(400).json({ mensaje: `Parcial con id ${payload.parcialId} no encontrado` });
    const claseExists = await Clase.findByPk(payload.claseId);
    if (!claseExists) return res.status(400).json({ mensaje: `Clase con id ${payload.claseId} no encontrado` });

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && claseExists.docenteId !== docenteId) {
      return res.status(403).json({ mensaje: 'No tiene permiso para registrar asistencias en esta clase' });
    }

    const asistencia = await Asistencia.create(payload);

    // Enviar correo de notificación al estudiante
    if (estudiante.correo) {
      const asunto = `Asistencia registrada - ${claseExists.nombre}`;
      const contenidoInterno = `
        <h2>¡Hola ${estudiante.nombre}! 👋</h2>
        <p>Se ha registrado tu asistencia para la clase de hoy.</p>
        <div class="info-box">
          <p><strong>📚 Clase:</strong> ${claseExists.nombre}</p>
          <p><strong>✅ Estado:</strong> ${asistencia.estado}</p>
          <p><strong>🗓️ Fecha:</strong> ${new Date(asistencia.fecha).toLocaleDateString('es-ES')}</p>
          ${asistencia.descripcion ? `<p><strong>📝 Descripción:</strong> ${asistencia.descripcion}</p>` : ''}
        </div>
        <p>Revisa la plataforma para ver tu historial completo de asistencias.</p>
      `;
      const contenido = generarPlantillaCorreo('Asistencia Registrada', contenidoInterno);
      enviarCorreo(estudiante.correo, asunto, contenido).catch(err => 
        console.error(`Error enviando correo a ${estudiante.correo}:`, err.message)
      );
    }

    return res.status(201).json({ 
      asistencia, 
      correoEnviado: !!estudiante.correo,
      mensaje: 'Asistencia registrada exitosamente'
    });
    } catch (error) {
        console.error('Error al crear asistencia:', error);
        // Manejar errores de validación de Sequelize
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeDatabaseError') {
            // devolver detalles más útiles para depuración
            const detalles = error.errors ? error.errors.map(e => ({ message: e.message, path: e.path, value: e.value })) : [{ message: error.message }];
            return res.status(400).json({ mensaje: 'Error de validación al guardar asistencia', detalles });
        }
        return res.status(500).json({ mensaje: 'Error al guardar la asistencia', error: error.message });
    }
};

// Guardar asistencias múltiples (por clase, sección o lista de estudiantes)
exports.guardarAsistenciaMultiple = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { fecha, claseId, seccionId, periodoId, parcialId, estudiantes, estadoPredeterminado = 'PRESENTE' } = req.body;

        // Validar que existan parcial y periodo
        const parcial = await Parcial.findOne({ where: { id: parcialId } });
        if (!parcial) return res.status(400).json({ mensaje: 'Parcial no encontrado' });
        const periodo = await Periodo.findOne({ where: { id: periodoId } });
        if (!periodo) return res.status(400).json({ mensaje: 'Periodo no encontrado' });

        // Validar que se especifique al menos un objetivo de asignación
        if (!claseId && !seccionId && (!estudiantes || !Array.isArray(estudiantes) || estudiantes.length === 0)) {
            return res.status(400).json({ 
                mensaje: 'Debe especificar al menos uno: claseId, seccionId o estudiantes (array de {id, estado, descripcion})' 
            });
        }

        // Determinar estudiantes objetivo
        let estudiantesObjetivo = [];
        
        if (Array.isArray(estudiantes) && estudiantes.length > 0) {
            // Si se proporcionó una lista específica de estudiantes
            const estudiantesIds = estudiantes.map(e => e.id);
            estudiantesObjetivo = await Estudiante.findAll({ 
                where: { id: estudiantesIds }
            });
        } else if (seccionId) {
            // Si se especificó una sección
            const seccion = await Secciones.findByPk(seccionId);
            if (!seccion) return res.status(400).json({ mensaje: 'Sección no encontrada' });
            estudiantesObjetivo = await Estudiante.findAll({ 
                where: { seccionId: seccionId }
            });
        } else if (claseId) {
            // Si se especificó una clase
            const clase = await Clase.findByPk(claseId);
            if (!clase) return res.status(400).json({ mensaje: 'Clase no encontrada' });
            estudiantesObjetivo = await Estudiante.findAll({ 
                where: { claseId: claseId }
            });
        }

        if (!estudiantesObjetivo || estudiantesObjetivo.length === 0) {
            return res.status(400).json({ 
                mensaje: 'No se encontraron estudiantes para registrar asistencia' 
            });
        }

        // Crear las asistencias
        const asistenciasACrear = estudiantesObjetivo.map(estudiante => {
            // Buscar si hay un estado específico para este estudiante en el array de estudiantes
            const estudianteInfo = estudiantes?.find(e => e.id === estudiante.id);
            
            return {
                estudianteId: estudiante.id,
                periodoId,
                parcialId,
                claseId,
                fecha,
                estado: estudianteInfo?.estado || estadoPredeterminado,
                descripcion: estudianteInfo?.descripcion || null
            };
        });

        // Verificar si ya existen asistencias para estos estudiantes en esta fecha y clase
        const asistenciasExistentes = await Asistencia.findAll({
            where: {
                fecha,
                claseId,
                estudianteId: estudiantesObjetivo.map(e => e.id)
            }
        });

        if (asistenciasExistentes.length > 0) {
            // Actualizar las asistencias existentes
            for (const asistencia of asistenciasExistentes) {
                const nuevaInfo = asistenciasACrear.find(
                    a => a.estudianteId === asistencia.estudianteId
                );
                if (nuevaInfo) {
                    await asistencia.update({
                        estado: nuevaInfo.estado,
                        descripcion: nuevaInfo.descripcion
                    });
                }
            }

            // Filtrar las asistencias que no existen para crearlas
            const estudiantesConAsistencia = asistenciasExistentes.map(a => a.estudianteId);
            const nuevasAsistencias = asistenciasACrear.filter(
                a => !estudiantesConAsistencia.includes(a.estudianteId)
            );

            if (nuevasAsistencias.length > 0) {
                await Asistencia.bulkCreate(nuevasAsistencias);
            }

            return res.status(200).json({
                mensaje: 'Asistencias actualizadas y/o creadas correctamente',
                actualizadas: asistenciasExistentes.length,
                creadas: nuevasAsistencias.length
            });
        }

        // Si no existen asistencias previas, crear todas
        const asistenciasCreadas = await Asistencia.bulkCreate(asistenciasACrear);

        res.status(201).json({
            mensaje: 'Asistencias registradas correctamente',
            cantidad: asistenciasCreadas.length,
            asistencias: asistenciasCreadas
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            mensaje: 'Error al guardar las asistencias', 
            error: error.message 
        });
    }
};

// Editar asistencia
exports.editarAsistencia = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const asistencia = await Asistencia.findByPk(req.query.id, {
            include: [
                {
                    model: Estudiante,
                    as: 'estudiante',
                    attributes: ['id', 'nombre', 'correo']
                },
                {
                    model: Clase,
                    as: 'clase',
                    attributes: ['id', 'nombre', 'docenteId']
                }
            ]
        });
        if (!asistencia) {
            return res.status(404).json({ mensaje: 'Asistencia no encontrada' });
        }

        // Si es docente, verificar que la clase le pertenezca
        const { rol, docenteId } = req.usuario;
        if (rol === 'DOCENTE' && asistencia.clase?.docenteId !== docenteId) {
            return res.status(403).json({ mensaje: 'No tiene permiso para editar esta asistencia' });
        }

        const estadoAnterior = asistencia.estado;
        const nombreClase = asistencia.clase?.nombre || 'Clase';
        const nombreEstudiante = asistencia.estudiante?.nombre || '';
        const correoEstudiante = asistencia.estudiante?.correo || '';
        
        await asistencia.update(req.body);

        // Enviar correo si el estudiante tiene email y cambió el estado
        if (correoEstudiante && estadoAnterior !== asistencia.estado) {
            const asunto = `Asistencia actualizada - ${nombreClase}`;
            const contenidoInterno = `
                <h2>¡Hola ${nombreEstudiante}! 👋</h2>
                <p>Se ha actualizado tu asistencia para la clase <strong>${nombreClase}</strong>.</p>
                <div class="info-box">
                    <p><strong>🔁 Estado anterior:</strong> ${estadoAnterior}</p>
                    <p><strong>✅ Estado nuevo:</strong> ${asistencia.estado}</p>
                    <p><strong>🗓️ Fecha:</strong> ${new Date(asistencia.fecha).toLocaleDateString('es-ES')}</p>
                    ${asistencia.descripcion ? `<p><strong>📝 Descripción:</strong> ${asistencia.descripcion}</p>` : ''}
                </div>
                <p>Por favor revisa la plataforma para más detalles.</p>
            `;
            const contenido = generarPlantillaCorreo('Asistencia Actualizada', contenidoInterno);
            enviarCorreo(correoEstudiante, asunto, contenido).catch(err => 
                console.error(`Error enviando correo a ${correoEstudiante}:`, err.message)
            );
        }

        res.json({ 
            asistencia,
            correoEnviado: !!(correoEstudiante && estadoAnterior !== asistencia.estado),
            mensaje: 'Asistencia actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error en editarAsistencia:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ mensaje: 'Error al actualizar la asistencia', detalles: error.message });
    }
};

// Eliminar asistencia
exports.eliminarAsistencia = async (req, res) => {
    try {
        const asistencia = await Asistencia.findByPk(req.query.id, {
            include: [{
                model: Clase,
                as: 'clase',
                attributes: ['id', 'docenteId']
            }]
        });
        if (!asistencia) {
            return res.status(404).json({ mensaje: 'Asistencia no encontrada' });
        }

        // Si es docente, verificar que la clase le pertenezca
        const { rol, docenteId } = req.usuario;
        if (rol === 'DOCENTE' && asistencia.clase?.docenteId !== docenteId) {
            return res.status(403).json({ mensaje: 'No tiene permiso para eliminar esta asistencia' });
        }

        await asistencia.destroy();
        res.json({ mensaje: 'Asistencia eliminada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al eliminar la asistencia' });
    }
};

/// Filtrar asistencias por rango de fechas
exports.filtrarPorFecha = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        
        // Convertir a objetos Date y ajustar para incluir todo el día
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999); // Incluir hasta el final del día

        const asistencias = await Asistencia.findAll({
            where: {
                fecha: {
                    [Op.between]: [inicio, fin]
                }
            },
            include: [
                {
                    model: Estudiante,
                    as: 'estudiante',
                    attributes: ['nombre', 'correo']
                },
                {
                    model: Clase,
                    as: 'clase',
                    attributes: ['nombre']
                }
            ]
        });
        
        if (!asistencias || asistencias.length === 0) {
            return res.status(200).json({ mensaje: 'No se encontraron asistencias en ese rango de fechas', datos: [] });
        }

        res.json(asistencias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al filtrar las asistencias por fecha' });
    }
};

// Filtrar asistencias por estado y clase
exports.filtrarPorEstadoYClase = async (req, res) => {
    try {
        const { estado, claseId } = req.query;
        
        const asistencias = await Asistencia.findAll({
            where: {
                estado,
                claseId
            },
            include: [
                {
                        model: Estudiante,
                        as: 'estudiante',
                        attributes: ['nombre', 'correo']
                },
                {
                        model: Clase,
                        as: 'clase',
                        attributes: ['nombre']
                }
            ]
        });
        
        if (!asistencias || asistencias.length === 0) {
            return res.status(200).json({ mensaje: 'No se encontraron asistencias para el estado y/o clase solicitados', datos: [] });
        }

        res.json(asistencias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al filtrar las asistencias por estado y clase' });
    }
};

// Calcular asistencia perfecta
exports.calcularAsistenciaPerfecta = async (req, res) => {
    try {
        const { claseId, parcialId } = req.query;

        if (!claseId || !parcialId) {
            return res.status(400).json({ mensaje: 'Se requieren los parámetros claseId y parcialId' });
        }

        const clase = await Clase.findByPk(claseId);
        if (!clase) return res.status(404).json({ mensaje: 'Clase no encontrada' });

        // Determinar días por semana según créditos (3 -> 4, 4 -> 5)
        const diasPorSemana = clase.creditos === 3 ? 4 : 5;
        const semanasEnParcial = 4;
        const totalAsistenciasEsperadas = diasPorSemana * semanasEnParcial;

        // Obtener asistencias marcadas como PRESENTE para la clase y parcial
        const asistenciasPresentes = await Asistencia.findAll({
            where: { claseId, parcialId, estado: 'PRESENTE' },
            include: [{ model: Estudiante, as: 'estudiante', attributes: ['id', 'nombre', 'correo'] }]
        });

        // Agrupar por estudiante y contar
        const mapa = new Map();
        for (const a of asistenciasPresentes) {
            const idEst = a.estudianteId;
            if (!mapa.has(idEst)) mapa.set(idEst, { estudiante: a.estudiante, total: 0 });
            mapa.get(idEst).total += 1;
        }

        const estudiantes = Array.from(mapa.values()).map(item => ({
            estudiante: item.estudiante,
            totalAsistencias: item.total,
            asistenciasEsperadas: totalAsistenciasEsperadas,
            porcentajeAsistencia: ((item.total / totalAsistenciasEsperadas) * 100).toFixed(2),
            asistenciaPerfecta: item.total === totalAsistenciasEsperadas
        }));

        return res.json({
            clase: clase.nombre,
            creditos: clase.creditos,
            diasPorSemana,
            semanasEnParcial,
            totalAsistenciasEsperadas,
            estudiantes
        });

    } catch (error) {
        console.error('Error al calcular asistencia perfecta:', error);
        res.status(500).json({ mensaje: 'Error al calcular la asistencia perfecta', error: error.message });
    }
};