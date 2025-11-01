require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const db = require('./configuraciones/db');

// importamos los modelos
const modeloParciales = require('./modelos/Parciales');
const modeloPeriodos = require('./modelos/Periodos');
const modeloAulas = require('./modelos/Aulas');
const modeloClases = require('./modelos/Clases');
const modeloSecciones = require('./modelos/Secciones');
const modeloEstudiantes = require('./modelos/Estudiantes');
const modeloDocentes = require('./modelos/Docentes');
const Proyectos = require('./modelos/Proyectos');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./configuraciones/swagger');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

db.authenticate().then(async (data) => {
  console.log('Base de datos conectada');

  // Definir las relaciones entre los modelos
  modeloPeriodos.hasMany(modeloParciales, { foreignKey: 'periodoId', as: 'parciales' });
  modeloParciales.belongsTo(modeloPeriodos, { foreignKey: 'periodoId', as: 'periodo' });
  // Aulas - Secciones
  modeloAulas.hasMany(modeloSecciones, { foreignKey: 'aulaId', as: 'secciones' });
  modeloSecciones.belongsTo(modeloAulas, { foreignKey: 'aulaId', as: 'aula' });

  // Clases - Secciones
  modeloClases.hasMany(modeloSecciones, { foreignKey: 'claseId', as: 'secciones' });
  modeloSecciones.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  // Secciones - Estudiantes
  modeloSecciones.hasMany(modeloEstudiantes, { foreignKey: 'seccionId', as: 'estudiantes' });
  modeloEstudiantes.belongsTo(modeloSecciones, { foreignKey: 'seccionId', as: 'seccion' });

  // Clases - Estudiantes
  modeloClases.hasMany(modeloEstudiantes, { foreignKey: 'claseId', as: 'estudiantes' });
  modeloEstudiantes.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  // Proyectos - Estudiantes (relación directa uno-a-muchos)
  modeloProyectos.hasMany(modeloEstudiantes, { foreignKey: 'proyectoId', as: 'estudiantes' });
  modeloEstudiantes.belongsTo(modeloProyectos, { foreignKey: 'proyectoId', as: 'proyecto' });

  // Docentes - Clases (definimos asociación; si la columna docenteId no existe en la DB
  // podría requerir una migración o sincronización con alter)
  modeloDocentes.hasMany(modeloClases, { foreignKey: 'docenteId', as: 'clases' });
  modeloClases.belongsTo(modeloDocentes, { foreignKey: 'docenteId', as: 'docente' });

  await modeloPeriodos.sync().then((data) => {
    console.log("Tabla Periodos creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloAulas.sync().then((data) => {
    console.log("Tabla Aulas creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  // Sincronizar primero Docentes antes de Clases porque Clases tiene FK -> Docentes
  await modeloDocentes.sync().then((data) => {
    console.log("Tabla Docentes creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloClases.sync({ alter: true }).then((data) => {
    console.log("Tabla Clases sincronizada (alter:true) con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloSecciones.sync().then((data) => {
    console.log("Tabla Secciones creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloParciales.sync().then((data) => {
    console.log("Tabla Parciales creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloEstudiantes.sync().then((data) => {
    console.log("Tabla Estudiantes creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  // Sincronizar tablas relacionadas con proyectos
  await Proyectos.sync({ alter: true }).then((data) => {
    console.log("Tabla Proyectos sincronizada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });
  
  await modeloDocentes.sync().then((data) => {
    console.log("Tabla Docentes creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

}).catch((err) => {
  console.log('Error de conexion: ' + err);
});

//rutas
app.use('/api/parciales', require('./rutas/rutaParciales'));
app.use('/api/periodos', require('./rutas/rutaPeriodos'));
app.use('/api/aulas', require('./rutas/rutaAulas'));
app.use('/api/clases', require('./rutas/rutaClases'));
app.use('/api/secciones', require('./rutas/rutaSecciones'));
app.use('/api/estudiantes', require('./rutas/rutaEstudiantes'));
app.use('/api/docentes', require('./rutas/rutaDocentes'));
app.use('/api/proyectos', require('./rutas/rutaProyectos'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoint para obtener el JSON de Swagger
app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// configuramos el puerto
app.set('port', process.env.PORT || 3001);
app.listen(app.get('port'), () => {
  console.log('Servidor corriendo en el puerto ' + app.get('port'));
});