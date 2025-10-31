# Formato del archivo Excel para carga de estudiantes

## Estructura requerida:

- **Nombre de la hoja:** Sheet1
- **Fila de encabezados:** Fila 7
- **Datos:** Desde fila 8 en adelante

### Columnas:

| Columna | Encabezado (Fila 7) | Contenido | Ejemplo |
|---------|---------------------|-----------|---------|
| B | Cuenta | Número de cuenta del estudiante | 20231234567 |
| C | Nombre | Nombre completo del estudiante | Juan Pérez |
| D | Correo | Correo electrónico institucional | juan.perez@unicah.edu |

## Ejemplo de estructura:

```
Fila 7:  [A]  [B: Cuenta]  [C: Nombre]  [D: Correo]
Fila 8:       20231234567   Juan Pérez   juan.perez@unicah.edu
Fila 9:       20231234568   María López  maria.lopez@unicah.edu
Fila 10:      20231234569   Carlos Ruiz  carlos.ruiz@unicah.edu
...
```

## Notas importantes:

1. El archivo debe ser formato Excel (.xlsx o .xls)
2. La hoja debe llamarse exactamente "Sheet1"
3. Los encabezados deben estar en la fila 7
4. Los datos comienzan en la fila 8
5. El correo debe ser válido (formato email)
6. No puede haber correos duplicados
7. Todos los campos son obligatorios (Cuenta, Nombre, Correo)

## Validaciones que se realizan:

 Formato de correo electrónico válido
 No duplicación de correos
 Campos completos (no vacíos)
 Formato de archivo Excel

## Campos adicionales:

- **apellido:** Se guarda vacío (puedes separar el nombre en el Excel)
- **seccionId:** Se guarda como NULL (se puede asignar después)
- **claseId:** Se guarda como NULL (se puede asignar después)
- **estado:** Se guarda como "ACTIVO" por defecto
