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
        },
        seccionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Secciones',
                key: 'id'
            }
        }
    },
    {
        tableName: 'Aulas'
    }
);

module.exports = Aulas;
