# Sistema de Rifas de Proyectos - Documentación

## 📋 Descripción General

El sistema de rifas permite asignar proyectos aleatoriamente a grupos de estudiantes en una clase específica. Este módulo fue reimplementado después de perderse en conflictos de merge.

## 🗄️ Estructura de Base de Datos

### Tabla: `Grupos`
- **id**: INTEGER (PK, autoincremental)
- **nombre**: STRING(100) - Nombre del grupo (ej: "Grupo 1", "Grupo 2")
- **claseId**: INTEGER (FK → Clases)
- **proyectoId**: INTEGER (FK → Proyectos)
- **createdAt**, **updatedAt**: TIMESTAMP

### Tabla: `GrupoEstudiantes` (Intermedia)
- **id**: INTEGER (PK, autoincremental)
- **grupoId**: INTEGER (FK → Grupos)
- **estudianteId**: INTEGER (FK → Estudiantes)
- **createdAt**, **updatedAt**: TIMESTAMP
- **Índice único**: `unique_grupo_estudiante` (grupoId, estudianteId)

## 🔗 Relaciones

```
Clases 1:N Grupos
Proyectos 1:1 Grupos
Grupos N:M Estudiantes (a través de GrupoEstudiantes)
```

## 🛣️ Endpoints API

### Base URL: `/api/grupos`

#### 1. **Validar Cantidad de Estudiantes**
```http
GET /api/grupos/validar-cantidad?claseId={id}&cantidad={num}
```
**Descripción**: Verifica si hay suficientes estudiantes inscritos para la cantidad solicitada.

**Parámetros Query**:
- `claseId` (integer, requerido): ID de la clase
- `cantidad` (integer, requerido): Cantidad a validar

**Respuestas**:
- `200 OK`: Cantidad válida
  ```json
  {
    "mensaje": "Cantidad válida",
    "totalDisponibles": 30,
    "cantidadSolicitada": 25,
    "valido": true
  }
  ```
- `400 Bad Request`: Cantidad excedida
  ```json
  {
    "error": "Cantidad excedida",
    "mensaje": "La cantidad solicitada (40) es mayor a los estudiantes disponibles (30)",
    "totalDisponibles": 30,
    "cantidadSolicitada": 40,
    "valido": false
  }
  ```

**Roles permitidos**: ADMIN, DOCENTE

---

#### 2. **Rifar Proyectos y Crear Grupos**
```http
POST /api/grupos/rifar-proyectos
```
**Descripción**: Crea grupos automáticamente y asigna proyectos de forma aleatoria usando el algoritmo Fisher-Yates.

**Body**:
```json
{
  "claseId": 5
}
```

**Respuestas**:
- `201 Created`: Grupos creados exitosamente
  ```json
  {
    "mensaje": "Proyectos rifados y grupos creados exitosamente",
    "totalGrupos": 8,
    "grupos": [
      {
        "grupoId": 1,
        "grupoNombre": "Grupo 1",
        "proyectoId": 15,
        "proyectoNombre": "Sistema de Gestión",
        "orden": 1
      },
      // ... más grupos
    ]
  }
  ```
- `400 Bad Request`: Ya existen grupos
  ```json
  {
    "error": "Ya existen grupos para esta clase",
    "mensaje": "Elimine los grupos existentes antes de rifar nuevamente"
  }
  ```

**Roles permitidos**: ADMIN, DOCENTE

**Algoritmo**:
1. Obtiene todos los proyectos de la clase
2. Los mezcla aleatoriamente (Fisher-Yates shuffle)
3. Crea un grupo por cada proyecto
4. Asigna el proyecto al grupo

---

#### 3. **Asignar Estudiantes a un Grupo**
```http
POST /api/grupos/asignar-estudiantes
```
**Descripción**: Asigna estudiantes específicos a un grupo. Valida que estén inscritos en la clase y no estén en otro grupo.

**Body**:
```json
{
  "grupoId": 12,
  "estudiantesIds": [45, 67, 89, 102]
}
```

**Respuestas**:
- `200 OK`: Asignación exitosa
  ```json
  {
    "mensaje": "Estudiantes asignados al grupo exitosamente",
    "grupoId": 12,
    "totalEstudiantes": 4
  }
  ```
- `400 Bad Request`: Estudiantes ya en otro grupo
  ```json
  {
    "error": "Algunos estudiantes ya están en otro grupo",
    "estudiantesDuplicados": [45, 67]
  }
  ```

**Roles permitidos**: ADMIN, DOCENTE

**Validaciones**:
- ✅ El grupo existe
- ✅ Todos los estudiantes están inscritos en la clase
- ✅ Ningún estudiante está en otro grupo de la misma clase

---

#### 4. **Listar Grupos de una Clase**
```http
GET /api/grupos/listar?claseId={id}
```
**Descripción**: Lista todos los grupos de una clase con sus estudiantes y proyectos asignados.

**Parámetros Query**:
- `claseId` (integer, requerido): ID de la clase

**Respuestas**:
- `200 OK`:
  ```json
  {
    "claseId": 5,
    "totalGrupos": 8,
    "grupos": [
      {
        "id": 12,
        "nombre": "Grupo 1",
        "claseId": 5,
        "proyectoId": 15,
        "proyecto": {
          "id": 15,
          "nombre": "Sistema de Gestión",
          "descripcion": "...",
          "fecha_entrega": "2025-12-15",
          "estado": "ACTIVO"
        },
        "estudiantes": [
          {
            "id": 45,
            "nombre": "Juan Pérez",
            "correo": "juan@example.com",
            "estado": "ACTIVO"
          },
          // ... más estudiantes
        ]
      },
      // ... más grupos
    ]
  }
  ```

**Roles permitidos**: ADMIN, DOCENTE, ESTUDIANTE

---

#### 5. **Eliminar Grupos de una Clase**
```http
DELETE /api/grupos/eliminar-clase?claseId={id}
```
**Descripción**: Elimina todos los grupos de una clase y sus asignaciones de estudiantes.

**Parámetros Query**:
- `claseId` (integer, requerido): ID de la clase

**Respuestas**:
- `200 OK`:
  ```json
  {
    "mensaje": "Grupos eliminados exitosamente",
    "totalEliminados": 8
  }
  ```
- `404 Not Found`:
  ```json
  {
    "mensaje": "No hay grupos en esta clase"
  }
  ```

**Roles permitidos**: ADMIN, DOCENTE

**Acción en cascada**: Elimina primero las asignaciones en `GrupoEstudiantes` y luego los grupos.

---

## 🎲 Flujo de Trabajo Típico

### Escenario: Rifar proyectos en una clase

1. **Verificar estudiantes disponibles**
   ```
   GET /api/grupos/validar-cantidad?claseId=5&cantidad=30
   ```

2. **Rifar proyectos y crear grupos**
   ```
   POST /api/grupos/rifar-proyectos
   Body: { "claseId": 5 }
   ```

3. **Asignar estudiantes a cada grupo** (repetir para cada grupo)
   ```
   POST /api/grupos/asignar-estudiantes
   Body: {
     "grupoId": 12,
     "estudiantesIds": [45, 67, 89, 102]
   }
   ```

4. **Verificar asignaciones**
   ```
   GET /api/grupos/listar?claseId=5
   ```

5. **Si necesita reiniciar el proceso**
   ```
   DELETE /api/grupos/eliminar-clase?claseId=5
   ```
   Luego vuelva al paso 2.

---

## 🔐 Seguridad

- Todos los endpoints requieren autenticación mediante JWT (`bearerAuth`)
- Los roles se verifican con el middleware `verificarRol`
- Solo ADMIN y DOCENTE pueden crear, modificar y eliminar grupos
- ESTUDIANTE solo puede listar grupos (lectura)

---

## 🧪 Pruebas Sugeridas

### Test Case 1: Rifar con éxito
- Clase con 5 proyectos y 20 estudiantes inscritos
- Rifar proyectos → Debe crear 5 grupos
- Asignar 4 estudiantes por grupo

### Test Case 2: Error - Grupos existentes
- Rifar proyectos en una clase
- Intentar rifar nuevamente → Debe retornar error 400

### Test Case 3: Error - Estudiante duplicado
- Asignar estudiante X al Grupo 1
- Intentar asignar estudiante X al Grupo 2 → Debe retornar error 400

### Test Case 4: Eliminar y recrear
- Crear grupos
- Eliminar todos los grupos de la clase
- Rifar nuevamente → Debe funcionar correctamente

---

## 📝 Notas Técnicas

- **Algoritmo de mezcla**: Fisher-Yates shuffle garantiza distribución uniforme
- **Prevención de duplicados**: Índice único en `GrupoEstudiantes` a nivel de BD
- **Cascada manual**: La eliminación de grupos primero elimina asignaciones para evitar errores de FK
- **Validación de inscripción**: Se verifica contra `EstudiantesClases` antes de asignar

---

## 🔄 Historial de Cambios

- **29 Nov 2025**: Implementación inicial (commit 8a1c512)
- **29 Nov 2025**: Merge y mejoras (commit 2ebaea6)
- **29 Nov 2025**: Revertido por error (commit 67be794)
- **1 Dic 2025**: Reimplementación completa en rama MoralesaNew

---

## 👥 Autores

- Implementación original: Nahun Morales
- Merge y pruebas: Daniel Molina
- Reimplementación: Sistema recuperado de commits anteriores
