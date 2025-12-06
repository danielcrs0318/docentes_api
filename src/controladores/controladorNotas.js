const Evaluaciones = require('../modelos/Evaluaciones');
const EvaluacionesEstudiantes = require('../modelos/EvaluacionesEstudiantes');
const Estudiantes = require('../modelos/Estudiantes');
const EstudiantesClases = require('../modelos/EstudiantesClases');
const Parciales = require('../modelos/Parciales');
const Periodos = require('../modelos/Periodos');
const Clases = require('../modelos/Clases');
const Secciones = require('../modelos/Secciones');
const EstructuraCalificacion = require('../modelos/EstructuraCalificacion');

/**
 * Obtener notas de estudiantes con filtros
 * Filtros: claseId, periodoId, parcialId (opcional)
 * Permisos:
 * - DOCENTE: solo sus clases
 * - ADMIN: todas las clases
 * - ESTUDIANTE: solo sus propias notas
 */
exports.ObtenerNotas = async (req, res) => {
    try {
        const { claseId, periodoId, parcialId, seccionId } = req.query;
        const { rol, docenteId, estudianteId } = req.usuario;

        // Validar parámetros requeridos
        if (!claseId || !periodoId) {
            return res.status(400).json({ 
                error: 'claseId y periodoId son requeridos' 
            });
        }

        // Verificar permisos de la clase
        const clase = await Clases.findByPk(claseId);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Si es docente, verificar que sea su clase
        if (rol === 'DOCENTE' && clase.docenteId !== docenteId) {
            return res.status(403).json({ 
                error: 'No tiene permiso para ver las notas de esta clase' 
            });
        }

        // Construir filtros para parciales
        const parcialesWhere = { periodoId: parseInt(periodoId) };
        if (parcialId) {
            parcialesWhere.id = parseInt(parcialId);
        }

        // Obtener parciales del periodo (o parcial específico)
        const parciales = await Parciales.findAll({
            where: parcialesWhere,
            order: [['nombre', 'ASC']]
        });

        if (!parciales || parciales.length === 0) {
            return res.json({ 
                estudiantes: [], 
                parciales: [],
                mensaje: 'No hay parciales configurados para este periodo'
            });
        }

        // Obtener estudiantes de la clase
        let estudiantesWhere = { claseId: parseInt(claseId) };
        if (seccionId) {
            estudiantesWhere.seccionId = parseInt(seccionId);
        }

        // Si es estudiante, solo mostrar sus propias notas
        if (rol === 'ESTUDIANTE') {
            estudiantesWhere.estudianteId = estudianteId;
        }

        const inscripciones = await EstudiantesClases.findAll({
            where: estudiantesWhere,
            include: [{
                model: Estudiantes,
                as: 'estudiante',
                attributes: ['id', 'nombre', 'correo']
            }],
            order: [[{ model: Estudiantes, as: 'estudiante' }, 'nombre', 'ASC']]
        });

        // Obtener todas las evaluaciones de los parciales
        const evaluaciones = await Evaluaciones.findAll({
            where: {
                claseId: parseInt(claseId),
                parcialId: parciales.map(p => p.id)
            },
            order: [['tipo', 'ASC'], ['titulo', 'ASC']]
        });

        // Obtener todas las notas de los estudiantes
        const estudiantesIds = inscripciones.map(i => i.estudianteId);
        const evaluacionesIds = evaluaciones.map(e => e.id);

        const notas = await EvaluacionesEstudiantes.findAll({
            where: {
                estudianteId: estudiantesIds,
                evaluacionId: evaluacionesIds
            }
        });

        // Crear mapa de notas por estudiante y evaluación
        const notasMap = {};
        notas.forEach(n => {
            if (!notasMap[n.estudianteId]) {
                notasMap[n.estudianteId] = {};
            }
            notasMap[n.estudianteId][n.evaluacionId] = n.nota;
        });

        // Procesar datos de estudiantes con sus notas por parcial
        const resultados = [];

        for (const inscripcion of inscripciones) {
            const estudiante = inscripcion.estudiante;
            const estudianteData = {
                id: estudiante.id,
                nombre: estudiante.nombre,
                correo: estudiante.correo,
                parciales: []
            };

            // Calcular notas por cada parcial
            for (const parcial of parciales) {
                const evaluacionesParcial = evaluaciones.filter(e => e.parcialId === parcial.id);
                
                let puntosAcumulativo = 0;
                let puntosExamen = 0;
                let puntosExamenOriginal = 0; // Guardar nota del examen original
                let puntosReposicion = 0;
                let examenesReemplazados = new Set();

                // Identificar exámenes con reposición
                for (const ev of evaluacionesParcial) {
                    if (ev.tipo === 'REPOSICION' && ev.evaluacionReemplazadaId) {
                        const notaReposicion = notasMap[estudiante.id]?.[ev.id];
                        if (notaReposicion !== null && notaReposicion !== undefined) {
                            examenesReemplazados.add(ev.evaluacionReemplazadaId);
                        }
                    }
                }

                // Calcular puntos por tipo
                for (const ev of evaluacionesParcial) {
                    const nota = notasMap[estudiante.id]?.[ev.id];
                    if (nota === null || nota === undefined) continue;

                    const puntos = parseFloat(nota);

                    if (ev.tipo === 'REPOSICION') {
                        puntosReposicion += puntos;
                    } else if (ev.tipo === 'EXAMEN') {
                        puntosExamenOriginal += puntos; // Guardar siempre la nota del examen
                        // Solo sumar al total si no tiene reposición
                        if (!examenesReemplazados.has(ev.id)) {
                            puntosExamen += puntos;
                        }
                    } else {
                        puntosAcumulativo += puntos;
                    }
                }

                const totalParcial = puntosAcumulativo + puntosExamen + puntosReposicion;

                estudianteData.parciales.push({
                    parcialId: parcial.id,
                    parcialNombre: parcial.nombre,
                    acumulativo: Math.round(puntosAcumulativo * 100) / 100,
                    examen: Math.round(puntosExamenOriginal * 100) / 100, // Mostrar siempre la nota del examen
                    reposicion: puntosReposicion > 0 ? Math.round(puntosReposicion * 100) / 100 : null,
                    total: Math.round(totalParcial * 100) / 100
                });
            }

            resultados.push(estudianteData);
        }

        res.json({
            clase: {
                id: clase.id,
                codigo: clase.codigo,
                nombre: clase.nombre
            },
            parciales: parciales.map(p => ({
                id: p.id,
                nombre: p.nombre,
                fechaInicio: p.fechaInicio,
                fechaFin: p.fechaFin
            })),
            estudiantes: resultados
        });

    } catch (err) {
        console.error('Error al obtener notas:', err);
        res.status(500).json({ 
            error: 'Error al obtener notas', 
            details: err.message 
        });
    }
};

/**
 * Obtener notas de un estudiante específico (para vista de estudiante)
 */
exports.ObtenerMisNotas = async (req, res) => {
    try {
        const { estudianteId } = req.usuario;
        const { periodoId } = req.query;

        if (!estudianteId) {
            return res.status(400).json({ error: 'Estudiante no identificado' });
        }

        // Obtener todas las clases del estudiante
        const inscripciones = await EstudiantesClases.findAll({
            where: { estudianteId },
            include: [{
                model: Clases,
                as: 'clase',
                attributes: ['id', 'codigo', 'nombre']
            }]
        });

        const resultados = [];

        for (const inscripcion of inscripciones) {
            const clase = inscripcion.clase;

            // Construir filtro de periodo si se proporciona
            const parcialesWhere = {};
            if (periodoId) {
                parcialesWhere.periodoId = parseInt(periodoId);
            }

            const parciales = await Parciales.findAll({
                where: parcialesWhere,
                order: [['nombre', 'ASC']]
            });

            // Obtener evaluaciones de esta clase
            const evaluaciones = await Evaluaciones.findAll({
                where: {
                    claseId: clase.id,
                    parcialId: parciales.map(p => p.id)
                }
            });

            // Obtener notas del estudiante
            const notas = await EvaluacionesEstudiantes.findAll({
                where: {
                    estudianteId,
                    evaluacionId: evaluaciones.map(e => e.id)
                }
            });

            const notasMap = {};
            notas.forEach(n => {
                notasMap[n.evaluacionId] = n.nota;
            });

            const parcialesData = [];

            for (const parcial of parciales) {
                const evaluacionesParcial = evaluaciones.filter(e => e.parcialId === parcial.id);
                
                let puntosAcumulativo = 0;
                let puntosExamen = 0;
                let puntosReposicion = 0;
                let examenesReemplazados = new Set();

                // Identificar exámenes con reposición
                for (const ev of evaluacionesParcial) {
                    if (ev.tipo === 'REPOSICION' && ev.evaluacionReemplazadaId) {
                        const notaReposicion = notasMap[ev.id];
                        if (notaReposicion !== null && notaReposicion !== undefined) {
                            examenesReemplazados.add(ev.evaluacionReemplazadaId);
                        }
                    }
                }

                // Calcular puntos
                for (const ev of evaluacionesParcial) {
                    const nota = notasMap[ev.id];
                    if (nota === null || nota === undefined) continue;

                    const puntos = parseFloat(nota);

                    if (ev.tipo === 'REPOSICION') {
                        puntosReposicion += puntos;
                    } else if (ev.tipo === 'EXAMEN') {
                        if (!examenesReemplazados.has(ev.id)) {
                            puntosExamen += puntos;
                        }
                    } else {
                        puntosAcumulativo += puntos;
                    }
                }

                const totalParcial = puntosAcumulativo + puntosExamen + puntosReposicion;

                parcialesData.push({
                    parcialId: parcial.id,
                    parcialNombre: parcial.nombre,
                    acumulativo: Math.round(puntosAcumulativo * 100) / 100,
                    examen: Math.round(puntosExamen * 100) / 100,
                    reposicion: puntosReposicion > 0 ? Math.round(puntosReposicion * 100) / 100 : null,
                    total: Math.round(totalParcial * 100) / 100
                });
            }

            resultados.push({
                clase: {
                    id: clase.id,
                    codigo: clase.codigo,
                    nombre: clase.nombre
                },
                parciales: parcialesData
            });
        }

        res.json({ clases: resultados });

    } catch (err) {
        console.error('Error al obtener mis notas:', err);
        res.status(500).json({ 
            error: 'Error al obtener notas', 
            details: err.message 
        });
    }
};

module.exports = exports;
