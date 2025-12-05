const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const db = require('../configuraciones/db');
const Asistencia = require('../modelos/Asistencia');
const AsistenciaImagen = require('../modelos/AsistenciaImagenes');
const Estudiante = require('../modelos/Estudiantes');
const Clase = require('../modelos/Clases');
const Periodo = require('../modelos/Periodos');
const Parcial = require('../modelos/Parciales');
const Secciones = require('../modelos/Secciones');
const { enviarCorreo, generarPlantillaCorreo } = require('../configuraciones/correo');
const path = require('path');
const fs = require('fs');

// Listar todas las asistencias
exports.listarAsistencias = async (req, res) => {
    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    const { rol, docenteId } = req.usuario;
    const where = {};

    // Filtrar por docente si el rol es DOCENTE
    if (rol === 'DOCENTE') {
        where['$clase.docenteId$'] = docenteId;
    }

    try {
        const asistencias = await Asistencia.findAll({
            where,
            include: [
                {
                    model: Estudiante,
                    as: 'estudiante',
                    attributes: ['nombre', 'correo']
                },
                {
                    model: Clase,
                    as: 'clase',
                    attributes: ['nombre', 'docenteId'],
                    required: rol === 'DOCENTE' // INNER JOIN para DOCENTE, LEFT JOIN para ADMIN
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
                },
                {
                    model: AsistenciaImagen,
                    as: 'imagenes',
                    attributes: ['id', 'imagen', 'estado']
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
        console.error('Errores de validación:', JSON.stringify(errores.array(), null, 2));
        return res.status(400).json({ 
            mensaje: 'Errores de validación',
            errores: errores.array() 
        });
    }

    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    console.log('=== GUARDANDO ASISTENCIA ===');
    console.log('Usuario:', req.usuario);
    console.log('Datos recibidos (req.body):', JSON.stringify(req.body, null, 2));
    console.log('Archivo (req.file):', req.file ? req.file.filename : 'No hay archivo');

    try {
        // Normalizar entrada
        const payload = { ...req.body };
        if (payload.estado && typeof payload.estado === 'string') payload.estado = payload.estado.toUpperCase().trim();
        
        // Si no se proporciona fecha, usar la fecha actual del sistema
        if (!payload.fecha) {
            payload.fecha = new Date();
        } else {
            payload.fecha = new Date(payload.fecha);
        }

        // Validar que si es EXCUSA, debe tener imagen
        if (payload.estado === 'EXCUSA' && !req.file) {
            return res.status(400).json({ mensaje: 'Debe subir una imagen de excusa cuando el estado es EXCUSA' });
        }

    // Verificar que existan las referencias foráneas antes de crear
    if (!payload.estudianteId) return res.status(400).json({ mensaje: 'estudianteId es requerido' });
    if (!payload.claseId) return res.status(400).json({ mensaje: 'claseId es requerido' });

    const estudiante = await Estudiante.findByPk(payload.estudianteId);
    if (!estudiante) return res.status(400).json({ mensaje: `Estudiante con id ${payload.estudianteId} no encontrado` });
    const claseExists = await Clase.findByPk(payload.claseId);
    if (!claseExists) return res.status(400).json({ mensaje: `Clase con id ${payload.claseId} no encontrado` });

    // 🔥 CALCULAR AUTOMÁTICAMENTE PERIODO Y PARCIAL BASADO EN LA FECHA
    const fechaAsistencia = payload.fecha;
    
    // Convertir a formato de fecha sin hora (YYYY-MM-DD)
    const fechaStr = fechaAsistencia.toISOString().split('T')[0];
    
    console.log('=== DEBUG CALCULO DE PERIODO/PARCIAL ===');
    console.log('Fecha de asistencia:', fechaAsistencia);
    console.log('Fecha sin hora:', fechaStr);
    
    // Buscar TODOS los periodos y parciales para debug
    const todosPeriodos = await Periodo.findAll();
    const todosParciales = await Parcial.findAll();
    
    console.log('Total periodos en BD:', todosPeriodos.length);
    console.log('Periodos:', todosPeriodos.map(p => `ID:${p.id} ${p.nombre} (${new Date(p.fechaInicio).toISOString().split('T')[0]} a ${new Date(p.fechaFin).toISOString().split('T')[0]})`).join(' | '));
    console.log('Total parciales en BD:', todosParciales.length);
    console.log('Parciales:', todosParciales.map(p => `ID:${p.id} ${p.nombre} periodoId:${p.periodoId} (${new Date(p.fechaInicio).toISOString().split('T')[0]} a ${new Date(p.fechaFin).toISOString().split('T')[0]})`).join(' | '));
    
    // Buscar el periodo que contenga la fecha de asistencia Y tenga parciales activos
    let periodo = null;
    let parcial = null;
    
    for (const p of todosPeriodos) {
        const inicioStr = new Date(p.fechaInicio).toISOString().split('T')[0];
        const finStr = new Date(p.fechaFin).toISOString().split('T')[0];
        
        console.log(`Evaluando periodo ${p.id} (${p.nombre}): ${inicioStr} a ${finStr}`);
        
        const dentroRangoPeriodo = fechaStr >= inicioStr && fechaStr <= finStr;
        console.log(`  ¿${fechaStr} está entre ${inicioStr} y ${finStr}? ${dentroRangoPeriodo}`);
        
        if (dentroRangoPeriodo) {
            // Verificar si tiene parciales que contengan la fecha
            const parcialesDelPeriodo = todosParciales.filter(parc => parc.periodoId === p.id);
            console.log(`  → Parciales del periodo: ${parcialesDelPeriodo.length}`);
            
            for (const parc of parcialesDelPeriodo) {
                const parcInicioStr = new Date(parc.fechaInicio).toISOString().split('T')[0];
                const parcFinStr = new Date(parc.fechaFin).toISOString().split('T')[0];
                
                const dentroRangoParcial = fechaStr >= parcInicioStr && fechaStr <= parcFinStr;
                console.log(`    - Parcial ${parc.id} (${parc.nombre}): ${parcInicioStr} a ${parcFinStr} → ${dentroRangoParcial}`);
                
                if (dentroRangoParcial) {
                    periodo = p;
                    parcial = parc;
                    console.log(`  ✅ ENCONTRADO: Periodo ${p.id} con Parcial ${parc.id}`);
                    break;
                }
            }
            
            if (parcial) break;
        }
    }
    
    if (!periodo || !parcial) {
        const periodosInfo = todosPeriodos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            inicio: new Date(p.fechaInicio).toISOString().split('T')[0],
            fin: new Date(p.fechaFin).toISOString().split('T')[0],
            cantidadParciales: todosParciales.filter(parc => parc.periodoId === p.id).length
        }));
        
        return res.status(400).json({ 
            mensaje: 'No se encontró un periodo con parciales activos para la fecha de asistencia',
            fecha: fechaAsistencia,
            fechaComparacion: fechaStr,
            periodosDisponibles: periodosInfo
        });
    }
    
    console.log('✅ Periodo encontrado:', periodo.id, periodo.nombre);
    console.log('✅ Parcial encontrado:', parcial.id, parcial.nombre);
    
    // Asignar automáticamente el periodo y parcial calculados
    payload.periodoId = periodo.id;
    payload.parcialId = parcial.id;

    // Si es docente, verificar que la clase le pertenezca
    const { rol, docenteId } = req.usuario;
    if (rol === 'DOCENTE' && claseExists?.docenteId !== docenteId) {
      return res.status(403).json({ mensaje: 'No tiene permiso para registrar asistencias en esta clase' });
    }

    const asistencia = await Asistencia.create(payload);

    // Si hay imagen, guardarla en la tabla AsistenciaImagenes
    if (req.file) {
        const nombreImagen = req.file.filename;
        await AsistenciaImagen.create({
            imagen: nombreImagen,
            estado: 'AC',
            asistenciaId: asistencia.id
        });
        console.log(`✅ Imagen de excusa guardada: ${nombreImagen}`);
    }

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
      imagenGuardada: !!req.file,
      periodoCalculado: periodo.nombre,
      parcialCalculado: parcial.nombre,
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
        let { fecha, claseId, seccionId, estudiantes, estadoPredeterminado = 'PRESENTE' } = req.body;

        // Si no se proporciona fecha, usar la fecha actual del sistema
        if (!fecha) {
            fecha = new Date();
        } else {
            fecha = new Date(fecha);
        }
        
        // Validar que se especifique claseId para calcular periodo/parcial
        if (!claseId) {
            return res.status(400).json({ mensaje: 'claseId es requerido para calcular periodo y parcial automáticamente' });
        }

        // 🔥 CALCULAR AUTOMÁTICAMENTE PERIODO Y PARCIAL BASADO EN LA FECHA
        const fechaAsistencia = fecha;
        
        // Convertir a formato de fecha sin hora (YYYY-MM-DD)
        const fechaStr = fechaAsistencia.toISOString().split('T')[0];
        
        // Buscar TODOS los periodos y parciales
        const todosPeriodos = await Periodo.findAll();
        const todosParciales = await Parcial.findAll();
        
        // Buscar el periodo que contenga la fecha de asistencia Y tenga parciales activos
        let periodo = null;
        let parcial = null;
        
        for (const p of todosPeriodos) {
            const inicioStr = new Date(p.fechaInicio).toISOString().split('T')[0];
            const finStr = new Date(p.fechaFin).toISOString().split('T')[0];
            
            const dentroRangoPeriodo = fechaStr >= inicioStr && fechaStr <= finStr;
            
            if (dentroRangoPeriodo) {
                // Verificar si tiene parciales que contengan la fecha
                const parcialesDelPeriodo = todosParciales.filter(parc => parc.periodoId === p.id);
                
                for (const parc of parcialesDelPeriodo) {
                    const parcInicioStr = new Date(parc.fechaInicio).toISOString().split('T')[0];
                    const parcFinStr = new Date(parc.fechaFin).toISOString().split('T')[0];
                    
                    const dentroRangoParcial = fechaStr >= parcInicioStr && fechaStr <= parcFinStr;
                    
                    if (dentroRangoParcial) {
                        periodo = p;
                        parcial = parc;
                        break;
                    }
                }
                
                if (parcial) break;
            }
        }
        
        if (!periodo || !parcial) {
            const periodosInfo = todosPeriodos.map(p => ({
                id: p.id,
                nombre: p.nombre,
                inicio: new Date(p.fechaInicio).toISOString().split('T')[0],
                fin: new Date(p.fechaFin).toISOString().split('T')[0],
                cantidadParciales: todosParciales.filter(parc => parc.periodoId === p.id).length
            }));
            
            return res.status(400).json({ 
                mensaje: 'No se encontró un periodo con parciales activos para la fecha de asistencia',
                fecha: fechaAsistencia,
                fechaComparacion: fechaStr,
                periodosDisponibles: periodosInfo
            });
        }
        
        const periodoId = periodo.id;
        const parcialId = parcial.id;

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
            periodoCalculado: periodo.nombre,
            parcialCalculado: parcial.nombre,
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

    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ mensaje: 'Usuario no autenticado' });
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
                },
                {
                    model: AsistenciaImagen,
                    as: 'imagenes',
                    attributes: ['id', 'imagen', 'estado']
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
        
        // Preparar payload de actualización
        const payload = { ...req.body };

        // Si el estado cambia a EXCUSA y hay imagen nueva
        if (payload.estado === 'EXCUSA' && req.file) {
            // Eliminar imágenes anteriores (físicamente y de la BD)
            if (asistencia.imagenes && asistencia.imagenes.length > 0) {
                for (const img of asistencia.imagenes) {
                    const rutaImagen = path.join(__dirname, '../../public/img/asistencias/excusas', img.imagen);
                    if (fs.existsSync(rutaImagen)) {
                        fs.unlinkSync(rutaImagen);
                        console.log(`🗑️ Imagen anterior eliminada: ${img.imagen}`);
                    }
                    await AsistenciaImagen.destroy({ where: { id: img.id } });
                }
            }

            // Guardar nueva imagen
            const nombreImagen = req.file.filename;
            await AsistenciaImagen.create({
                imagen: nombreImagen,
                estado: 'AC',
                asistenciaId: asistencia.id
            });
            console.log(`✅ Nueva imagen de excusa guardada: ${nombreImagen}`);
        }

        // Si cambia de EXCUSA a otro estado, eliminar todas las imágenes
        if (estadoAnterior === 'EXCUSA' && payload.estado && payload.estado !== 'EXCUSA') {
            if (asistencia.imagenes && asistencia.imagenes.length > 0) {
                for (const img of asistencia.imagenes) {
                    const rutaImagen = path.join(__dirname, '../../public/img/asistencias/excusas', img.imagen);
                    if (fs.existsSync(rutaImagen)) {
                        fs.unlinkSync(rutaImagen);
                        console.log(`🗑️ Imagen eliminada al cambiar estado: ${img.imagen}`);
                    }
                    await AsistenciaImagen.destroy({ where: { id: img.id } });
                }
            }
        }

        // Validar que si es EXCUSA debe tener imagen
        if (payload.estado === 'EXCUSA') {
            const tieneImagenes = await AsistenciaImagen.count({ where: { asistenciaId: asistencia.id, estado: 'AC' } });
            if (tieneImagenes === 0 && !req.file) {
                return res.status(400).json({ mensaje: 'Debe subir una imagen de excusa cuando el estado es EXCUSA' });
            }
        }

        await asistencia.update(payload);

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
            imagenActualizada: !!req.file,
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
    // Validar autenticación
    if (!req.usuario) {
        return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

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