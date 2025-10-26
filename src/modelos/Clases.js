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
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        //hacer modelo para secciones
        seccion: {
            type: DataTypes.STRING(10),
            allowNull: false
        },
        //hacer modelo para dias de la semana
        diaSemana: {
            type: DataTypes.JSON,
            allowNull: false
        },
        aula: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
    },
    {
        tableName: 'Clases'
    });

module.exports = Clases;