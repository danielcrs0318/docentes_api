const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Proyectos = db.define(
  'Proyectos',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_entrega: {
      type: DataTypes.DATE,
      allowNull: true
    },
    estado: {
      type: DataTypes.ENUM('PENDIENTE', 'EN_CURSO', 'ENTREGADO', 'CERRADO'),
      allowNull: false,
      defaultValue: 'PENDIENTE'
    },
    claseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Clases',
        key: 'id'
      }
    }
  },
  {
    tableName: 'Proyectos'
  }
);

module.exports = Proyectos;