const Parciales = require('../modelos/Parciales');
const { validationResult } = require('express-validator');

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

    // Crear el nuevo parcial
    const data = await Parciales.create({ ...req.body });
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

    const resultado = await Parciales.update({ ...req.body }, { where: { id } });

    console.log('Parcial editado:', resultado);
    res.json({ msj: 'Parcial editado exitosamente', data: resultado });
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
