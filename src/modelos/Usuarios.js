const db = require('../../configuraciones/db');
const { DataTypes} = require('sequelize');
const moment = require('moment');
const modeloDocentes = require('./Docentes');

const Usuario = db.define(
    'usuario',
    {
        login: { type: DataTypes.STRING(50), allowNull: false },
        correo: { type: DataTypes.STRING(150), allowNull: false },
        pin: { type: DataTypes.STRING(10), allowNull: true, defaultValue: '0000' },
        intentos: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        contrasena: { type: DataTypes.STRING(250), allowNull: false },
        estado:{ type: DataTypes.ENUM('AC', 'IN', 'BL'), allowNull: true, defaultValue: 'AC' }
    },
    {
        tableName: 'usuarios'
    }
);

modeloDocentes.hasMany(Usuario, { foreignKey: 'docenteId' });
Usuario.belongsTo(modeloDocentes, { foreignKey: 'docenteId' });

module.exports= Usuario;