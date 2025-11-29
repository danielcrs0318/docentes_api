# 🔐 SISTEMA DE ROLES Y AUTORIZACIÓN - Documentación Completa

## 📋 ÍNDICE
1. [Descripción General](#descripción-general)
2. [Roles del Sistema](#roles-del-sistema)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Middlewares de Autorización](#middlewares-de-autorización)
5. [Sistema de Login con Roles](#sistema-de-login-con-roles)
6. [Asignación Automática de Roles](#asignación-automática-de-roles)
7. [Protección de Rutas](#protección-de-rutas)
8. [Guía de Implementación](#guía-de-implementación)

---

## 🎯 DESCRIPCIÓN GENERAL

El sistema de roles controla el acceso a los diferentes módulos de la API según el tipo de usuario.

### **Principios**:
- ✅ **Control granular**: Cada endpoint define qué roles pueden acceder
- ✅ **Aislamiento de datos**: Los usuarios solo ven sus propios datos
- ✅ **Asignación automática**: El rol se asigna según el tipo de usuario (docente/estudiante)
- ✅ **Seguridad en JWT**: El rol se incluye en el token de autenticación

---

## 👥 ROLES DEL SISTEMA

### 1️⃣ **ADMIN** (Administrador)
**Permisos**: Acceso TOTAL al sistema

**Puede acceder a**:
- ✅ Todos los módulos CRUD (periodos, parciales, aulas, clases, secciones, etc.)
- ✅ Gestión de usuarios (crear, editar, eliminar)
- ✅ Ver datos de cualquier docente o estudiante
- ✅ Todos los reportes y análisis

**No puede**:
- ❌ Ninguna restricción

---

### 2️⃣ **DOCENTE** (Profesor)
**Permisos**: Gestión académica completa

**Puede acceder a**:
- ✅ Evaluaciones (crear, editar, eliminar, asignar calificaciones)
- ✅ Secciones (gestionar secciones de sus clases)
- ✅ Estudiantes (ver, inscribir, gestionar)
- ✅ Clases (ver sus clases)
- ✅ Periodos y Parciales (consultar)
- ✅ Aulas (consultar)
- ✅ Asistencias (registrar, editar)
- ✅ Proyectos (crear, asignar, evaluar)
- ✅ Análisis (solo de sus propias clases)
- ✅ **Su propia contraseña e imagen de perfil**

**No puede**:
- ❌ Gestión de usuarios (CRUD de cuentas)
- ❌ Ver datos de otros docentes
- ❌ Acceder a clases que no le pertenecen

---

### 3️⃣ **ESTUDIANTE** (Alumno)
**Permisos**: Solo lectura de sus propios datos

**Puede acceder a**:
- ✅ **Sus propias evaluaciones** (ver calificaciones)
- ✅ **Sus propias asistencias** (ver registro)
- ✅ **Su reporte personal** (`/analisis/reporte/estudiante`)
- ✅ **Su propia contraseña e imagen de perfil**

**No puede**:
- ❌ Ver evaluaciones o asistencias de otros estudiantes
- ❌ Ver información de docentes
- ❌ Acceder a gestión de clases, periodos, proyectos
- ❌ Modificar ningún dato académico

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### **Tabla: Roles**
```sql
CREATE TABLE Roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre ENUM('ADMIN', 'DOCENTE', 'ESTUDIANTE') NOT NULL UNIQUE,
  descripcion VARCHAR(200),
  createdAt DATETIME,
  updatedAt DATETIME
);
```

**Registros iniciales**:
| id | nombre | descripcion |
|----|--------|-------------|
| 1 | ADMIN | Administrador del sistema con acceso total... |
| 2 | DOCENTE | Profesor con acceso a gestión académica... |
| 3 | ESTUDIANTE | Alumno con acceso de solo lectura... |

---

### **Tabla: Usuarios (Modificada)**
```sql
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  login VARCHAR(50) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  contrasena VARCHAR(250) NOT NULL,
  estado ENUM('AC', 'IN', 'BL') DEFAULT 'AC',
  
  -- NUEVOS CAMPOS
  rolId INT,                    -- FK a Roles
  docenteId INT,                -- FK a Docentes (si es docente)
  estudianteId INT,             -- FK a Estudiantes (si es estudiante)
  
  pin VARCHAR(6),
  pinExpiracion DATETIME,
  intentos INT DEFAULT 0,
  createdAt DATETIME,
  updatedAt DATETIME,
  
  FOREIGN KEY (rolId) REFERENCES Roles(id),
  FOREIGN KEY (docenteId) REFERENCES Docentes(id),
  FOREIGN KEY (estudianteId) REFERENCES Estudiantes(id)
);
```

**Relaciones**:
- `Roles` (1) → (N) `Usuarios`
- `Docentes` (1) → (N) `Usuarios`
- `Estudiantes` (1) → (N) `Usuarios`

---

## 🛡️ MIDDLEWARES DE AUTORIZACIÓN

Se creó el archivo `src/configuraciones/autorizacion.js` con 3 middlewares:

### 1. **verificarRol(rolesPermitidos)**

**Propósito**: Valida que el usuario tenga uno de los roles permitidos.

**Parámetros**:
- `rolesPermitidos`: Array de strings con los roles que pueden acceder

**Uso**:
```javascript
const { verificarRol } = require('../configuraciones/autorizacion');

// Solo ADMIN y DOCENTE pueden acceder
rutas.get('/listar', 
  validarToken, 
  verificarRol(['ADMIN', 'DOCENTE']), 
  controlador.listar
);
```

**Flujo**:
1. Verifica que `req.usuario` exista (viene de `validarToken`)
2. Verifica que `req.usuario.rol` esté definido
3. Compara el rol con los roles permitidos
4. Si coincide → `next()` (continúa)
5. Si no coincide → `403 Forbidden`

**Ejemplo de error**:
```json
{
  "error": "Acceso denegado",
  "mensaje": "Esta acción requiere uno de los siguientes roles: ADMIN, DOCENTE",
  "tuRol": "ESTUDIANTE"
}
```

---

### 2. **soloMisDatos(tipoDato, paramName)**

**Propósito**: Valida que un usuario solo pueda acceder a sus propios datos.

**Parámetros**:
- `tipoDato`: `'docente'` o `'estudiante'`
- `paramName`: Nombre del parámetro en query/body (ej: `'docenteId'`, `'estudianteId'`)

**Uso**:
```javascript
const { soloMisDatos } = require('../configuraciones/autorizacion');

// Endpoint: /analisis/reporte/docente?docenteId=3
rutas.get('/reporte/docente', 
  validarToken, 
  verificarRol(['ADMIN', 'DOCENTE']),
  soloMisDatos('docente', 'docenteId'),  // Valida que sea su propio docenteId
  controlador.reporteDocente
);
```

**Flujo**:
1. Si el usuario es **ADMIN** → Permite acceso sin restricciones
2. Si el usuario es **DOCENTE**:
   - Extrae el `docenteId` del parámetro
   - Compara con `req.usuario.docenteId`
   - Si coincide → `next()`
   - Si no coincide → `403 Forbidden`
3. Si el usuario es **ESTUDIANTE**:
   - Extrae el `estudianteId` del parámetro
   - Compara con `req.usuario.estudianteId`
   - Si coincide → `next()`
   - Si no coincide → `403 Forbidden`

**Ejemplo de error**:
```json
{
  "error": "Acceso denegado",
  "mensaje": "Solo puedes acceder a tus propios datos",
  "intentaste": "Acceder a docenteId: 5",
  "tuDocenteId": 3
}
```

---

### 3. **soloSuClase(paramName)**

**Propósito**: Valida que un docente solo pueda acceder a información de sus propias clases.

**Parámetros**:
- `paramName`: Nombre del parámetro que contiene el `claseId` (default: `'claseId'`)

**Uso**:
```javascript
const { soloSuClase } = require('../configuraciones/autorizacion');

// Endpoint: /evaluaciones/listar?claseId=5
rutas.get('/listar', 
  validarToken, 
  verificarRol(['ADMIN', 'DOCENTE']),
  soloSuClase('claseId'),  // Valida que la clase le pertenezca
  controlador.listar
);
```

**Flujo**:
1. Si el usuario es **ADMIN** → Permite acceso sin restricciones
2. Si el usuario es **DOCENTE**:
   - Consulta la base de datos para obtener la clase
   - Verifica que `clase.docenteId === req.usuario.docenteId`
   - Si coincide → `next()`
   - Si no coincide → `403 Forbidden`
3. Si el usuario es **ESTUDIANTE** → `403 Forbidden` (no aplica)

**⚠️ Nota**: Este middleware hace una consulta a la BD, úsalo solo cuando sea necesario.

---

## 🔑 SISTEMA DE LOGIN CON ROLES

### **Endpoint: POST /api/usuarios/iniciar-sesion**

**Modificaciones**:
1. Incluye información del `rol` en la consulta
2. Agrega `rol`, `docenteId`, `estudianteId` al **payload del token JWT**
3. Retorna información completa del usuario y su rol

**Request**:
```json
{
  "login": "juan.perez",
  "contrasena": "123456"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 5,
    "login": "juan.perez",
    "correo": "juan.perez@unicah.edu",
    "estado": "AC",
    "rol": {
      "id": 2,
      "nombre": "DOCENTE",
      "descripcion": "Profesor con acceso a gestión académica..."
    },
    "docenteId": 3,
    "estudianteId": null
  }
}
```

**Contenido del Token JWT**:
```javascript
{
  id: 5,
  rol: "DOCENTE",
  docenteId: 3,
  estudianteId: null,
  iat: 1732833600,
  exp: 1732920000
}
```

---

## 🤖 ASIGNACIÓN AUTOMÁTICA DE ROLES

### **Endpoint: POST /api/usuarios/guardar**

**Lógica de asignación**:

#### **Caso 1: Usuario DOCENTE**
```javascript
// Request
{
  "login": "maria.garcia",
  "correo": "maria@unicah.edu",
  "contrasena": "123456",
  "docenteId": 3  // ← Se proporciona docenteId
}

// Resultado:
// - Se valida que el docente exista
// - Se busca el rol con nombre='DOCENTE'
// - Se asigna automáticamente rolId=2
```

#### **Caso 2: Usuario ESTUDIANTE**
```javascript
// Request
{
  "login": "juan.lopez",
  "correo": "juan@unicah.edu",
  "contrasena": "123456",
  "estudianteId": 18  // ← Se proporciona estudianteId
}

// Resultado:
// - Se valida que el estudiante exista
// - Se busca el rol con nombre='ESTUDIANTE'
// - Se asigna automáticamente rolId=3
```

#### **Caso 3: Usuario ADMIN**
```javascript
// Request
{
  "login": "admin",
  "correo": "admin@unicah.edu",
  "contrasena": "123456",
  "rolId": 1  // ← Se especifica manualmente el rol ADMIN
}

// Resultado:
// - No se proporciona docenteId ni estudianteId
// - Se asigna rolId=1 (ADMIN) manualmente
```

**Validaciones**:
- Si no hay `docenteId`, `estudianteId` ni `rolId` → Error 400
- Si el `docenteId` no existe → Error 404
- Si el `estudianteId` no existe → Error 404

---

## 🔒 PROTECCIÓN DE RUTAS

### **Matriz de Permisos**

| Módulo | ADMIN | DOCENTE | ESTUDIANTE |
|--------|-------|---------|------------|
| **Periodos** | ✅ CRUD | ✅ Lectura | ❌ |
| **Parciales** | ✅ CRUD | ✅ Lectura | ❌ |
| **Aulas** | ✅ CRUD | ✅ Lectura | ❌ |
| **Clases** | ✅ CRUD | ✅ Lectura (sus clases) | ❌ |
| **Secciones** | ✅ CRUD | ✅ CRUD | ❌ |
| **Docentes** | ✅ CRUD | ✅ Lectura | ❌ |
| **Estudiantes** | ✅ CRUD | ✅ CRUD | ❌ |
| **Evaluaciones** | ✅ CRUD | ✅ CRUD (sus clases) | ✅ Lectura (solo las suyas) |
| **Asistencias** | ✅ CRUD | ✅ CRUD (sus clases) | ✅ Lectura (solo las suyas) |
| **Proyectos** | ✅ CRUD | ✅ CRUD (sus clases) | ❌ |
| **Análisis** | ✅ Todos | ✅ Solo sus datos | ✅ Solo su reporte |
| **Usuarios** | ✅ CRUD | ❌ CRUD (✅ contraseña/imagen propia) | ❌ CRUD (✅ contraseña/imagen propia) |

---

### **Ejemplo de Protección: Rutas de Usuarios**

```javascript
const { verificarRol } = require('../configuraciones/autorizacion');

// ❌ DOCENTE y ESTUDIANTE NO pueden gestionar usuarios
rutas.get('/listar', 
  validarToken, 
  verificarRol(['ADMIN']),  // Solo ADMIN
  controlador.Listar
);

rutas.post('/guardar', 
  validarToken, 
  verificarRol(['ADMIN']),  // Solo ADMIN
  [...validaciones],
  controlador.insertar
);

// ✅ TODOS pueden cambiar su propia contraseña
rutas.post('/restablecer-contrasena', 
  validarToken,  // No requiere verificarRol
  [...validaciones],
  controlador.restablecerContrasena
);

// ✅ TODOS pueden gestionar su propia imagen
rutas.post('/imagenes', 
  validarToken,  // No requiere verificarRol
  validarImagenUsuario,
  controlador.guardarImagenUsuario
);
```

---

### **Ejemplo de Protección: Rutas de Análisis**

```javascript
const { verificarRol, soloMisDatos } = require('../configuraciones/autorizacion');

// Solo ADMIN y DOCENTE, el docente solo ve sus reportes
rutas.get('/reporte/docente', 
  validarToken,
  verificarRol(['ADMIN', 'DOCENTE']),
  soloMisDatos('docente', 'docenteId'),  // Valida que sea su propio ID
  controlador.ReporteDocente
);

// Solo ADMIN y ESTUDIANTE, el estudiante solo ve su reporte
rutas.get('/reporte/estudiante', 
  validarToken,
  verificarRol(['ADMIN', 'ESTUDIANTE']),
  soloMisDatos('estudiante', 'estudianteId'),  // Valida que sea su propio ID
  controlador.ReporteEstudiante
);
```

---

## 🚀 GUÍA DE IMPLEMENTACIÓN

### **Paso 1: Iniciar el servidor**
```bash
npm run dev
```

### **Paso 2: Crear los roles iniciales**
```bash
node src/scripts/seed-roles.js
```

**Salida esperada**:
```
✅ Conexión a la base de datos establecida
✅ Tabla Roles sincronizada
✅ Rol creado: ADMIN (ID: 1)
✅ Rol creado: DOCENTE (ID: 2)
✅ Rol creado: ESTUDIANTE (ID: 3)
🎉 ¡Roles inicializados correctamente!
```

### **Paso 3: Crear usuarios de prueba**

#### **Usuario ADMIN**:
```bash
POST /api/usuarios/guardar
{
  "login": "admin",
  "correo": "admin@unicah.edu",
  "contrasena": "admin123",
  "rolId": 1
}
```

#### **Usuario DOCENTE**:
```bash
POST /api/usuarios/guardar
{
  "login": "maria.garcia",
  "correo": "maria@unicah.edu",
  "contrasena": "123456",
  "docenteId": 3  // ← Rol DOCENTE se asigna automáticamente
}
```

#### **Usuario ESTUDIANTE**:
```bash
POST /api/usuarios/guardar
{
  "login": "juan.perez",
  "correo": "juan@unicah.edu",
  "contrasena": "123456",
  "estudianteId": 18  // ← Rol ESTUDIANTE se asigna automáticamente
}
```

### **Paso 4: Probar el login**
```bash
POST /api/usuarios/iniciar-sesion
{
  "login": "maria.garcia",
  "contrasena": "123456"
}
```

**Respuesta**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 5,
    "rol": {
      "nombre": "DOCENTE"
    },
    "docenteId": 3
  }
}
```

### **Paso 5: Usar el token con Swagger**
1. Copiar el `token` del response
2. En Swagger, hacer clic en 🔓 **Authorize**
3. Pegar: `Bearer {token}`
4. Ahora los endpoints validarán tu rol automáticamente

---

## 📊 EJEMPLOS DE FLUJOS COMPLETOS

### **Flujo 1: Docente accede a su reporte**

```javascript
// 1. Login
POST /api/usuarios/iniciar-sesion
{ "login": "maria.garcia", "contrasena": "123456" }

// Response: token con { id: 5, rol: "DOCENTE", docenteId: 3 }

// 2. Solicitar su reporte (✅ Permitido)
GET /api/analisis/reporte/docente?docenteId=3
Headers: { Authorization: "Bearer {token}" }

// Middleware verificarRol: ✅ DOCENTE está permitido
// Middleware soloMisDatos: ✅ docenteId=3 coincide con req.usuario.docenteId=3
// Response: 200 OK con su reporte

// 3. Intentar ver reporte de otro docente (❌ Denegado)
GET /api/analisis/reporte/docente?docenteId=5

// Middleware soloMisDatos: ❌ docenteId=5 NO coincide con req.usuario.docenteId=3
// Response: 403 Forbidden
```

---

### **Flujo 2: Estudiante accede a sus evaluaciones**

```javascript
// 1. Login
POST /api/usuarios/iniciar-sesion
{ "login": "juan.perez", "contrasena": "123456" }

// Response: token con { id: 8, rol: "ESTUDIANTE", estudianteId: 18 }

// 2. Ver sus propias evaluaciones (✅ Permitido)
GET /api/evaluaciones/estudiante?estudianteId=18
Headers: { Authorization: "Bearer {token}" }

// Middleware verificarRol: ✅ ESTUDIANTE está permitido
// Middleware soloMisDatos: ✅ estudianteId=18 coincide
// Response: 200 OK

// 3. Intentar crear una evaluación (❌ Denegado)
POST /api/evaluaciones/guardar
{ "nombre": "Examen", "claseId": 5 }

// Middleware verificarRol: ❌ ESTUDIANTE NO está en ['ADMIN', 'DOCENTE']
// Response: 403 Forbidden
```

---

### **Flujo 3: Admin gestiona usuarios**

```javascript
// 1. Login
POST /api/usuarios/iniciar-sesion
{ "login": "admin", "contrasena": "admin123" }

// Response: token con { id: 1, rol: "ADMIN" }

// 2. Listar todos los usuarios (✅ Permitido)
GET /api/usuarios/listar
Headers: { Authorization: "Bearer {token}" }

// Middleware verificarRol: ✅ ADMIN está permitido
// Response: 200 OK con todos los usuarios

// 3. Ver reporte de cualquier docente (✅ Permitido)
GET /api/analisis/reporte/docente?docenteId=5

// Middleware verificarRol: ✅ ADMIN está permitido
// Middleware soloMisDatos: ✅ ADMIN bypassed (acceso total)
// Response: 200 OK
```

---

## 🎓 RESUMEN PARA EL FRONTEND

### **Información Retornada en Login**:
```javascript
{
  token: "JWT_TOKEN",
  usuario: {
    id: 5,
    rol: {
      nombre: "DOCENTE",  // ← Usar para mostrar/ocultar pantallas
      descripcion: "..."
    },
    docenteId: 3,         // ← Si es docente
    estudianteId: null    // ← Si es estudiante
  }
}
```

### **Lógica de UI según Rol**:
```javascript
if (usuario.rol.nombre === 'ADMIN') {
  // Mostrar TODO el menú
  mostrarMenu(['periodos', 'clases', 'docentes', 'estudiantes', 'usuarios', 'analisis']);
}

if (usuario.rol.nombre === 'DOCENTE') {
  // Mostrar gestión académica, ocultar usuarios
  mostrarMenu(['periodos', 'clases', 'estudiantes', 'evaluaciones', 'asistencias', 'proyectos', 'analisis']);
  ocultarMenu(['usuarios']);
}

if (usuario.rol.nombre === 'ESTUDIANTE') {
  // Solo mostrar evaluaciones y asistencias
  mostrarMenu(['mis-evaluaciones', 'mis-asistencias', 'mi-reporte']);
  ocultarMenu(['periodos', 'clases', 'docentes', 'usuarios', 'proyectos']);
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear modelo `Roles`
- [x] Modificar modelo `Usuarios` (agregar `rolId`, `estudianteId`)
- [x] Crear middlewares de autorización (`verificarRol`, `soloMisDatos`, `soloSuClase`)
- [x] Actualizar `iniciarSesion` (incluir rol en token y response)
- [x] Actualizar `insertar` usuario (asignación automática de rol)
- [x] Registrar relaciones en `app.js`
- [x] Crear script `seed-roles.js`
- [ ] Aplicar middlewares a TODAS las rutas
- [ ] Actualizar documentación Swagger
- [ ] Probar con Postman/Swagger

---

**Fecha**: 28 de noviembre de 2025  
**Versión**: 1.0  
**Sistema**: docentes_api - Sistema de Roles y Autorización
