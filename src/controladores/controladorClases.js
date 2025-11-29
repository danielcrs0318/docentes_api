const Clases = require('../modelos/Clases');
const Seccion = require('../modelos/Secciones');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Controlador para obtener todas las clases
exports.ListarClases = async (req, res) => {
    try {
        const clases = await Clases.findAll({
            attributes: ['id', 'codigo', 'nombre', 'diaSemana'],
            include: [{
                model: Seccion,
                as: 'secciones',
                attributes: ['id', 'nombre', 'aulaId']
            }]
        });
        res.json(clases);
    } catch (error) {
        console.error('Error al listar clases:', error);
        res.status(500).json({ error: 'Error al listar clases' });
    }
};

// Controlador para crear una nueva clase
exports.CrearClase = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { codigo, nombre, diaSemana, creditos } = req.body;

    try {
        // Verificar si ya existe una clase con el mismo código
        const claseExistente = await Clases.findOne({ 
            where: { codigo }
        });

        if (claseExistente) {
            return res.status(400).json({ 
                error: 'Ya existe una clase con ese código'
            });
        }

        const nuevaClase = await Clases.create({
            codigo,
            nombre,
            diaSemana,
            creditos
        });
        res.status(201).json(nuevaClase);
    } catch (error) {
        console.error('Error al crear clase:', error);
        res.status(500).json({ error: 'Error al crear clase' });
    }
};

// Controlador para actualizar una clase existente
exports.ActualizarClase = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { codigo, nombre, diaSemana } = req.body;
    const { id } = req.query;

    try {
        // Verificar si la clase existe
        const clase = await Clases.findByPk(id);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Verificar si existe otra clase con el mismo código (excepto la actual)
        const claseExistente = await Clases.findOne({
            where: {
                codigo: codigo,
                id: { [Op.ne]: id } // Excluir la clase actual de la búsqueda
            }
        });

        if (claseExistente) {
            return res.status(400).json({
                error: 'Ya existe otra clase con ese código'
            });
        }

        clase.codigo = codigo;
        clase.nombre = nombre;
        clase.diaSemana = diaSemana;

        await clase.save();
        res.json(clase);
    } catch (error) {
        console.error('Error al actualizar clase:', error);
        res.status(500).json({ error: 'Error al actualizar clase' });
    }
};

// Controlador para eliminar una clase
exports.EliminarClase = async (req, res) => {
    const { id } = req.query;

    try {
        const clase = await Clases.findByPk(id);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        await clase.destroy();
        res.json({ message: 'Clase eliminada' });
    } catch (error) {
        console.error('Error al eliminar clase:', error);
        res.status(500).json({ error: 'Error al eliminar clase' });
    }
};

// FILTRO 1: Filtrar clases por nombre (búsqueda parcial)
exports.filtrarClasesPorNombre = async (req, res) => {
    try {
        const { nombre } = req.query;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ 
                error: 'El parámetro "nombre" es requerido y no puede estar vacío' 
            });
        }

        const clases = await Clases.findAll({
            where: {
                nombre: {
                    [Op.like]: `%${nombre.trim()}%`
                }
            },
            order: [['nombre', 'ASC']]
        });

        if (clases.length === 0) {
            return res.status(200).json({ 
                message: 'No se encontraron clases con ese nombre', 
                datos: [] 
            });
        }

        res.status(200).json({
            message: `Se encontraron ${clases.length} clase(s)`,
            datos: clases
        });
    } catch (error) {
        console.error('Error al filtrar clases por nombre:', error);
        res.status(500).json({ 
            error: 'Error al filtrar clases por nombre',
            detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// FILTRO 2: Filtrar clases por día de la semana y créditos
exports.filtrarClasesPorDiaYCreditos = async (req, res) => {
    try {
        const { diaSemana, creditosMin, creditosMax } = req.query;

        // Validar que al menos un parámetro esté presente
        if (!diaSemana && !creditosMin && !creditosMax) {
            return res.status(400).json({ 
                error: 'Se requiere al menos uno de los parámetros: diaSemana, creditosMin o creditosMax' 
            });
        }

        let whereClause = {};

        // Filtro por día de la semana (búsqueda exacta)
        if (diaSemana) {
            if (diaSemana.trim() === '') {
                return res.status(400).json({ 
                    error: 'El parámetro diaSemana no puede estar vacío' 
                });
            }
            whereClause.diaSemana = {
                [Op.eq]: diaSemana.trim()
            };
        }

        // Filtro por créditos (rango)
        if (creditosMin || creditosMax) {
            const min = creditosMin ? parseInt(creditosMin) : null;
            const max = creditosMax ? parseInt(creditosMax) : null;

            // Validar que sean números válidos
            if (creditosMin && isNaN(min)) {
                return res.status(400).json({ 
                    error: 'El parámetro creditosMin debe ser un número válido' 
                });
            }
            if (creditosMax && isNaN(max)) {
                return res.status(400).json({ 
                    error: 'El parámetro creditosMax debe ser un número válido' 
                });
            }

            // Validar que los valores sean positivos
            if ((min && min < 0) || (max && max < 0)) {
                return res.status(400).json({ 
                    error: 'Los valores de créditos deben ser números positivos' 
                });
            }

            // Validar que min no sea mayor que max
            if (min && max && min > max) {
                return res.status(400).json({ 
                    error: 'creditosMin no puede ser mayor que creditosMax' 
                });
            }

            if (min && max) {
                whereClause.creditos = {
                    [Op.between]: [min, max]
                };
            } else if (min) {
                whereClause.creditos = {
                    [Op.gte]: min
                };
            } else if (max) {
                whereClause.creditos = {
                    [Op.lte]: max
                };
            }
        }

        const clases = await Clases.findAll({
            where: whereClause,
            order: [
                ['diaSemana', 'ASC'],
                ['creditos', 'DESC'],
                ['nombre', 'ASC']
            ]
        });

        if (clases.length === 0) {
            return res.status(200).json({ 
                message: 'No se encontraron clases con los criterios especificados', 
                datos: [] 
            });
        }

        res.status(200).json({
            message: `Se encontraron ${clases.length} clase(s)`,
            datos: clases
        });
    } catch (error) {
        console.error('Error al filtrar clases por día y créditos:', error);
        res.status(500).json({ 
            error: 'Error al filtrar clases por día y créditos',
            detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};