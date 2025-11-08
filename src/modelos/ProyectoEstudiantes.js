/*
const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const ProyectoEstudiantes = db.define(
    'ProyectoEstudiantes',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        proyectoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Proyectos',
                key: 'id'
            }
        },
        estudianteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Estudiantes',
                key: 'id'
            }
        },
        entregaArchivo: {
            type: DataTypes.STRING(300),
            allowNull: true
        },
        entregaFecha: {
            type: DataTypes.DATE,
            allowNull: true
        },
        estadoEntrega: {
            type: DataTypes.ENUM('NO_ENTREGADO', 'ENTREGADO', 'RETRASADO'),
            allowNull: false,
            defaultValue: 'NO_ENTREGADO'
        }
    },
    {
        tableName: 'ProyectoEstudiantes'
    }
);

module.exports = ProyectoEstudiantes;
*/