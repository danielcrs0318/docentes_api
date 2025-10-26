const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Periodos = db.define(
    'Periodos',
    {
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: false
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
