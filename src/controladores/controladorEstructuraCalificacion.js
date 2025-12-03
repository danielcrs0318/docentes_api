const EstructuraCalificacion = require('../modelos/EstructuraCalificacion');
const Parciales = require('../modelos/Parciales');
const Clases = require('../modelos/Clases');
const Docentes = require('../modelos/Docentes');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const Estudiantes = require('../modelos/Estudiantes');
const { enviarCorreo, generarPlantillaCorreo } = require('../configuraciones/correo');

/**
 * Listar todas las estructuras de calificación
 * Filtros opcionales: parcialId, claseId, docenteId
 * ROL ESTUDIANTE: Solo ve estructuras de sus clases inscritas
 * ROL DOCENTE: Solo ve sus propias estructuras
 * ROL ADMIN: Ve todas
 */
exports.Listar = async (req, res) => {
    try {
        const { parcialId, claseId, docenteId } = req.query;
        const { rol, docenteId: userDocenteId, estudianteId } = req.usuario;

        let where = {};

        // Si es estudiante, obtener sus clases inscritas
        if (rol === 'ESTUDIANTE') {
            if (!estudianteId) {
                return res.status(400).json({ error: 'Estudiante no identificado' });
            }

            const clasesInscritas = await EstudiantesClases.findAll({
                where: { estudianteId },
                attributes: ['claseId']
            });

            const clasesIds = clasesInscritas.map(ec => ec.claseId);
            
            if (clasesIds.length === 0) {
                return res.json([]); // No está inscrito en ninguna clase
            }

            where.claseId = clasesIds;
        }

        // Si es docente, solo ver sus propias estructuras
        if (rol === 'DOCENTE') {
            where.docenteId = userDocenteId;
        }

        // Aplicar filtros adicionales
        if (parcialId) where.parcialId = parcialId;
        if (claseId) {
            if (Array.isArray(where.claseId)) {
                // Si ya hay filtro de clases del estudiante, intersectar
                where.claseId = where.claseId.includes(parseInt(claseId)) ? parseInt(claseId) : null;
            } else {
                where.claseId = claseId;
            }
        }
        if (docenteId && rol === 'ADMIN') where.docenteId = docenteId;

        const estructuras = await EstructuraCalificacion.findAll({
            where,
            include: [
                {
                    model: Parciales,
                    as: 'parcial',
                    attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin'],
                },
                {
                    model: Clases,
                    as: 'clase',
                    attributes: ['id', 'codigo', 'nombre'],
                },
                {
                    model: Docentes,
                    as: 'docente',
                    attributes: ['id', 'nombre', 'correo'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(estructuras);
    } catch (err) {
        res.status(500).json({ error: 'Error al listar estructuras de calificación', details: err.message });
    }
};

/**
 * Obtener una estructura de calificación específica
 * Verifica permisos según el rol
 */
exports.Obtener = async (req, res) => {
    try {
        const { id } = req.query;
        const { rol, docenteId, estudianteId } = req.usuario;

        if (!id) {
            return res.status(400).json({ error: 'ID es requerido' });
        }

        const estructura = await EstructuraCalificacion.findByPk(id, {
            include: [
                {
                    model: Parciales,
                    as: 'parcial',
                    attributes: ['id', 'nombre'],
                },
                {
                    model: Clases,
                    as: 'clase',
                    attributes: ['id', 'codigo', 'nombre'],
                },
                {
                    model: Docentes,
                    as: 'docente',
                    attributes: ['id', 'nombre', 'correo'],
                },
            ],
        });

        if (!estructura) {
            return res.status(404).json({ error: 'Estructura no encontrada' });
        }

        // Si es docente, verificar que sea suya
        if (rol === 'DOCENTE' && estructura.docenteId !== docenteId) {
            return res.status(403).json({ error: 'No tiene permiso para ver esta estructura' });
        }

        // Si es estudiante, verificar que esté inscrito en la clase
        if (rol === 'ESTUDIANTE') {
            const inscrito = await EstudiantesClases.findOne({
                where: {
                    estudianteId,
                    claseId: estructura.claseId
                }
            });

            if (!inscrito) {
                return res.status(403).json({ error: 'No tiene permiso para ver esta estructura' });
            }
        }

        res.json(estructura);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener estructura', details: err.message });
    }
};

/**
 * Guardar una nueva estructura de calificación
 */
exports.Guardar = async (req, res) => {
    try {
        const { 
            parcialId, 
            claseId, 
            pesoAcumulativo, 
            pesoExamen, 
            pesoReposicion,
            notaMaximaParcial,
            notaMinimaAprobacion,
            observaciones 
        } = req.body;

        const { docenteId } = req.usuario;

        // Validar que parcial y clase existan
        const parcial = await Parciales.findByPk(parcialId);
        if (!parcial) {
            return res.status(404).json({ error: 'Parcial no encontrado' });
        }

        const clase = await Clases.findByPk(claseId);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Validar que la suma de pesos sea 100
        const totalPesos = parseFloat(pesoAcumulativo) + 
                          parseFloat(pesoExamen) + 
                          parseFloat(pesoReposicion || 0);

        if (Math.abs(totalPesos - 100) > 0.01) {
            return res.status(400).json({ 
                error: 'La suma de los porcentajes debe ser 100%',
                suma: totalPesos 
            });
        }

        // Verificar si ya existe una estructura para este parcial y clase
        const existente = await EstructuraCalificacion.findOne({
            where: { parcialId, claseId },
        });

        if (existente) {
            return res.status(400).json({ 
                error: 'Ya existe una estructura de calificación para este parcial y clase',
                sugerencia: 'Use el endpoint de editar para modificarla'
            });
        }

        const nuevaEstructura = await EstructuraCalificacion.create({
            parcialId,
            claseId,
            docenteId,
            pesoAcumulativo: parseFloat(pesoAcumulativo),
            pesoExamen: parseFloat(pesoExamen),
            pesoReposicion: parseFloat(pesoReposicion || 0),
            notaMaximaParcial: parseFloat(notaMaximaParcial || 100),
            notaMinimaAprobacion: parseFloat(notaMinimaAprobacion || 70),
            observaciones,
        });

        // 📧 Enviar correo de notificación (async, no bloquea la respuesta)
        enviarCorreoEstructuraCreada(nuevaEstructura, parcial, clase).catch(err => {
            console.error('Error al enviar correo de notificación:', err);
        });

        res.status(201).json({ 
            mensaje: 'Estructura de calificación creada exitosamente', 
            estructura: nuevaEstructura 
        });
    } catch (err) {
        console.error('❌ Error al guardar estructura de calificación:', err);
        res.status(500).json({ 
            error: 'Error al guardar estructura de calificación', 
            details: err.message,
            tipo: err.name,
            sql: err.sql ? 'Error de base de datos' : undefined
        });
    }
};

/**
 * Editar una estructura de calificación existente
 */
exports.Editar = async (req, res) => {
    try {
        const { id } = req.query;
        const { 
            pesoAcumulativo, 
            pesoExamen, 
            pesoReposicion,
            notaMaximaParcial,
            notaMinimaAprobacion,
            estado,
            observaciones 
        } = req.body;

        const { rol, docenteId } = req.usuario;

        if (!id) {
            return res.status(400).json({ error: 'ID es requerido' });
        }

        const estructura = await EstructuraCalificacion.findByPk(id);
        if (!estructura) {
            return res.status(404).json({ error: 'Estructura no encontrada' });
        }

        // Si es docente, verificar que sea suya
        if (rol === 'DOCENTE' && estructura.docenteId !== docenteId) {
            return res.status(403).json({ error: 'No tiene permiso para editar esta estructura' });
        }

        // Validar que la suma de pesos sea 100
        if (pesoAcumulativo !== undefined || pesoExamen !== undefined || pesoReposicion !== undefined) {
            const totalPesos = parseFloat(pesoAcumulativo ?? estructura.pesoAcumulativo) + 
                              parseFloat(pesoExamen ?? estructura.pesoExamen) + 
                              parseFloat(pesoReposicion ?? estructura.pesoReposicion);

            if (Math.abs(totalPesos - 100) > 0.01) {
                return res.status(400).json({ 
                    error: 'La suma de los porcentajes debe ser 100%',
                    suma: totalPesos 
                });
            }
        }

        // Actualizar campos
        if (pesoAcumulativo !== undefined) estructura.pesoAcumulativo = parseFloat(pesoAcumulativo);
        if (pesoExamen !== undefined) estructura.pesoExamen = parseFloat(pesoExamen);
        if (pesoReposicion !== undefined) estructura.pesoReposicion = parseFloat(pesoReposicion);
        if (notaMaximaParcial !== undefined) estructura.notaMaximaParcial = parseFloat(notaMaximaParcial);
        if (notaMinimaAprobacion !== undefined) estructura.notaMinimaAprobacion = parseFloat(notaMinimaAprobacion);
        if (estado !== undefined) estructura.estado = estado;
        if (observaciones !== undefined) estructura.observaciones = observaciones;

        await estructura.save();

        res.json({ 
            mensaje: 'Estructura de calificación actualizada exitosamente', 
            estructura 
        });
    } catch (err) {
        res.status(500).json({ 
            error: 'Error al editar estructura de calificación', 
            details: err.message 
        });
    }
};

/**
 * Eliminar una estructura de calificación
 */
exports.Eliminar = async (req, res) => {
    try {
        const { id } = req.query;
        const { rol, docenteId } = req.usuario;

        if (!id) {
            return res.status(400).json({ error: 'ID es requerido' });
        }

        const estructura = await EstructuraCalificacion.findByPk(id);
        if (!estructura) {
            return res.status(404).json({ error: 'Estructura no encontrada' });
        }

        // Si es docente, verificar que sea suya
        if (rol === 'DOCENTE' && estructura.docenteId !== docenteId) {
            return res.status(403).json({ error: 'No tiene permiso para eliminar esta estructura' });
        }

        await estructura.destroy();

        res.json({ mensaje: 'Estructura de calificación eliminada exitosamente' });
    } catch (err) {
        res.status(500).json({ 
            error: 'Error al eliminar estructura de calificación', 
            details: err.message 
        });
    }
};

/**
 * Obtener estructura por parcial y clase (para usar al calificar)
 */
exports.ObtenerPorParcialYClase = async (req, res) => {
    try {
        const { parcialId, claseId } = req.query;

        if (!parcialId || !claseId) {
            return res.status(400).json({ error: 'parcialId y claseId son requeridos' });
        }

        const estructura = await EstructuraCalificacion.findOne({
            where: { parcialId, claseId, estado: 'ACTIVO' },
            include: [
                {
                    model: Parciales,
                    as: 'parcial',
                    attributes: ['id', 'nombre'],
                },
                {
                    model: Clases,
                    as: 'clase',
                    attributes: ['id', 'codigo', 'nombre'],
                },
            ],
        });

        if (!estructura) {
            // Si no existe, devolver estructura por defecto
            return res.json({
                esDefault: true,
                pesoAcumulativo: 60,
                pesoExamen: 40,
                pesoReposicion: 0,
                notaMaximaParcial: 100,
                notaMinimaAprobacion: 70,
            });
        }

        res.json({ ...estructura.toJSON(), esDefault: false });
    } catch (err) {
        res.status(500).json({ 
            error: 'Error al obtener estructura', 
            details: err.message 
        });
    }
};

/**
 * Función auxiliar para enviar correo cuando se crea una estructura de calificación
 */
async function enviarCorreoEstructuraCreada(estructura, parcial, clase) {
    try {
        // Obtener estudiantes inscritos en la clase
        const inscripciones = await EstudiantesClases.findAll({
            where: { claseId: clase.id },
            include: [{
                model: Estudiantes,
                as: 'estudiante',
                attributes: ['id', 'nombre', 'correo']
            }]
        });

        if (inscripciones.length === 0) {
            console.log('⚠️ No hay estudiantes inscritos en la clase para enviar correo');
            return;
        }

        const destinatarios = inscripciones.map(i => i.estudiante.correo).filter(Boolean);
        
        if (destinatarios.length === 0) {
            console.log('⚠️ No hay correos válidos de estudiantes');
            return;
        }

        const asunto = `📊 Nueva Estructura de Calificación - ${clase.nombre}`;
        const cuerpo = generarPlantillaCorreo(
            `Estructura de Calificación Configurada`,
            `
            <p>Se ha configurado la estructura de calificación para:</p>
            <ul>
                <li><strong>Clase:</strong> ${clase.nombre} (${clase.codigo})</li>
                <li><strong>Parcial:</strong> ${parcial.nombre}</li>
            </ul>
            
            <h3>📋 Distribución de Pesos:</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background-color: #f0f0f0;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Componente</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Porcentaje</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">📝 Acumulativo</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${estructura.pesoAcumulativo}%</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">📄 Examen</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${estructura.pesoExamen}%</td>
                </tr>
                ${estructura.pesoReposicion > 0 ? `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">🔄 Reposición</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${estructura.pesoReposicion}%</td>
                </tr>
                ` : ''}
            </table>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>📊 Nota máxima del parcial:</strong> ${estructura.notaMaximaParcial} puntos</p>
                <p style="margin: 5px 0;"><strong>✅ Nota mínima de aprobación:</strong> ${estructura.notaMinimaAprobacion} puntos</p>
            </div>
            
            ${estructura.observaciones ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <strong>📝 Observaciones:</strong>
                <p>${estructura.observaciones}</p>
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Esta estructura será utilizada para calcular sus calificaciones en este parcial.</p>
            `
        );

        await enviarCorreo(destinatarios, asunto, cuerpo);
        console.log(`✅ Correo de estructura enviado a ${destinatarios.length} estudiantes`);
    } catch (error) {
        console.error('❌ Error al enviar correo de estructura:', error);
        throw error;
    }
}
