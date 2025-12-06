const db = require('../configuraciones/db');
const { DataTypes} = require('sequelize');
const moment = require('moment');

const Usuario = db.define(
    'Usuarios',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        login: { type: DataTypes.STRING(50), allowNull: false },
        correo: { type: DataTypes.STRING(150), allowNull: false },
        pin: { type: DataTypes.STRING(6), allowNull: true },
        pinExpiracion: { type: DataTypes.DATE, allowNull: true },
        intentos: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        contrasena: { type: DataTypes.STRING(250), allowNull: false },
        requiereCambioContrasena: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        estado: { type: DataTypes.ENUM('AC', 'IN', 'BL'), allowNull: true, defaultValue: 'AC' },
        rolId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Roles',
                key: 'id'
            }
        },
        docenteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Docentes',
                key: 'id'
            }
        },
        estudianteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Estudiantes',
                key: 'id'
            }
        }
    },
    {
        tableName: 'Usuarios'
    }
);

// Las relaciones se definirán en app.js
module.exports = Usuario;