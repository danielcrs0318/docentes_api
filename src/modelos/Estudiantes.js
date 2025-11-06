const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Estudiantes = db.define(
    'Estudiantes',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        correo: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        estado: {
            type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'RETIRADO'),
            allowNull: false,
            defaultValue: 'ACTIVO'
        }
    },
    {
        tableName: 'Estudiantes'
    }
);

module.exports = Estudiantes;
