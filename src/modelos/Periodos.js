const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Periodos = db.define(
    'Periodos',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        fechaInicio: {
            type: DataTypes.DATE,
            allowNull: false
        },
        fechaFin: {
            type: DataTypes.DATE,
            allowNull: false
        },
    },
    {
        tableName: 'Periodos'
    }
);

module.exports = Periodos;
