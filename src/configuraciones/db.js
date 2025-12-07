const { Sequelize } = require('sequelize');

const db = new Sequelize(
    process.env.DATABASE_URL || process.env.supabaseUrl,
    {
        dialect: 'postgres', 
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
        }
    }
)
module.exports = db;
