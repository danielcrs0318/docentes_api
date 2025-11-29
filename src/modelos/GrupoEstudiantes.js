const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const GrupoEstudiantes = db.define(
    'GrupoEstudiantes',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        grupoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Grupos',
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
        }
    },
    {
        tableName: 'GrupoEstudiantes',
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: 'unique_grupo_estudiante',
                fields: ['grupoId', 'estudianteId']
            }
        ]
    }
);

module.exports = GrupoEstudiantes;
