const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Evaluaciones = db.define(
    'Evaluaciones',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        titulo: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        notaMaxima: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
        // peso relativo dentro del parcial (por defecto 1). Se usa para calcular promedios ponderados
        peso: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 1.0
        },
        // tipo de evaluación: NORMAL, REPOSICION o EXAMEN
        tipo: {
            type: DataTypes.ENUM('NORMAL', 'REPOSICION', 'EXAMEN'),
            allowNull: false,
            defaultValue: 'NORMAL'
        },
        fechaInicio: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        fechaCierre: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        estructura: {
            // campo JSON para permitir estructuras flexibles por parcial
            type: DataTypes.JSON,
            allowNull: true,
        },
        estado: {
            type: DataTypes.ENUM('ACTIVO', 'INACTIVO'),
            allowNull: false,
            defaultValue: 'ACTIVO',
        },
        claseId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Opcional para permitir evaluaciones sin asignar a clase
            references: {
                model: 'Clases',
                key: 'id',
            },
        },
        seccionId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Opcional
            references: {
                model: 'Secciones',
                key: 'id',
            },
        },
        parcialId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Parciales',
                key: 'id',
            },
        },
        periodoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Periodos',
                key: 'id',
            },
        },
        creadoPor: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Docentes',
                key: 'id',
            },
            comment: 'ID del docente que creó la evaluación'
        },
        evaluacionReemplazadaId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Evaluaciones',
                key: 'id',
            },
            comment: 'ID de la evaluación (examen) que será reemplazada por esta reposición'
        },
    },
    {
        tableName: 'Evaluaciones',
    }
);

module.exports = Evaluaciones;
