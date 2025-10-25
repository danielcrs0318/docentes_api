const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Parciales = db.define(
    'Parciales',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
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
        }
    }, 
    {
        tableName: 'Parciales'
    }
);

module.exports = Parciales;
