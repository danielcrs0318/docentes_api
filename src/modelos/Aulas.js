const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Aulas = db.define(
    'Aulas',
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
