const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Clases = db.define(
    'Clases',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        codigo: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true
        },
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        docenteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Docentes',
                key: 'id'
            }
        },
        //función para días de la semana ejemplo: ["Lunes", "Miércoles", "Viernes"]
        diaSemana: {
            type: DataTypes.JSON,
            allowNull: false
        },
    },
    {
        tableName: 'Clases'
    });

module.exports = Clases;