/**
 * MIDDLEWARE DE AUTORIZACIÓN POR ROLES
 * 
 * Este archivo contiene middlewares para controlar el acceso a los endpoints
 * según el rol del usuario autenticado.
 * 
 * ROLES DISPONIBLES:
 * - ADMIN: Acceso total al sistema
 * - DOCENTE: Acceso a gestión académica (excepto usuarios)
 * - ESTUDIANTE: Solo lectura de sus propias evaluaciones y asistencias
 */

/**
 * Middleware: verificarRol
 * 
 * Valida que el usuario tenga uno de los roles permitidos para acceder al endpoint.
 * 
 * @param {Array<string>} rolesPermitidos - Array con los roles que pueden acceder (ej: ['ADMIN', 'DOCENTE'])
 * @returns {Function} Middleware de Express
 * 
 * EJEMPLO DE USO:
 * rutas.get('/listar', validarToken, verificarRol(['ADMIN', 'DOCENTE']), controlador.listar);
 * 
 * FLUJO:
 * 1. Verifica que exista req.usuario (viene del middleware validarToken)
 * 2. Verifica que req.usuario.rol esté definido
 * 3. Compara el rol del usuario con los roles permitidos
 * 4. Si coincide, permite el acceso (next())
 * 5. Si no coincide, retorna 403 Forbidden
 */
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        // Verificar que el usuario esté autenticado
        if (!req.usuario) {
            return res.status(401).json({ 
                error: 'No autenticado',
                mensaje: 'Debes iniciar sesión para acceder a este recurso'
            });
        }

        // Verificar que el usuario tenga un rol asignado
        if (!req.usuario.rol) {
            return res.status(403).json({ 
                error: 'Sin rol asignado',
                mensaje: 'Tu cuenta no tiene un rol asignado. Contacta al administrador.'
            });
        }

        // Verificar que el rol del usuario esté en la lista de roles permitidos
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                error: 'Acceso denegado',
                mensaje: `Esta acción requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`,
                tuRol: req.usuario.rol
            });
        }

        // El usuario tiene permiso, continuar
        next();
    };
};

/**
 * Middleware: soloMisDatos
 * 
 * Valida que un usuario solo pueda acceder a sus propios datos.
 * Útil para estudiantes y docentes que solo deben ver su propia información.
 * 
 * @param {string} tipoDato - Tipo de dato a validar: 'docente', 'estudiante'
 * @param {string} paramName - Nombre del parámetro en query/body/params que contiene el ID
 * @returns {Function} Middleware de Express
 * 
 * EJEMPLO DE USO:
 * // Endpoint: /analisis/reporte/docente?docenteId=3
 * rutas.get('/reporte/docente', 
 *   validarToken, 
 *   verificarRol(['ADMIN', 'DOCENTE']),
 *   soloMisDatos('docente', 'docenteId'),
 *   controlador.reporteDocente
 * );
 * 
 * FLUJO:
 * 1. Si el usuario es ADMIN, permite acceso sin restricciones
 * 2. Si el usuario es DOCENTE, verifica que docenteId en la petición sea igual a su docenteId
 * 3. Si el usuario es ESTUDIANTE, verifica que estudianteId en la petición sea igual a su estudianteId
 * 4. Si no coincide, retorna 403 Forbidden
 */
const soloMisDatos = (tipoDato, paramName = 'id') => {
    return (req, res, next) => {
        // ADMIN puede ver cualquier dato
        if (req.usuario.rol === 'ADMIN') {
            return next();
        }

        // Obtener el ID del parámetro (puede venir en query, body o params)
        const idSolicitado = req.query[paramName] || req.body[paramName] || req.params[paramName];

        if (!idSolicitado) {
            return res.status(400).json({ 
                error: 'Parámetro faltante',
                mensaje: `Se requiere el parámetro: ${paramName}`
            });
        }

        // Validar según el tipo de dato
        if (tipoDato === 'docente') {
            // El usuario debe ser DOCENTE y el ID debe coincidir
            if (req.usuario.rol !== 'DOCENTE') {
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    mensaje: 'No tienes permiso para acceder a datos de docentes'
                });
            }

            if (!req.usuario.docenteId) {
                return res.status(403).json({ 
                    error: 'Usuario sin docente asignado',
                    mensaje: 'Tu cuenta no tiene un docente asociado'
                });
            }

            // Comparar IDs (convertir a número para evitar problemas de tipos)
            if (parseInt(idSolicitado) !== parseInt(req.usuario.docenteId)) {
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    mensaje: 'Solo puedes acceder a tus propios datos',
                    intentaste: `Acceder a docenteId: ${idSolicitado}`,
                    tuDocenteId: req.usuario.docenteId
                });
            }
        } 
        else if (tipoDato === 'estudiante') {
            // El usuario debe ser ESTUDIANTE y el ID debe coincidir
            if (req.usuario.rol !== 'ESTUDIANTE') {
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    mensaje: 'No tienes permiso para acceder a datos de estudiantes'
                });
            }

            if (!req.usuario.estudianteId) {
                return res.status(403).json({ 
                    error: 'Usuario sin estudiante asignado',
                    mensaje: 'Tu cuenta no tiene un estudiante asociado'
                });
            }

            // Comparar IDs
            if (parseInt(idSolicitado) !== parseInt(req.usuario.estudianteId)) {
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    mensaje: 'Solo puedes acceder a tus propios datos',
                    intentaste: `Acceder a estudianteId: ${idSolicitado}`,
                    tuEstudianteId: req.usuario.estudianteId
                });
            }
        }

        // Validación exitosa, continuar
        next();
    };
};

/**
 * Middleware: soloSuClase
 * 
 * Valida que un docente solo pueda acceder a información de sus propias clases.
 * 
 * @param {string} paramName - Nombre del parámetro que contiene el claseId
 * @returns {Function} Middleware de Express
 * 
 * NOTA: Este middleware requiere consultar la base de datos para verificar
 * que la clase pertenece al docente. Se debe usar después de validarToken.
 */
const soloSuClase = (paramName = 'claseId') => {
    return async (req, res, next) => {
        // ADMIN puede ver cualquier clase
        if (req.usuario.rol === 'ADMIN') {
            return next();
        }

        // Solo DOCENTE puede usar este middleware
        if (req.usuario.rol !== 'DOCENTE') {
            return res.status(403).json({ 
                error: 'Acceso denegado',
                mensaje: 'Este recurso es solo para docentes'
            });
        }

        const claseId = req.query[paramName] || req.body[paramName] || req.params[paramName];

        if (!claseId) {
            return res.status(400).json({ 
                error: 'Parámetro faltante',
                mensaje: `Se requiere el parámetro: ${paramName}`
            });
        }

        try {
            // Importar modelo Clases (lazy loading para evitar dependencias circulares)
            const Clases = require('../modelos/Clases');
            
            const clase = await Clases.findByPk(claseId);

            if (!clase) {
                return res.status(404).json({ 
                    error: 'Clase no encontrada',
                    mensaje: `No existe una clase con ID: ${claseId}`
                });
            }

            // Verificar que el docente sea el dueño de la clase
            if (parseInt(clase.docenteId) !== parseInt(req.usuario.docenteId)) {
                return res.status(403).json({ 
                    error: 'Acceso denegado',
                    mensaje: 'Esta clase no te pertenece',
                    claseId: claseId,
                    docenteDeLaClase: clase.docenteId,
                    tuDocenteId: req.usuario.docenteId
                });
            }

            // El docente es el dueño de la clase
            next();

        } catch (error) {
            console.error('Error en middleware soloSuClase:', error);
            return res.status(500).json({ 
                error: 'Error al verificar permisos',
                mensaje: 'Ocurrió un error al validar el acceso a la clase'
            });
        }
    };
};

module.exports = {
    verificarRol,
    soloMisDatos,
    soloSuClase
};
