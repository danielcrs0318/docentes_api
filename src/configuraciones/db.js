const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL || process.env.supabaseUrl;

console.log('🔗 Intentando conectar a la base de datos...');
console.log('Connection string presente:', !!connectionString);

const db = new Sequelize(connectionString, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: console.log,
    define: {
        freezeTableName: true,
        timestamps: true
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

module.exports = db;
