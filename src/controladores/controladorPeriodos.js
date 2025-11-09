const Periodos = require('../modelos/Periodos');
const { validationResult } = require('express-validator');
const Parciales = require('../modelos/Parciales');

// Helper: generar nombre del periodo según fechaInicio
const generarNombrePeriodo = (fechaInicio) => {
  if (!fechaInicio) return null;
  const fecha = (fechaInicio instanceof Date) ? fechaInicio : new Date(fechaInicio);
  if (isNaN(fecha.getTime())) return null;

  const mes = fecha.getMonth() + 1; // 1-12
  let numeroPeriodo = 1;
  if (mes >= 1 && mes <= 4) numeroPeriodo = 1; // Ene-Abr
  else if (mes >= 5 && mes <= 8) numeroPeriodo = 2; // May-Ago
  else if (mes >= 9 && mes <= 12) numeroPeriodo = 3; // Sep-Dic

  const prefijoI = 'I'.repeat(numeroPeriodo);
  const yy = String(fecha.getFullYear()).slice(-2);
  return `${prefijoI}P${yy}`;
};

// Controlador para obtener todos los periodos
exports.ListarPeriodos = async (req, res) => {
  try {
    const periodos = await Periodos.findAll({
      include: [{
        model: Parciales,
        as: 'parciales',
        attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin']
      }],
      order: [
        ['fechaInicio', 'DESC']
      ],
      attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin'] // Campos específicos del periodo
    });

    if (!periodos || periodos.length === 0) {
      return res.json({ 
        msj: "No hay periodos registrados", 
        data: [],
        count: 0
      });
    }

    // Formatear la respuesta para incluir conteo
    const periodosFormateados = periodos.map(periodo => ({
      ...periodo.toJSON(),
      totalParciales: periodo.parciales ? periodo.parciales.length : 0
    }));

    console.log(`Se encontraron ${periodos.length} periodos`);
    
    res.json({ 
      msj: "Periodos obtenidos correctamente", 
      data: periodosFormateados,
      count: periodos.length
    });

  } catch (error) {
    console.error("Error al listar periodos:", error);
    res.status(500).json({ 
      msj: "Error al listar periodos", 
      error: error.message 
    });
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

       // Generar nombre automático si no fue proporcionado
    if (!datosPeriodo.nombre) {
      const nombreGenerado = generarNombrePeriodo(datosPeriodo.fechaInicio);
      if (nombreGenerado) datosPeriodo.nombre = nombreGenerado;
    }

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