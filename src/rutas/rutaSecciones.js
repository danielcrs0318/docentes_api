const {Router} = require('express');
const {body, query} = require('express-validator');
const controladorSecciones = require('../controladores/controladorSecciones');
const rutas = Router();
const Secciones = require('../modelos/Secciones');

// Ruta para obtener todas las secciones
rutas.get('/listar',
    controladorSecciones.ListarSecciones
);

// Ruta para crear una nueva sección
rutas.post('/guardar',
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('aulaId').isInt().withMessage('El ID de aula debe ser un número entero'),
    body('claseId').isInt().withMessage('El ID de clase debe ser un número entero'),
    controladorSecciones.CrearSeccion
);

// Ruta para actualizar una sección existente
rutas.put('/editar',
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('aulaId').isInt().withMessage('El ID de aula debe ser un número entero'),
    body('claseId').isInt().withMessage('El ID de clase debe ser un número entero'),
    controladorSecciones.ActualizarSeccion
);

// Ruta para eliminar una sección
rutas.delete('/eliminar',
    query('id').isInt().withMessage('El ID debe ser un número entero'),
    controladorSecciones.EliminarSeccion
);
module.exports = rutas;