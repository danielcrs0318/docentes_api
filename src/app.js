require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const db = require('./configuraciones/db');

const app = express();

db.authenticate().then(async (data) => {
    console.log('Base de datos conectada');
}).catch((err) => {
    console.log('Error de conexion: ' + err);
});


// configuramos el puerto
app.set('port', process.env.PORT || 3001);
app.listen(app.get('port'), () => {
  console.log('Servidor corriendo en el puerto ' + app.get('port'));
});