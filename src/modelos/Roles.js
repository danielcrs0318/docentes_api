const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Roles = db.define(
    'Roles',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.ENUM('ADMIN', 'DOCENTE', 'ESTUDIANTE'),
            allowNull: false
        },
        descripcion: {
            type: DataTypes.STRING(200),
            allowNull: true
        }
    },
    {
        tableName: 'Roles',
        timestamps: true
    }
);

module.exports = Roles;
