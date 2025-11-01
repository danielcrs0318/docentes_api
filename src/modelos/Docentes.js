const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Docentes = db.define(
    'Docentes',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        correo: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        }
    },
    {
        tableName: 'Docentes'
    }
);

module.exports = Docentes;
