const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Grupos = db.define(
    'Grupos',
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
        claseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Clases',
                key: 'id'
            }
        },
        proyectoId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Proyectos',
                key: 'id'
            }
        }
    },
    {
        tableName: 'Grupos',
        timestamps: true
    }
);

module.exports = Grupos;
