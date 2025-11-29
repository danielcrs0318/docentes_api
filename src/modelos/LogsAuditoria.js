const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/db');
const Usuarios = require('./Usuarios');

const LogsAuditoria = sequelize.define('LogsAuditoria', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Usuarios',
            key: 'id'
        }
    },
    accion: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Tipo de acción: LOGIN, LOGOUT, CREAR, EDITAR, ELIMINAR, etc.'
    },
    entidad: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Entidad afectada: Estudiantes, Clases, Evaluaciones, etc.'
    },
    entidadId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID del registro afectado'
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción detallada de la acción'
    },
    ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Dirección IP del usuario'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User Agent del navegador'
    },
    datosAnteriores: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Estado anterior del registro (para ediciones)'
    },
    datosNuevos: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Estado nuevo del registro (para ediciones/creaciones)'
    },
    resultado: {
        type: DataTypes.ENUM('EXITOSO', 'FALLIDO'),
        defaultValue: 'EXITOSO',
        allowNull: false
    },
    mensajeError: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensaje de error si la acción falló'
    }
}, {
    tableName: 'LogsAuditoria',
    timestamps: true,
    updatedAt: false // Solo necesitamos createdAt
});

// Relaciones
LogsAuditoria.belongsTo(Usuarios, {
    foreignKey: 'usuarioId',
    as: 'usuario'
});

module.exports = LogsAuditoria;
