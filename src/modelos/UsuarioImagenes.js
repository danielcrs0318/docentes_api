const db = require('../configuraciones/db');
const { DataTypes} = require('sequelize');
const moment = require('moment');

const UsuarioImagen = db.define(
    'usuarioImagenes',
    {
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
                model: 'usuarios',
                key: 'id'
            }
        }
    },
    {
        tableName: 'usuarioImagenes'
    }
);

// Las asociaciones se definirán en app.js
module.exports = UsuarioImagen;