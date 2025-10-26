const {Router} = require('express');
const {body, query} = require('express-validator');
const controladorAulas = require('../controladores/controladorAulas');
const rutas = Router();
const Aulas = require('../modelos/Aulas');

// Rutas para Aulas
rutas.get('/listar',
    controladorAulas.ListarAulas);

rutas.post('/guardar', [
    body('nombre')
        .notEmpty()
        .isLength({min: 3, max: 50})
        .withMessage('El nombre debe tener entre 3 y 50 caracteres')
        .custom(async (value) => {
            // Validar que no exista un aula con el mismo nombre
            const aulaExistente = await Aulas.findOne({ where: { nombre: value } });
            if (aulaExistente) {
                throw new Error('Ya existe un aula con ese nombre');
            }
        }),
    body('capacidad')
        .notEmpty()
        .isInt({min: 1})  // Cambié min: 9 por min: 1
        .withMessage('La capacidad debe ser un número entero mayor que 0')
], controladorAulas.CrearAula);

rutas.put('/editar', [
    query('id')  
        .notEmpty()
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero válido'),
    body('nombre')
        .notEmpty()
        .isLength({min: 3, max: 50})
        .withMessage('El nombre debe tener entre 3 y 50 caracteres')
        .custom(async (value, { req }) => {
            const aulaExistente = await Aulas.findOne({ 
                where: { nombre: value } 
            });
            // Si existe un aula con el mismo nombre Y no es la misma que estamos editando
            if (aulaExistente && aulaExistente.id !== parseInt(req.query.id)) { // ← Cambiar a req.query.id
                throw new Error('Ya existe otra aula con ese nombre');
            }
        }),
    body('capacidad')
        .notEmpty()
        .isInt({min: 1})
        .withMessage('La capacidad debe ser un número entero mayor que 0'),
    query('id').custom(async (value) => {  
        const aulaExistente = await Aulas.findOne({ where: { id: value } });
        if (!aulaExistente) {
            throw new Error('Aula no encontrada');
        }
    })
], controladorAulas.ActualizarAula);

rutas.delete('/eliminar', [
    query('id')
        .notEmpty()
        .isInt()
        .withMessage('El ID debe ser un número entero'),
    query('id').custom(async (value) => {
        const aulaExistente = await Aulas.findOne({ where: { id: value } });
        if (!aulaExistente) {
            throw new Error('Aula no encontrada');
        }
    })
], controladorAulas.EliminarAula);

module.exports = rutas;
