const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const EstudiantesClases = db.define(
    'EstudiantesClases',
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
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        claseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Clases',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        seccionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Secciones',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        fechaInscripcion: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'EstudiantesClases',
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: 'unique_estudiante_clase_seccion',
                fields: ['estudianteId', 'claseId', 'seccionId']
            }
        ],
        // Evitar que Sequelize cree índices automáticos por las FK
        uniqueKeys: {}
    }
);

module.exports = EstudiantesClases;
