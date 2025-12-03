const { registrarLog } = require('../controladores/controladorAuditoria');

/**
 * Middleware para registrar automáticamente operaciones CRUD en auditoría
 * Debe colocarse después de la operación exitosa, antes de enviar la respuesta
 */
const registrarAuditoria = (accion, entidad, opciones = {}) => {
    return async (req, res, next) => {
        // Guardar el método original res.json
        const originalJson = res.json.bind(res);

        // Sobrescribir res.json para interceptar respuestas exitosas
        res.json = function (data) {
            // Solo registrar si la operación fue exitosa (status 200, 201)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Ejecutar registro de auditoría de forma asíncrona
                setImmediate(async () => {
                    try {
                        const usuarioId = req.usuario?.id || null;
                        const ip = req.ip || req.connection?.remoteAddress;
                        const userAgent = req.headers['user-agent'];

                        // Extraer ID de la entidad según sea necesario
                        let entidadId = null;
                        if (opciones.obtenerIdDe === 'query') {
                            entidadId = req.query.id || req.query[opciones.campoId || 'id'];
                        } else if (opciones.obtenerIdDe === 'params') {
                            entidadId = req.params.id || req.params[opciones.campoId || 'id'];
                        } else if (opciones.obtenerIdDe === 'body') {
                            entidadId = req.body.id || req.body[opciones.campoId || 'id'];
                        } else if (opciones.obtenerIdDe === 'data') {
                            // Intentar obtener del data de respuesta
                            entidadId = data?.id || data?.estructura?.id || data?.evaluacion?.id || data?.usuario?.id;
                        }

                        // Descripción personalizada o automática
                        let descripcion = opciones.descripcion;
                        if (typeof descripcion === 'function') {
                            descripcion = descripcion(req, data);
                        } else if (!descripcion) {
                            descripcion = `${accion} en ${entidad}${entidadId ? ` (ID: ${entidadId})` : ''}`;
                        }

                        // Datos anteriores (para EDITAR)
                        let datosAnteriores = null;
                        if (accion === 'EDITAR' && opciones.incluirDatosAnteriores) {
                            datosAnteriores = req.datosAnteriores || null;
                        }

                        // Datos nuevos (para CREAR y EDITAR)
                        let datosNuevos = null;
                        if ((accion === 'CREAR' || accion === 'EDITAR') && opciones.incluirDatosNuevos) {
                            // Omitir campos sensibles como contraseñas
                            const { contrasena, password, pin, ...datosSeguros } = req.body;
                            datosNuevos = datosSeguros;
                        }

                        await registrarLog({
                            usuarioId,
                            accion,
                            entidad,
                            entidadId,
                            descripcion,
                            ip,
                            userAgent,
                            datosAnteriores,
                            datosNuevos,
                            resultado: 'EXITOSO'
                        });
                    } catch (error) {
                        console.error('Error al registrar auditoría:', error);
                    }
                });
            }

            // Llamar al método original para enviar la respuesta
            return originalJson(data);
        };

        next();
    };
};

/**
 * Middleware para capturar el estado anterior antes de editar
 * Debe colocarse ANTES de la operación de actualización
 */
const capturarEstadoAnterior = (modelo, obtenerIdDe = 'query') => {
    return async (req, res, next) => {
        try {
            let id;
            if (obtenerIdDe === 'query') {
                id = req.query.id;
            } else if (obtenerIdDe === 'params') {
                id = req.params.id;
            } else if (obtenerIdDe === 'body') {
                id = req.body.id;
            }

            if (id) {
                const registroAnterior = await modelo.findByPk(id);
                if (registroAnterior) {
                    // Guardar en el request para usarlo luego
                    req.datosAnteriores = registroAnterior.toJSON();
                }
            }
        } catch (error) {
            console.error('Error al capturar estado anterior:', error);
        }
        next();
    };
};

module.exports = {
    registrarAuditoria,
    capturarEstadoAnterior
};

