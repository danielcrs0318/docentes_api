const db = require('../configuraciones/db');
const { DataTypes} = require('sequelize');
const moment = require('moment');

const UsuarioImagen = db.define(
    'UsuarioImagenes',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        imagen: {
            type: DataTypes.STRING(250),
            allowNull: true
        },
        estado:{
            type: DataTypes.ENUM('AC', 'IN', 'BL'),
            allowNull: true,
            defaultValue: 'AC'
        },
        usuarioId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Usuarios',
                key: 'id'
            }
        }
    },
    {
        tableName: 'UsuarioImagenes'
    }
);

// Las asociaciones se definirán en app.js
module.exports = UsuarioImagen;