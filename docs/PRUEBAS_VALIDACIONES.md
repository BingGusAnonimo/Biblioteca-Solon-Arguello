# Comprobación de validaciones — Biblioteca Solón Argüello

## Reglas añadidas

| Módulo | Validación |
| --- | --- |
| Libros | Título, autor y categoría de 2 caracteres como mínimo; longitud máxima por campo. |
| Libros | Año entero entre 0 y el próximo año, si se proporciona. |
| Libros | ISBN opcional de 10 o 13 caracteres (acepta guiones y espacios). No comprueba el dígito de control. |
| Ejemplares | Código de inventario de 3 a 30 letras, números y guiones intermedios; obligatorio y único. |
| Ejemplares | Ubicación opcional de hasta 100 caracteres. |
| Lectores | Código obligatorio y único, nombre no vacío. |
| Lectores | Correo opcional con formato básico y teléfono opcional de 10 dígitos. |
| Préstamos | Fecha futura, lector activo y ejemplar disponible (reglas ya existentes, preservadas). |

## Pruebas de la interfaz

1. Intentar guardar un libro con título formado por espacios: **rechazado**.
2. Intentar guardar un libro con año muy futuro: **rechazado**.
3. Intentar guardar un ISBN `ABC`: **rechazado**.
4. Registrar un lector con `correo-invalido`: **rechazado**.
5. Registrar un lector con teléfono `123`: **rechazado**.
6. Registrar un ejemplar con código `EJ 001`: **rechazado**.
7. Intentar repetir `EJ-001` (si existe): **rechazado** por el índice único.
8. Registrar datos válidos y editarlos: **deben guardarse sin duplicados**.
9. Registrar préstamo y devolución con lector y ejemplar válidos: **deben seguir funcionando**.
10. Verificar los registros desde Data Explorer en Atlas.

## Límites conocidos

- Validar no equivale a autorizar: todavía falta autenticación de personal.
- El sistema aún no tiene paginación real ni protección integral ante cambios concurrentes de todo el inventario.
- Reglas nuevas no corrigen automáticamente documentos antiguos.
- Los índices únicos requieren estar creados correctamente en Atlas.
- No se implementó una prohibición general de títulos repetidos: pueden existir distintas ediciones.
