const Periodos = require('../modelos/Periodos');
const { validationResult } = require('express-validator');
const Parciales = require('../modelos/Parciales');

// Controlador para obtener todos los periodos
exports.ListarPeriodos = async (req, res) => {
  try {
    const periodos = await Periodos.findAll();
    res.json(periodos);
  } catch (error) {
    console.error('Error al obtener los periodos:', error);
    res.status(500).json({ error: 'Error al obtener los periodos' });
  }
};

exports.CrearPeriodo = async (req, res) => {
  const errores = validationResult(req).errors;

  if (errores.length > 0) {
    const data = errores.map(i => ({
      atributo: i.path,
      msg: i.msg
    }));
    console.log(errores);
    return res.json({ msj: "Hay errores.", data: data });
  }

  try {
    const { parciales, ...datosPeriodo } = req.body;

    const periodo = await Periodos.create(datosPeriodo);

    console.log("Periodo creado:", periodo.dataValues);

    if (parciales && parciales.length > 0) {
      const nuevosParciales = parciales.map(p => ({
        ...p,
        periodoId: periodo.id
      }));

      await Parciales.bulkCreate(nuevosParciales);
      console.log("Parciales creados correctamente");
    }

    res.json({ msj: "Periodo guardado correctamente" });

  } catch (error) {
    console.error("Error al guardar el periodo:", error);
    res.status(500).json({ msj: "Error al guardar el periodo", error: error.message });
  }
};


// Controlador para editar un periodo
exports.EditarPeriodo = async (req, res) => {
  const errores = validationResult(req).errors;

  if (errores.length > 0) {
    const data = errores.map(i => ({
      atributo: i.path,
      msg: i.msg
    }));
    console.log(errores);
    return res.json({ msj: "Hay errores.", data: data });
  }

  try {
    const { id } = req.query;
    const { parciales, ...datosPeriodo } = req.body;

    // Verificar si el periodo existe
    const periodoExistente = await Periodos.findByPk(id);
    if (!periodoExistente) {
      return res.status(404).json({ msj: "Periodo no encontrado" });
    }

    // Actualizar el periodo
    await Periodos.update(datosPeriodo, {
      where: { id }
    });

    console.log("Periodo actualizado:", id);

    // Manejar los parciales
    if (parciales && parciales.length > 0) {
      // Eliminar parciales existentes
      await Parciales.destroy({
        where: { periodoId: id }
      });

      // Crear nuevos parciales
      const nuevosParciales = parciales.map(p => ({
        ...p,
        periodoId: id
      }));

      await Parciales.bulkCreate(nuevosParciales);
      console.log("Parciales actualizados correctamente");
    }

    res.json({ msj: "Periodo actualizado correctamente" });

  } catch (error) {
    console.error("Error al actualizar el periodo:", error);
    res.status(500).json({ msj: "Error al actualizar el periodo", error: error.message });
  }
};
// Controlador para eliminar un periodo
exports.EliminarPeriodo = async (req, res) => {
  try {
    const { id } = req.query;

    // Verificar si el periodo existe
    const periodoExistente = await Periodos.findByPk(id);
    if (!periodoExistente) {
      return res.status(404).json({ msj: "Periodo no encontrado" });
    }

    // Eliminar primero los parciales asociados (por la foreign key)
    await Parciales.destroy({
      where: { periodoId: id }
    });

    // Luego eliminar el periodo
    await Periodos.destroy({
      where: { id }
    });

    console.log("Periodo eliminado:", id);
    res.json({ msj: "Periodo eliminado correctamente" });

  } catch (error) {
    console.error("Error al eliminar el periodo:", error);
    res.status(500).json({ msj: "Error al eliminar el periodo", error: error.message });
  }
};