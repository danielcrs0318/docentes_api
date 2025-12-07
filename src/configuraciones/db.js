const { Sequelize } = require('sequelize');

const db = new Sequelize(
    process.env.supabaseUrl,
    {
        dialect: 'postgres', 
        logging: false,
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
