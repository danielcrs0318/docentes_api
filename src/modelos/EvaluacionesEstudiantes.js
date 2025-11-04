const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const EvaluacionesEstudiantes = db.define(
    'EvaluacionesEstudiantes',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        evaluacionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Evaluaciones',
                key: 'id',
            },
        },
        estudianteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Estudiantes',
                key: 'id',
            },
        },
        nota: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
        estado: {
            type: DataTypes.ENUM('PENDIENTE', 'CALIFICADO'),
            allowNull: false,
            defaultValue: 'PENDIENTE',
        }
    },
    {
        tableName: 'EvaluacionesEstudiantes'
    }
);

module.exports = EvaluacionesEstudiantes;
