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
const modeloEvaluaciones = require('./modelos/Evaluaciones');
const modeloEvaluacionesEstudiantes = require('./modelos/EvaluacionesEstudiantes');

const modeloEstudiantesClases = require('./modelos/EstudiantesClases');

const modeloAsistencias = require('./modelos/Asistencia');

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

  // Relaciones con tabla intermedia EstudiantesClases
  // EstudiantesClases pertenece a Estudiantes
  modeloEstudiantesClases.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });
  modeloEstudiantes.hasMany(modeloEstudiantesClases, { foreignKey: 'estudianteId', as: 'inscripciones' });

  // EstudiantesClases pertenece a Clases
  modeloEstudiantesClases.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });
  modeloClases.hasMany(modeloEstudiantesClases, { foreignKey: 'claseId', as: 'inscripciones' });

  // EstudiantesClases pertenece a Secciones
  modeloEstudiantesClases.belongsTo(modeloSecciones, { foreignKey: 'seccionId', as: 'seccion' });
  modeloSecciones.hasMany(modeloEstudiantesClases, { foreignKey: 'seccionId', as: 'inscripciones' });

  // Evaluaciones - asociaciones
  modeloClases.hasMany(modeloEvaluaciones, { foreignKey: 'claseId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  modeloParciales.hasMany(modeloEvaluaciones, { foreignKey: 'parcialId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloParciales, { foreignKey: 'parcialId', as: 'parcial' });

  modeloPeriodos.hasMany(modeloEvaluaciones, { foreignKey: 'periodoId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloPeriodos, { foreignKey: 'periodoId', as: 'periodo' });

  modeloEvaluaciones.hasMany(modeloEvaluacionesEstudiantes, { foreignKey: 'evaluacionId', as: 'asignaciones' });
  modeloEvaluacionesEstudiantes.belongsTo(modeloEvaluaciones, { foreignKey: 'evaluacionId', as: 'evaluacion' });

  modeloEstudiantes.hasMany(modeloEvaluacionesEstudiantes, { foreignKey: 'estudianteId', as: 'evaluacionesEstudiantiles' });
  modeloEvaluacionesEstudiantes.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });


  modeloAsistencias.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });
  modeloEstudiantes.hasMany(modeloAsistencias, { foreignKey: 'estudianteId', as: 'asistencias' });

  // Clases - Asistencias
  modeloClases.hasMany(modeloAsistencias, { foreignKey: 'claseId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  // periodos - Asistencias
  modeloPeriodos.hasMany(modeloAsistencias, { foreignKey: 'periodoId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloPeriodos, { foreignKey: 'periodoId', as: 'periodo' });
  // parciales - Asistencias
  modeloParciales.hasMany(modeloAsistencias, { foreignKey: 'parcialId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloParciales, { foreignKey: 'parcialId', as: 'parcial' });

  // Docentes - Clases (definimos asociación; si la columna docenteId no existe en la DB
  // podría requerir una migración o sincronización con alter)

  modeloDocentes.hasMany(modeloClases, { foreignKey: 'docenteId', as: 'clases' });
  modeloClases.belongsTo(modeloDocentes, { foreignKey: 'docenteId', as: 'docente' });

  await modeloPeriodos.sync({ alter: true }).then((data) => {
    console.log("Tabla Periodos sincronizada (alter:true) con un Modelo exitosamente");
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

  await modeloSecciones.sync({ alter: true }).then((data) => {
    console.log("Tabla Secciones sincronizada (alter:true) con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloParciales.sync().then((data) => {
    console.log("Tabla Parciales creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloEstudiantes.sync({ alter: true }).then((data) => {
    console.log("Tabla Estudiantes sincronizada (alter:true) con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloEstudiantesClases.sync({ alter: true }).then((data) => {
    console.log("Tabla EstudiantesClases RECREADA (alter:true) - ÍNDICES CORREGIDOS");
  }).catch((err) => {
    console.error(err);
  });

  await modeloEvaluaciones.sync({ alter: true }).then((data) => {
    console.log("Tabla Evaluaciones sincronizada");
  }).catch((err) => { console.error(err); });

  await modeloEvaluacionesEstudiantes.sync({ alter: true }).then((data) => {
    console.log("Tabla EvaluacionesEstudiantes sincronizada");
  }).catch((err) => { console.error(err); });

  await modeloAsistencias.sync({ alter: true }).then((data) => {
    console.log("Tabla Asistencias sincronizada");
  }).catch((err) => {
    console.error(err);
  });

  // Montar rutas e iniciar servidor ahora que los modelos y asociaciones están listos
  mountServerAndRoutes();


}).catch((err) => {
  console.log('Error de conexion: ' + err);
});
// Las rutas y servidor se montan después de establecer conexión y sincronizar modelos
function mountServerAndRoutes() {
  // rutas
  app.use('/api/parciales', require('./rutas/rutaParciales'));
  app.use('/api/periodos', require('./rutas/rutaPeriodos'));
  app.use('/api/aulas', require('./rutas/rutaAulas'));
  app.use('/api/clases', require('./rutas/rutaClases'));
  app.use('/api/secciones', require('./rutas/rutaSecciones'));
  app.use('/api/estudiantes', require('./rutas/rutaEstudiantes'));
  app.use('/api/docentes', require('./rutas/rutaDocentes'));
  app.use('/api/evaluaciones', require('./rutas/rutaEvaluaciones'));
  app.use('/api/asistencias', require('./rutas/rutaAsistencias'));
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
};

// Intentar montar servidor tras la conexión a la DB: si la conexión ya sucedió,
// db.authenticate() habría llamado el .then y sincronizado; sin embargo, para
// asegurar idempotencia también intentamos montar aquí si aún no se ha montado.
// Llamamos a mountServerAndRoutes al final del flujo de sincronización anterior.