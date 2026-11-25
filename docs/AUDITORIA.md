# Auditoría de consistencia — Biblioteca Solón Argüello

**Base de datos esperada:** `biblioteca_solon_demo`.

Este reporte es de **solo lectura**. No modifica información. Comprueba la consistencia del inventario y los préstamos, además del conteo de las cuatro colecciones.

## Comandos

```powershell
node scripts/auditar.js
```

Para obtener un resultado estructurado:

```powershell
node scripts/auditar.js --json
```

No publiques una captura donde se vea `.env` ni contraseñas.

## Reglas verificadas

| Regla | Qué detecta |
|---|---|
| D01 | Ejemplar vinculado a un libro inexistente |
| D02 | Préstamo cuyo lector ya no existe |
| D03 | Préstamo cuyo ejemplar ya no existe |
| D04 | Ejemplar PRESTADO sin préstamo ACTIVO |
| D05 | Préstamo ACTIVO asociado a ejemplar que no está PRESTADO |
| D06 | Dos o más préstamos ACTIVO del mismo ejemplar |
| D07 | Préstamo DEVUELTO sin fecha de devolución |
| D08 | Préstamo ACTIVO que ya tiene fecha de devolución |
| D09 | Fecha de devolución anterior a la fecha de préstamo |
| D10 | Fecha de vencimiento anterior a la fecha de préstamo |
| D11 | Código de inventario duplicado |
| D12 | Código de lector duplicado |

Si alguna regla devuelve una cantidad mayor que cero, la auditoría indica IDs de muestra para revisar. **No elimina ni repara automáticamente** los registros detectados.

Nota: un préstamo antiguo `DEVUELTO` puede asociarse a un ejemplar que haya vuelto a prestarse después. Eso es válido; el estado actual del ejemplar se compara exclusivamente con el préstamo `ACTIVO`.

## Alcance

Las 12 reglas no equivalen a una garantía absoluta de ausencia de errores (p. ej. no comprueban campos de texto o ISBN), pero ayudan a detectar inconsistencias que invalidarían las estadísticas. La ejecución real de Atlas debe confirmarse en la computadora del equipo.
