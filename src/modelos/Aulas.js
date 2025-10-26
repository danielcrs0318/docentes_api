const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Aulas = db.define(
    'Aulas',
    {
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        capacidad: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        tableName: 'Aulas'
    }
);

module.exports = Aulas;
