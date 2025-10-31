const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

const Estudiantes = db.define(
    'Estudiantes',
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
        apellido: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        correo: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        seccionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Secciones',
                key: 'id'
            }
        },
        claseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Clases',
                key: 'id'
            }
        },
        estado: {
            type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'RETIRADO'),
            allowNull: false,
            defaultValue: 'ACTIVO'
        }
    },
    {
        tableName: 'Estudiantes'
    }
);

module.exports = Estudiantes;
