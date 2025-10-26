const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Parciales = db.define(
    'Parciales',
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
        periodoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Periodos',
                key: 'id'
            }
        }
    }, 
    {
        tableName: 'Parciales'
    }
);

module.exports = Parciales;
