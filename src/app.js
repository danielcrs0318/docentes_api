require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const db = require('./configuraciones/db');

// importamos los modelos
const modeloParciales = require('./modelos/Parciales');
const modeloPeriodos = require('./modelos/Periodos');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

db.authenticate().then(async (data) => {
  console.log('Base de datos conectada');

  // Definir las relaciones entre los modelos
  modeloPeriodos.hasMany(modeloParciales, {
    foreignKey: 'periodoId',
    as: 'parciales'
  });

  modeloParciales.belongsTo(modeloPeriodos, {
    foreignKey: 'periodoId',
    as: 'periodo'
  });
  await modeloParciales.sync().then((data) => {
    console.log("Tabla Parciales creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });
    await modeloPeriodos.sync().then((data) => {
    console.log("Tabla Periodos creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

}).catch((err) => {
  console.log('Error de conexion: ' + err);
});

//rutas
app.use('/api/parciales', require('./rutas/rutaParciales'));
app.use('/api/periodos', require('./rutas/rutaPeriodos'));

// configuramos el puerto
app.set('port', process.env.PORT || 3001);
app.listen(app.get('port'), () => {
  console.log('Servidor corriendo en el puerto ' + app.get('port'));
});