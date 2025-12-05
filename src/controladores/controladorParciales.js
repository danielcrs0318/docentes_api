const Parciales = require('../modelos/Parciales');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Controlador para obtener todos los parciales
exports.ListarParciales = async (req, res) => {
  try {
    const parciales = await Parciales.findAll();
    res.json(parciales);
  } catch (error) {
    console.error('Error al obtener los parciales:', error);
    res.status(500).json({ error: 'Error al obtener los parciales' });
  }
};

// Controlador para crear un nuevo parcial
exports.CrearParcial = async (req, res) => {
  try {
    const errores = validationResult(req);

    // Validar si hay errores en los campos
    if (!errores.isEmpty()) {
      const data = errores.array().map(i => ({
        atributo: i.path,
        msg: i.msg
      }));
      return res.status(400).json({ msj: 'Errores de validación', data });
    }

    const { nombre, fechaInicio, fechaFin, periodoId } = req.body;

    // Validar que no exista un parcial con el mismo nombre en el mismo periodo
    const parcialExistente = await Parciales.findOne({
      where: {
        nombre,
        periodoId: parseInt(periodoId)
      }
    });

    if (parcialExistente) {
      return res.status(400).json({ 
        error: 'Ya existe un parcial con ese nombre en este periodo',
        msj: `El parcial "${nombre}" ya existe en este periodo. Use otro nombre o verifique si ya fue creado.`
      });
    }

    // Convertir las fechas a objetos Date
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    // Validar que la fecha de inicio sea menor que la fecha de fin
    if (fechaInicioDate >= fechaFinDate) {
      return res.status(400).json({ 
        error: 'La fecha de inicio debe ser anterior a la fecha de fin'
      });
    }

    // Crear el nuevo parcial con las fechas convertidas
    const data = await Parciales.create({
      nombre,
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      periodoId: parseInt(periodoId)
    });

    console.log('Parcial creado:', data);
    res.status(201).json({ msj: 'Parcial creado exitosamente', data });

  } catch (error) {
    console.error('Error al crear el parcial:', error);
    res.status(500).json({ error: 'Error al crear el parcial' });
  }
};

// Controlador para editar un parcial
exports.EditarParcial = async (req, res) => {
  try {
    const { id } = req.query;
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
      const data = errores.array().map(i => ({
        atributo: i.path,
        msg: i.msg
      }));
      return res.status(400).json({ msj: 'Errores de validación', data });
    }

    // Verificar si el parcial existe
    const parcial = await Parciales.findByPk(id);
    if (!parcial) {
      return res.status(404).json({ msj: 'Parcial no encontrado' });
    }

    const { nombre, fechaInicio, fechaFin, periodoId } = req.body;

    // Validar que no exista otro parcial con el mismo nombre en el mismo periodo (excepto el actual)
    const parcialDuplicado = await Parciales.findOne({
      where: {
        nombre,
        periodoId: parseInt(periodoId),
        id: { [Op.ne]: id } // Excluir el parcial actual
      }
    });

    if (parcialDuplicado) {
      return res.status(400).json({ 
        error: 'Ya existe otro parcial con ese nombre en este periodo',
        msj: `Ya existe un parcial llamado "${nombre}" en este periodo.`
      });
    }

    // Convertir las fechas a objetos Date
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    // Validar que la fecha de inicio sea menor que la fecha de fin
    if (fechaInicioDate >= fechaFinDate) {
      return res.status(400).json({ 
        error: 'La fecha de inicio debe ser anterior a la fecha de fin'
      });
    }

    // Actualizar el parcial
    await parcial.update({
      nombre,
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      periodoId: parseInt(periodoId)
    });

    console.log('Parcial editado:', parcial);
    res.json({ msj: 'Parcial editado exitosamente', data: parcial });
  } catch (error) {
    console.error('Error al editar el parcial:', error);
    res.status(500).json({ error: 'Error al editar el parcial' });
  }
};

// Controlador para eliminar un parcial
exports.EliminarParcial = async (req, res) => {
  try {
    const { id } = req.query;
    await Parciales.destroy({ where: { id } });

    console.log('Parcial eliminado:', id);
    res.json({ msj: 'Parcial eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar el parcial:', error);
    res.status(500).json({ error: 'Error al eliminar el parcial' });
  }
};

// FILTRO 1: Filtrar parciales por nombre (búsqueda parcial)
exports.filtrarParcialesPorNombre = async (req, res) => {
  try {
    const errores = validationResult(req);

    // Validar si hay errores en los campos
    if (!errores.isEmpty()) {
      const data = errores.array().map(i => ({
        atributo: i.path,
        msg: i.msg
      }));
      return res.status(400).json({ msj: 'Errores de validación', data });
    }

    const { nombre } = req.query;

    const parciales = await Parciales.findAll({
      where: {
        nombre: {
          [Op.like]: `%${nombre.trim()}%`
        }
      },
      order: [['nombre', 'ASC']]
    });

    if (parciales.length === 0) {
      return res.status(200).json({ 
        msj: 'No se encontraron parciales con ese nombre', 
        data: [] 
      });
    }

    res.status(200).json({
      msj: `Se encontraron ${parciales.length} parcial(es)`,
      data: parciales
    });
  } catch (error) {
    console.error('Error al filtrar parciales por nombre:', error);
    res.status(500).json({ error: 'Error al filtrar parciales por nombre' });
  }
};
