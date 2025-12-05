const Periodos = require('../modelos/Periodos');
const { validationResult } = require('express-validator');
const Parciales = require('../modelos/Parciales');
const { Op } = require('sequelize');

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

// Helper: calcular parciales automáticamente (3 parciales de 4 semanas cada uno)
const generarParcialesAutomaticos = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  // Validar fechas
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    throw new Error('Fechas inválidas');
  }

  const parciales = [];
  const SEMANAS_POR_PARCIAL = 4;
  const DIAS_POR_SEMANA = 7;
  const DIAS_POR_PARCIAL = SEMANAS_POR_PARCIAL * DIAS_POR_SEMANA;

  for (let i = 1; i <= 3; i++) {
    const inicioParcial = new Date(inicio);
    inicioParcial.setDate(inicio.getDate() + ((i - 1) * DIAS_POR_PARCIAL));

    const finParcial = new Date(inicioParcial);
    finParcial.setDate(inicioParcial.getDate() + DIAS_POR_PARCIAL - 1);

    // Si es el último parcial, usar la fecha fin del periodo
    if (i === 3) {
      parciales.push({
        nombre: `Parcial ${i}`,
        fechaInicio: inicioParcial,
        fechaFin: fin
      });
    } else {
      parciales.push({
        nombre: `Parcial ${i}`,
        fechaInicio: inicioParcial,
        fechaFin: finParcial
      });
    }
  }

  return parciales;
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

    // Validar que no exista un periodo con las mismas fechas
    const periodoExistente = await Periodos.findOne({
      where: {
        fechaInicio: datosPeriodo.fechaInicio,
        fechaFin: datosPeriodo.fechaFin
      }
    });

    if (periodoExistente) {
      return res.status(400).json({ 
        error: 'Ya existe un periodo con estas fechas',
        msj: `Ya existe el periodo "${periodoExistente.nombre}" con las mismas fechas de inicio y fin.`,
        periodoExistente: {
          id: periodoExistente.id,
          nombre: periodoExistente.nombre,
          fechaInicio: periodoExistente.fechaInicio,
          fechaFin: periodoExistente.fechaFin
        }
      });
    }

    // Si hay nombre, validar que sea único
    if (datosPeriodo.nombre) {
      const nombreDuplicado = await Periodos.findOne({
        where: { nombre: datosPeriodo.nombre }
      });

      if (nombreDuplicado) {
        return res.status(400).json({ 
          error: 'Ya existe un periodo con ese nombre',
          msj: `El nombre "${datosPeriodo.nombre}" ya está en uso. Use otro nombre.`
        });
      }
    }

    // Generar nombre automático si no fue proporcionado
    if (!datosPeriodo.nombre) {
      const nombreGenerado = generarNombrePeriodo(datosPeriodo.fechaInicio);
      if (nombreGenerado) datosPeriodo.nombre = nombreGenerado;
    }

    const periodo = await Periodos.create(datosPeriodo);

    console.log("✅ Periodo creado:", periodo.dataValues);

    // Si vienen parciales en el body, usarlos; si no, generar automáticamente
    let parcialesACrear = parciales;
    
    if (!parciales || parciales.length === 0) {
      console.log("🔄 Generando 3 parciales automáticamente...");
      parcialesACrear = generarParcialesAutomaticos(
        datosPeriodo.fechaInicio, 
        datosPeriodo.fechaFin
      );
      console.log("📅 Parciales generados:", parcialesACrear);
    }

    if (parcialesACrear && parcialesACrear.length > 0) {
      const nuevosParciales = parcialesACrear.map(p => ({
        ...p,
        periodoId: periodo.id
      }));

      await Parciales.bulkCreate(nuevosParciales);
      console.log(`✅ ${nuevosParciales.length} parciales creados correctamente`);
    }

    res.json({ 
      msj: "Periodo guardado correctamente", 
      periodoId: periodo.id,
      parcialesCreados: parcialesACrear ? parcialesACrear.length : 0
    });

  } catch (error) {
    console.error("❌ Error al guardar el periodo:", error);
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

    // Validar que no exista otro periodo con las mismas fechas (excepto el actual)
    if (datosPeriodo.fechaInicio && datosPeriodo.fechaFin) {
      const duplicadoFechas = await Periodos.findOne({
        where: {
          fechaInicio: datosPeriodo.fechaInicio,
          fechaFin: datosPeriodo.fechaFin,
          id: { [Op.ne]: id }
        }
      });

      if (duplicadoFechas) {
        return res.status(400).json({ 
          error: 'Ya existe otro periodo con estas fechas',
          msj: `El periodo "${duplicadoFechas.nombre}" ya tiene estas fechas.`
        });
      }
    }

    // Validar que el nombre sea único (excepto el actual)
    if (datosPeriodo.nombre && datosPeriodo.nombre !== periodoExistente.nombre) {
      const duplicadoNombre = await Periodos.findOne({
        where: {
          nombre: datosPeriodo.nombre,
          id: { [Op.ne]: id }
        }
      });

      if (duplicadoNombre) {
        return res.status(400).json({ 
          error: 'Ya existe otro periodo con ese nombre',
          msj: `El nombre "${datosPeriodo.nombre}" ya está en uso.`
        });
      }
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

// FILTRO 1: Filtrar periodos por nombre (búsqueda parcial)
exports.filtrarPeriodosPorNombre = async (req, res) => {
  try {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
      const data = errores.array().map(i => ({
        atributo: i.path,
        msg: i.msg
      }));
      return res.status(400).json({ msj: 'Errores de validación', data });
    }

    const { nombre } = req.query;

    const periodos = await Periodos.findAll({
      where: {
        nombre: {
          [Op.like]: `%${nombre.trim()}%`
        }
      },
      include: [{
        model: Parciales,
        as: 'parciales',
        attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin']
      }],
      order: [['nombre', 'ASC']],
      attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin']
    });

    if (periodos.length === 0) {
      return res.status(200).json({ 
        msj: 'No se encontraron periodos con ese nombre', 
        data: [],
        count: 0
      });
    }

    res.status(200).json({
      msj: `Se encontraron ${periodos.length} periodo(s)`,
      data: periodos,
      count: periodos.length
    });
  } catch (error) {
    console.error('Error al filtrar periodos por nombre:', error);
    res.status(500).json({ error: 'Error al filtrar periodos por nombre' });
  }
};

// FILTRO 2: Filtrar periodos por rango de fechas
exports.filtrarPeriodosPorFecha = async (req, res) => {
  try {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
      const data = errores.array().map(i => ({
        atributo: i.path,
        msg: i.msg
      }));
      return res.status(400).json({ msj: 'Errores de validación', data });
    }

    const { fechaInicio, fechaFin } = req.query;

    // Convertir a objetos Date
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Validar que las fechas sean válidas
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ 
        msj: 'Fechas inválidas', 
        data: [] 
      });
    }

    // Validar que fechaInicio no sea mayor que fechaFin
    if (inicio > fin) {
      return res.status(400).json({ 
        msj: 'La fecha de inicio no puede ser mayor que la fecha fin', 
        data: [] 
      });
    }

    const periodos = await Periodos.findAll({
      where: {
        [Op.or]: [
          // Periodos que comienzan dentro del rango
          {
            fechaInicio: {
              [Op.between]: [inicio, fin]
            }
          },
          // Periodos que terminan dentro del rango
          {
            fechaFin: {
              [Op.between]: [inicio, fin]
            }
          },
          // Periodos que contienen el rango completo
          {
            fechaInicio: {
              [Op.lte]: inicio
            },
            fechaFin: {
              [Op.gte]: fin
            }
          }
        ]
      },
      include: [{
        model: Parciales,
        as: 'parciales',
        attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin']
      }],
      order: [['fechaInicio', 'ASC']],
      attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin']
    });

    if (periodos.length === 0) {
      return res.status(200).json({ 
        msj: 'No se encontraron periodos en el rango de fechas especificado', 
        data: [],
        count: 0
      });
    }

    res.status(200).json({
      msj: `Se encontraron ${periodos.length} periodo(s) en el rango especificado`,
      data: periodos,
      count: periodos.length
    });
  } catch (error) {
    console.error('Error al filtrar periodos por fecha:', error);
    res.status(500).json({ error: 'Error al filtrar periodos por fecha' });
  }
};