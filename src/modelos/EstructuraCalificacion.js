const db = require('../configuraciones/db');
const { DataTypes } = require('sequelize');

/**
 * Modelo para configurar la estructura de calificación por parcial y clase
 * Permite que cada docente defina el peso de acumulativo, examen y reposición
 */
const EstructuraCalificacion = db.define(
    'EstructuraCalificacion',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        parcialId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Parciales',
                key: 'id',
            },
        },
        claseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Clases',
                key: 'id',
            },
        },
        docenteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Docentes',
                key: 'id',
            },
        },
        // Porcentaje del acumulativo (evaluaciones normales)
        pesoAcumulativo: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 60.00,
            validate: {
                min: 0,
                max: 100,
            },
        },
        // Porcentaje del examen
        pesoExamen: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 40.00,
            validate: {
                min: 0,
                max: 100,
            },
        },
        // Porcentaje de la reposición (si aplica)
        pesoReposicion: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0.00,
            validate: {
                min: 0,
                max: 100,
            },
        },
        // Nota máxima del parcial (normalmente 100)
        notaMaximaParcial: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 100.00,
            validate: {
                min: 0,
                max: 100,
            },
        },
        // Nota mínima de aprobación
        notaMinimaAprobacion: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 70.00,
            validate: {
                min: 0,
                max: 100,
            },
        },
        // Estado activo/inactivo
        estado: {
            type: DataTypes.ENUM('ACTIVO', 'INACTIVO'),
            allowNull: false,
            defaultValue: 'ACTIVO',
        },
        // Notas adicionales sobre la estructura
        observaciones: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: 'EstructuraCalificacion',
        indexes: [
            {
                unique: true,
                fields: ['parcialId', 'claseId'],
            },
        ],
        validate: {
            // Validar que la suma de pesos sea 100%
            pesosSuman100() {
                const total = parseFloat(this.pesoAcumulativo) + 
                             parseFloat(this.pesoExamen) + 
                             parseFloat(this.pesoReposicion || 0);
                
                if (Math.abs(total - 100) > 0.01) {
                    throw new Error('La suma de los pesos debe ser 100%');
                }
            },
        },
    }
);

// Asociaciones
// NOTA: Las asociaciones se deben definir después de cargar todos los modelos
// para evitar dependencias circulares. Por ahora se comentan.
// const Parciales = require('./Parciales');
// const Clases = require('./Clases');
// const Docentes = require('./Docentes');

// EstructuraCalificacion.belongsTo(Parciales, { foreignKey: 'parcialId', as: 'parcial' });
// EstructuraCalificacion.belongsTo(Clases, { foreignKey: 'claseId', as: 'clase' });
// EstructuraCalificacion.belongsTo(Docentes, { foreignKey: 'docenteId', as: 'docente' });

module.exports = EstructuraCalificacion;
