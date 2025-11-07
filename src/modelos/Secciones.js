const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Seccion = db.define(
    'Seccion',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(6),
            allowNull: false
        },
        aulaId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Aulas',
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
        }
    },
    {
        tableName: 'Secciones'
    }
);

module.exports = Seccion;
