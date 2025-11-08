require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const db = require('./configuraciones/db');

// modelos básicos
const modeloParciales = require('./modelos/Parciales');
const modeloPeriodos = require('./modelos/Periodos');
const modeloAulas = require('./modelos/Aulas');
const modeloClases = require('./modelos/Clases');
const modeloSecciones = require('./modelos/Secciones');
const modeloEstudiantes = require('./modelos/Estudiantes');
const modeloDocentes = require('./modelos/Docentes');

// modelos añadidos por ambas ramas
const modeloEstudiantesClases = require('./modelos/EstudiantesClases');
const Proyectos = require('./modelos/Proyectos');
const ProyectoEstudiantes = require('./modelos/ProyectoEstudiantes');
const modeloEvaluaciones = require('./modelos/Evaluaciones');
const modeloEvaluacionesEstudiantes = require('./modelos/EvaluacionesEstudiantes');
const modeloAsistencias = require('./modelos/Asistencia');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./configuraciones/swagger');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Helper: montar rutas y arrancar servidor (se usa al final)
function mountServerAndRoutes() {
  // rutas
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
}


db.authenticate().then(async () => {
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

  // Relaciones con tabla intermedia EstudiantesClases (many-to-many custom)
  modeloEstudiantesClases.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });
  modeloEstudiantes.hasMany(modeloEstudiantesClases, { foreignKey: 'estudianteId', as: 'inscripciones' });

  modeloEstudiantesClases.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });
  modeloClases.hasMany(modeloEstudiantesClases, { foreignKey: 'claseId', as: 'inscripciones' });

  modeloEstudiantesClases.belongsTo(modeloSecciones, { foreignKey: 'seccionId', as: 'seccion' });
  modeloSecciones.hasMany(modeloEstudiantesClases, { foreignKey: 'seccionId', as: 'inscripciones' });

  // Estudiantes - Evaluaciones (vinculación de evaluaciones a estudiantes)
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

  // Asistencias
  modeloAsistencias.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });
  modeloEstudiantes.hasMany(modeloAsistencias, { foreignKey: 'estudianteId', as: 'asistencias' });

  modeloClases.hasMany(modeloAsistencias, { foreignKey: 'claseId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  modeloPeriodos.hasMany(modeloAsistencias, { foreignKey: 'periodoId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloPeriodos, { foreignKey: 'periodoId', as: 'periodo' });

  modeloParciales.hasMany(modeloAsistencias, { foreignKey: 'parcialId', as: 'asistencias' });
  modeloAsistencias.belongsTo(modeloParciales, { foreignKey: 'parcialId', as: 'parcial' });

  // Proyectos - Estudiantes (versión Padilla)
  Proyectos.hasMany(modeloEstudiantes, { foreignKey: 'proyectoId', as: 'estudiantes' });
  modeloEstudiantes.belongsTo(Proyectos, { foreignKey: 'proyectoId', as: 'proyecto' });

  // Docentes - Clases
  modeloDocentes.hasMany(modeloClases, { foreignKey: 'docenteId', as: 'clases' });
  modeloClases.belongsTo(modeloDocentes, { foreignKey: 'docenteId', as: 'docente' });

  // Sincronizaciones (orden pensado para respetar FKs)
  await modeloPeriodos.sync({ alter: true }).catch(err => console.error(err));
  await modeloAulas.sync().catch(err => console.error(err));
  await modeloDocentes.sync().catch(err => console.error(err));
  await modeloClases.sync({ alter: true }).catch(err => console.error(err));
  await modeloSecciones.sync({ alter: true }).catch(err => console.error(err));
  await modeloParciales.sync().catch(err => console.error(err));
  await modeloEstudiantes.sync({ alter: true }).catch(err => console.error(err));

  // EstudiantesClases: recrear/alter para asegurar índices correctos
  await modeloEstudiantesClases.sync({ alter: true }).catch(err => console.error(err));

  // Proyectos y tabla intermedia (si procede)
  await Proyectos.sync({ alter: true }).catch(err => console.error(err));
  // ProyectoEstudiantes.sync queda comentada hasta decidir política de indices
  // await ProyectoEstudiantes.sync({ alter: true }).catch(err => console.error(err));

  await modeloEvaluaciones.sync({ alter: true }).catch(err => console.error(err));
  await modeloEvaluacionesEstudiantes.sync({ alter: true }).catch(err => console.error(err));
  await modeloAsistencias.sync({ alter: true }).catch(err => console.error(err));

  // Montar rutas e iniciar servidor
  mountServerAndRoutes();

}).catch((err) => {
  console.log('Error de conexion: ' + err);
});

module.exports = app;
