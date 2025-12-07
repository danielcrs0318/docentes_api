const { Sequelize } = require('sequelize');

const db = new Sequelize(
    process.env.DB_NAME || 'docentes_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'root',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
    }
)
<<<<<<< HEAD
module.exports = db;
=======
module.exports = db;
>>>>>>> 42aece52e09d512ed7bfa6f93ac1607f5486b97c
