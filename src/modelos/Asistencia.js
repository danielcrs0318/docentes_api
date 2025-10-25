const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Asistencia = db.define(
    'Asistencia',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        estudianteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Estudiantes',
                key: 'id'
            }
        },
        periodoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Periodos',
                key: 'id'
            }
        },
        parcialId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Parciales',
                key: 'id'
            }
        },
        claseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Clases',
                key: 'id'
            }
        },
        fecha: {
            type: DataTypes.DATE,
            allowNull: false
        },
        estado: {
            type: DataTypes.ENUM('PRESENTE', 'AUSENTE', 'TARDANZA'),
            allowNull: false,
            defaultValue: 'PRESENTE'
        }
    },
    {
        tableName: 'Asistencias'
    }
);

module.exports = Asistencia;
