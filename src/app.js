require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const db = require('./configuraciones/db');

//Este comentario es de prueba para git

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
const modeloUsuarios = require('./modelos/Usuarios');
const modeloUsuarioImagenes = require('./modelos/UsuarioImagenes');
const modeloAsistenciaImagenes = require('./modelos/AsistenciaImagenes');
const modeloProyectos = require('./modelos/Proyectos');
const ProyectoEstudiantes = require('./modelos/ProyectoEstudiantes');
const modeloGrupos = require('./modelos/Grupos');
const GrupoEstudiantes = require('./modelos/GrupoEstudiantes');
const modeloRoles = require('./modelos/Roles');
const modeloLogsAuditoria = require('./modelos/LogsAuditoria');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./configuraciones/swagger');
const path = require('path');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Servir archivos estáticos desde la carpeta public
app.use('/img', express.static(path.join(__dirname, '../public/img')));

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

  modeloSecciones.hasMany(modeloEvaluaciones, { foreignKey: 'seccionId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloSecciones, { foreignKey: 'seccionId', as: 'seccion' });

  modeloParciales.hasMany(modeloEvaluaciones, { foreignKey: 'parcialId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloParciales, { foreignKey: 'parcialId', as: 'parcial' });

  modeloPeriodos.hasMany(modeloEvaluaciones, { foreignKey: 'periodoId', as: 'evaluaciones' });
  modeloEvaluaciones.belongsTo(modeloPeriodos, { foreignKey: 'periodoId', as: 'periodo' });

  modeloEvaluaciones.hasMany(modeloEvaluacionesEstudiantes, { foreignKey: 'evaluacionId', as: 'asignaciones' });
  modeloEvaluacionesEstudiantes.belongsTo(modeloEvaluaciones, { foreignKey: 'evaluacionId', as: 'evaluacion' });

  modeloEstudiantes.hasMany(modeloEvaluacionesEstudiantes, { foreignKey: 'estudianteId', as: 'evaluacionesEstudiantiles' });
  modeloEvaluacionesEstudiantes.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });

  // Asistencias - Relaciones
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

  // Asistencias - AsistenciaImagenes (relación uno a muchos)
  modeloAsistencias.hasMany(modeloAsistenciaImagenes, { foreignKey: 'asistenciaId', as: 'imagenes' });
  modeloAsistenciaImagenes.belongsTo(modeloAsistencias, { foreignKey: 'asistenciaId', as: 'asistencia' });

  // Proyectos - Estudiantes (CORREGIDO: relación muchos a muchos)
  modeloProyectos.belongsToMany(modeloEstudiantes, {
    through: ProyectoEstudiantes,
    foreignKey: 'proyectoId',
    otherKey: 'estudianteId',
    as: 'estudiantes'
  });

  modeloEstudiantes.belongsToMany(modeloProyectos, {
    through: ProyectoEstudiantes,
    foreignKey: 'estudianteId',
    otherKey: 'proyectoId',
    as: 'proyectos'
  });

  // Proyectos - Clases
  modeloClases.hasMany(modeloProyectos, { foreignKey: 'claseId', as: 'proyectos' });
  modeloProyectos.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  // Grupos - Clases
  modeloClases.hasMany(modeloGrupos, { foreignKey: 'claseId', as: 'grupos' });
  modeloGrupos.belongsTo(modeloClases, { foreignKey: 'claseId', as: 'clase' });

  // Grupos - Proyectos
  modeloProyectos.hasOne(modeloGrupos, { foreignKey: 'proyectoId', as: 'grupo' });
  modeloGrupos.belongsTo(modeloProyectos, { foreignKey: 'proyectoId', as: 'proyecto' });

  // Grupos - Estudiantes (muchos a muchos)
  modeloGrupos.belongsToMany(modeloEstudiantes, {
    through: GrupoEstudiantes,
    foreignKey: 'grupoId',
    otherKey: 'estudianteId',
    as: 'estudiantes'
  });

  modeloEstudiantes.belongsToMany(modeloGrupos, {
    through: GrupoEstudiantes,
    foreignKey: 'estudianteId',
    otherKey: 'grupoId',
    as: 'grupos'
  });

  // Docentes - Clases (definimos asociación)
  modeloDocentes.hasMany(modeloClases, { foreignKey: 'docenteId', as: 'clases' });
  modeloClases.belongsTo(modeloDocentes, { foreignKey: 'docenteId', as: 'docente' });

  // Relaciones de Roles con Usuarios
  modeloRoles.hasMany(modeloUsuarios, { foreignKey: 'rolId', as: 'usuarios' });
  modeloUsuarios.belongsTo(modeloRoles, { foreignKey: 'rolId', as: 'rol' });

  // Relaciones de Usuarios con Docentes y Estudiantes
  modeloDocentes.hasMany(modeloUsuarios, { foreignKey: 'docenteId', as: 'usuarios' });
  modeloUsuarios.belongsTo(modeloDocentes, { foreignKey: 'docenteId', as: 'docente' });

  modeloEstudiantes.hasMany(modeloUsuarios, { foreignKey: 'estudianteId', as: 'usuarios' });
  modeloUsuarios.belongsTo(modeloEstudiantes, { foreignKey: 'estudianteId', as: 'estudiante' });

  // Relaciones de Usuario e Imágenes
  modeloUsuarios.hasMany(modeloUsuarioImagenes, { foreignKey: 'usuarioId', as: 'imagenes' });
  modeloUsuarioImagenes.belongsTo(modeloUsuarios, { foreignKey: 'usuarioId', as: 'usuario' });

  // Sincronizar modelos con la base de datos (orden respetando FKs)
  
  // 1. Sincronizar Roles primero (no tiene dependencias)
  await modeloRoles.sync({ alter: true }).then((data) => {
    console.log("Tabla Roles sincronizada (alter:true) exitosamente");
  }).catch((err) => {
    console.error(err);
  });

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

  await modeloClases.sync().then((data) => {
    console.log("Tabla Clases creada con un Modelo exitosamente");
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

  await modeloEstudiantes.sync().then((data) => {
    console.log("Tabla Estudiantes creada con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  // Sincronizar Proyectos antes de ProyectoEstudiantes (FK dependency)
  await modeloProyectos.sync({ alter: true }).then((data) => {
    console.log("Tabla Proyectos sincronizada (alter:true) con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  // Sincronizar ProyectoEstudiantes (tabla intermedia)
  await ProyectoEstudiantes.sync({ alter: true }).then((data) => {
    console.log("Tabla ProyectoEstudiantes sincronizada (alter:true) - Relación muchos a muchos creada");
  }).catch((err) => {
    console.error(err);
  });

  // Sincronizar Grupos (depende de Clases y Proyectos)
  await modeloGrupos.sync({ alter: true }).then((data) => {
    console.log("Tabla Grupos sincronizada (alter:true) exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  // Sincronizar GrupoEstudiantes (tabla intermedia - depende de Grupos y Estudiantes)
  await GrupoEstudiantes.sync({ alter: true }).then((data) => {
    console.log("Tabla GrupoEstudiantes sincronizada (alter:true) - Relación muchos a muchos creada");
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

  await modeloUsuarios.sync({ alter: true }).then((data) => {
    console.log("Tabla Usuarios sincronizada (alter:true) con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloUsuarioImagenes.sync({ alter: true }).then((data) => {
    console.log("Tabla UsuarioImagenes sincronizada (alter:true) con un Modelo exitosamente");
  }).catch((err) => {
    console.error(err);
  });

  await modeloLogsAuditoria.sync({ alter: true }).then((data) => {
    console.log("Tabla LogsAuditoria sincronizada (alter:true) con un Modelo exitosamente");
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
  app.use('/api/proyectos', require('./rutas/rutaProyectos'));
  app.use('/api/grupos', require('./rutas/rutaGrupos'));
  app.use('/api/evaluaciones', require('./rutas/rutaEvaluaciones'));
  app.use('/api/asistencias', require('./rutas/rutaAsistencias'));
  app.use('/api/usuarios', require('./rutas/rutaUsuarios'));
  app.use('/api/analisis', require('./rutas/rutaAnalisis'));
  app.use('/api/auditoria', require('./rutas/rutaAuditoria'));
  app.use('/api/notificaciones', require('./rutas/rutaNotificaciones'));

  // Documentación Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Endpoint para obtener el JSON de Swagger
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // configuramos el puerto
  app.set('port', process.env.PORT || 3002);
  app.listen(app.get('port'), () => {
    console.log('Servidor corriendo en el puerto ' + app.get('port'));
  });
}

module.exports = app;
