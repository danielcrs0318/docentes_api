const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const AsistenciaImagen = db.define(
    'asistenciaImagenes',
    {
        imagen: {
            type: DataTypes.STRING(250),
            allowNull: false,
            comment: 'Nombre del archivo de imagen de excusa'
        },
        estado: {
            type: DataTypes.ENUM('AC', 'IN', 'BL'),
            allowNull: false,
            defaultValue: 'AC',
            comment: 'AC=Activo, IN=Inactivo, BL=Bloqueado'
        },
        asistenciaId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Asistencias',
                key: 'id'
            },
            onDelete: 'CASCADE',
            comment: 'ID de la asistencia asociada'
        }
    },
    {
        tableName: 'asistenciaImagenes'
    }
);

// Las asociaciones se definirán en app.js
module.exports = AsistenciaImagen;
