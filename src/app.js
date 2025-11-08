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
const modeloUsuarios = require('./modelos/Usuarios');
const modeloUsuarioImagenes = require('./modelos/UsuarioImagenes');
const modeloEstudiantesClases = require('./modelos/EstudiantesClases');
const modeloEvaluaciones = require('./modelos/Evaluaciones');
const modeloEvaluacionesEstudiantes = require('./modelos/EvaluacionesEstudiantes');
const modeloAsistencias = require('./modelos/Asistencia');
const modeloProyectos = require('./modelos/Proyectos');
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
  modeloEstudiantesClases.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });
  modeloEstudiantes.hasMany(modeloEstudiantesClases, { foreignKey: 'estudianteId', as: 'inscripciones' });

  modeloEstudiantesClases.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });
  modeloClases.hasMany(modeloEstudiantesClases, { foreignKey: 'claseId', as: 'inscripciones' });

  modeloEstudiantesClases.belongsTo(modeloSecciones, { foreignKey: 'seccionId', as: 'seccion' });
  modeloSecciones.hasMany(modeloEstudiantesClases, { foreignKey: 'seccionId', as: 'inscripciones' });

  // Evaluaciones - asociaciones
  modeloClases.hasMany(modeloEvaluaciones, { foreignKey: 'claseId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  modeloParciales.hasMany(modeloEvaluaciones, { foreignKey: 'parcialId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloParciales, { foreignKey: 'parcialId', as: 'parcial' });

  modeloPeriodos.hasMany(modeloEvaluaciones, { foreignKey: 'periodoId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloPeriodos, { foreignKey: 'periodoId', as: 'periodo' });

  // Evaluaciones - Estudiantes
  modeloEvaluaciones.hasMany(modeloEvaluacionesEstudiantes, { foreignKey: 'evaluacionId', as: 'asignaciones' });
  modeloEvaluacionesEstudiantes.belongsTo(modeloEvaluaciones, { foreignKey: 'evaluacionId', as: 'evaluacion' });

  modeloEstudiantes.hasMany(modeloEvaluacionesEstudiantes, { foreignKey: 'estudianteId', as: 'evaluacionesEstudiantiles' });
  modeloEvaluacionesEstudiantes.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });

  // Asistencias - Relaciones
  modeloAsistencias.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });
  modeloEstudiantes.hasMany(modeloAsistencias, { foreignKey: 'estudianteId', as: 'asistencias' });

  modeloClases.hasMany(modeloAsistencias, { foreignKey: 'claseId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  modeloPeriodos.hasMany(modeloAsistencias, { foreignKey: 'periodoId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloPeriodos, { foreignKey: 'periodoId', as: 'periodo' });

  modeloParciales.hasMany(modeloAsistencias, { foreignKey: 'parcialId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloParciales, { foreignKey: 'parcialId', as: 'parcial' });

  // Proyectos - Estudiantes
  modeloProyectos.hasMany(modeloEstudiantes, { foreignKey: 'proyectoId', as: 'estudiantes' });
  modeloEstudiantes.belongsTo(modeloProyectos, { foreignKey: 'proyectoId', as: 'proyecto' });

  // Docentes - Clases
  modeloDocentes.hasMany(modeloClases, { foreignKey: 'docenteId', as: 'clasesAsignadas' });
  modeloClases.belongsTo(modeloDocentes, { foreignKey: 'docenteId', as: 'docente' });

  // Usuarios - Imágenes
  modeloUsuarios.hasMany(modeloUsuarioImagenes, { foreignKey: 'usuarioId', as: 'imagenes' });
  modeloUsuarioImagenes.belongsTo(modeloUsuarios, { foreignKey: 'usuarioId', as: 'usuario' });

  // Secciones - Estudiantes
  modeloSecciones.hasMany(modeloEstudiantes, { foreignKey: 'seccionId', as: 'estudiantes' });
  modeloEstudiantes.belongsTo(modeloSecciones, { foreignKey: 'seccionId', as: 'seccion' });

  // Clases - Estudiantes
  modeloClases.hasMany(modeloEstudiantes, { foreignKey: 'claseId', as: 'estudiantes' });
  modeloEstudiantes.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  // Relaciones de Usuario e Imágenes
  modeloUsuarios.hasMany(modeloUsuarioImagenes, { foreignKey: 'usuarioId', as: 'imagenes' });
  modeloUsuarioImagenes.belongsTo(modeloUsuarios, { foreignKey: 'usuarioId', as: 'usuario' });

  // Sincronizar modelos con la base de datos
  await modeloPeriodos.sync({ alter: true });
  await modeloAulas.sync();
  await modeloDocentes.sync();
  await modeloClases.sync({ alter: true });
  await modeloSecciones.sync({ alter: true });
  await modeloParciales.sync();
  await modeloEstudiantes.sync({ alter: true });
  await modeloEstudiantesClases.sync({ alter: true });
  await modeloEvaluaciones.sync({ alter: true });
  await modeloEvaluacionesEstudiantes.sync({ alter: true });
  await modeloAsistencias.sync({ alter: true });
  await modeloUsuarios.sync({ alter: true });
  await modeloUsuarioImagenes.sync({ alter: true });
  await modeloProyectos.sync({ alter: true });

  // Configurar rutas
  app.use('/api/parciales', require('./rutas/rutaParciales'));
  app.use('/api/periodos', require('./rutas/rutaPeriodos'));
  app.use('/api/aulas', require('./rutas/rutaAulas'));
  app.use('/api/clases', require('./rutas/rutaClases'));
  app.use('/api/secciones', require('./rutas/rutaSecciones'));
  app.use('/api/estudiantes', require('./rutas/rutaEstudiantes'));
  app.use('/api/docentes', require('./rutas/rutaDocentes'));
  app.use('/api/proyectos', require('./rutas/rutaProyectos'));
  app.use('/api/evaluaciones', require('./rutas/rutaEvaluaciones'));
  app.use('/api/asistencias', require('./rutas/rutaAsistencias'));
  app.use('/api/usuarios', require('./rutas/rutaUsuarios'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Endpoint para obtener el JSON de Swagger
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Configurar y iniciar el servidor
  app.set('port', process.env.PORT || 3001);
  app.listen(app.get('port'), () => {
    console.log('Servidor corriendo en el puerto ' + app.get('port'));
  });

}).catch((err) => {
  console.log('Error de conexion: ' + err);
});

// Intentar montar servidor tras la conexión a la DB: si la conexión ya sucedió,
// db.authenticate() habría llamado el .then y sincronizado; sin embargo, para
// asegurar idempotencia también intentamos montar aquí si aún no se ha montado.
// Llamamos a mountServerAndRoutes al final del flujo de sincronización anterior.