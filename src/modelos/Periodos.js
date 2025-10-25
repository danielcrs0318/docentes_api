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
        parcialId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Parciales',
                key: 'id'
            }
        }
    },
    {
        tableName: 'Periodos'
    }
);

module.exports = Periodos;
