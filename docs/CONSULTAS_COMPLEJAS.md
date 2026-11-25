# 30 consultas complejas — Biblioteca Solón Argüello

**Base de datos:** MongoDB Atlas (`biblioteca_solon_demo`). **API:** Apollo Server + GraphQL.

Cada operación tiene su propio nombre y corresponde a un pipeline MongoDB diferente. Están implementadas en `src/analytics/reportes.js` con etapas como `$lookup`, `$group`, `$match`, `$addFields`, `$dateDiff`, `$sort` y `$limit`. Se exponen mediante `src/graphql/reportesResolvers.js`.

**Antes de sacar conclusiones:** ejecuta `node scripts/auditar.js`. Las estadísticas con documentos DEMO son simulaciones académicas y no representan resultados reales de la biblioteca.

**Campos comunes:** `etiqueta` identifica grupo/título/lector; `cantidad` es la métrica principal; `auxiliar` segunda métrica; `porcentaje` porcentaje (0–100); `promedio` media en días o frecuencia, según el reporte; `detalle` comentario adicional. Los campos no aplicables devuelven `null`.

**Importante:** un resultado vacío puede ser correcto (por ejemplo, si no hay préstamos vencidos). No inventes resultados al presentar evidencias.

## Juan Ángel Rivera Ramírez — Libros e inventario

### A01 — Títulos y copias por categoría

**Métrica:** `cantidad`: Títulos por categoría; `auxiliar`: copias físicas de esa categoría; `porcentaje`/`promedio`: porcentaje de copias disponibles.

```graphql
query A01 {
  librosPorCategoria {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A02 — Disponibilidad real por categoría

**Métrica:** `cantidad`: Ejemplares por categoría; `auxiliar`: ejemplares disponibles; `porcentaje`/`promedio`: porcentaje disponible.

```graphql
query A02 {
  disponibilidadPorCategoria {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A03 — Títulos sin copias físicas

**Métrica:** `cantidad`: 1 = título sin copias; `auxiliar`: —; `porcentaje`/`promedio`: —.

```graphql
query A03 {
  titulosSinEjemplares {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A04 — Autores con mayor diversidad bibliográfica

**Métrica:** `cantidad`: Títulos publicados por el autor; `auxiliar`: categorías distintas; `porcentaje`/`promedio`: —.

```graphql
query A04 {
  autoresConMasTitulos {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A05 — Editoriales con más inventario

**Métrica:** `cantidad`: Copias por editorial; `auxiliar`: títulos de la editorial; `porcentaje`/`promedio`: —.

```graphql
query A05 {
  editorialesConMasEjemplares {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A06 — Estado de copias por estante

**Métrica:** `cantidad`: Copias por ubicación; `auxiliar`: copias disponibles; `porcentaje`/`promedio`: porcentaje disponible.

```graphql
query A06 {
  inventarioPorUbicacion {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A07 — Títulos con más ejemplares

**Métrica:** `cantidad`: Copias por título; `auxiliar`: copias disponibles; `porcentaje`/`promedio`: —.

```graphql
query A07 {
  titulosConMasCopias {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A08 — Proporción de títulos agotados por categoría

**Métrica:** `cantidad`: Títulos sin copias disponibles; `auxiliar`: total de títulos de la categoría; `porcentaje`/`promedio`: porcentaje de títulos sin disponibilidad.

```graphql
query A08 {
  categoriasSinDisponibilidad {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A09 — Distribución de títulos por década

**Métrica:** `cantidad`: Títulos de la década; `auxiliar`: categorías distintas; `porcentaje`/`promedio`: —.

```graphql
query A09 {
  publicacionesPorDecada {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### A10 — Calidad de datos: títulos sin ISBN

**Métrica:** `cantidad`: Títulos sin ISBN; `auxiliar`: total de títulos de la categoría; `porcentaje`/`promedio`: porcentaje sin ISBN.

```graphql
query A10 {
  faltantesISBNPorCategoria {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

## Samuel Aarón Espino de la Cruz — Lectores y actividad

### B01 — Lectores con más movimientos

**Métrica:** `cantidad`: Préstamos del lector; `auxiliar`: préstamos activos; `porcentaje`/`promedio`: —.

```graphql
query B01 {
  lectoresConMasPrestamos {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B02 — Lectores que nunca solicitaron préstamos

**Métrica:** `cantidad`: 0 = sin historial; `auxiliar`: —; `porcentaje`/`promedio`: —.

```graphql
query B02 {
  lectoresSinHistorial {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B03 — Frecuencia histórica de uso por lector

**Métrica:** `cantidad`: Préstamos históricos; `auxiliar`: —; `porcentaje`/`promedio`: frecuencia aproximada de préstamos/mes.

```graphql
query B03 {
  frecuenciaDeLectores {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B04 — Lectores con préstamos vencidos activos

**Métrica:** `cantidad`: Préstamos activos vencidos; `auxiliar`: —; `porcentaje`/`promedio`: promedio de días vencidos.

```graphql
query B04 {
  lectoresConVencidos {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B05 — Lectores activos/inactivos con historial

**Métrica:** `cantidad`: Lectores del grupo; `auxiliar`: préstamos del grupo; `porcentaje`/`promedio`: —.

```graphql
query B05 {
  lectoresPorEstadoYUso {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B06 — Lectores con más devoluciones fuera de plazo

**Métrica:** `cantidad`: Devoluciones tardías del lector; `auxiliar`: —; `porcentaje`/`promedio`: promedio de días de retraso.

```graphql
query B06 {
  lectoresConDevolucionesTardias {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B07 — Promedio de préstamos por estado del lector

**Métrica:** `cantidad`: Lectores del grupo; `auxiliar`: préstamos del grupo; `porcentaje`/`promedio`: promedio de préstamos por lector.

```graphql
query B07 {
  promedioPrestamosPorLector {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B08 — Lectores con dos o más préstamos recientes

**Métrica:** `cantidad`: Préstamos últimos 90 días; `auxiliar`: —; `porcentaje`/`promedio`: —.

```graphql
query B08 {
  lectoresRecurrentes90Dias {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B09 — Lectores que consultan varias categorías

**Métrica:** `cantidad`: Categorías distintas utilizadas; `auxiliar`: préstamos históricos; `porcentaje`/`promedio`: —.

```graphql
query B09 {
  lectoresMulticategoria {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### B10 — Lectores sin movimientos en 90 días

**Métrica:** `cantidad`: 0 = sin actividad reciente; `auxiliar`: —; `porcentaje`/`promedio`: —.

```graphql
query B10 {
  lectoresSinActividad90Dias {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

## Sebastián Emiliano Campos Orozco — Préstamos y devoluciones

### C01 — Distribución de movimientos por estado

**Métrica:** `cantidad`: Préstamos por estado; `auxiliar`: vencidos activos de ese grupo; `porcentaje`/`promedio`: —.

```graphql
query C01 {
  estadoGeneralPrestamos {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C02 — Préstamos vencidos por tramos de retraso

**Métrica:** `cantidad`: Préstamos vencidos del rango; `auxiliar`: —; `porcentaje`/`promedio`: días de atraso promedio.

```graphql
query C02 {
  vencidosPorAntiguedad {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C03 — Títulos con más movimientos de préstamo

**Métrica:** `cantidad`: Movimientos por título; `auxiliar`: préstamos actualmente activos; `porcentaje`/`promedio`: —.

```graphql
query C03 {
  librosMasPrestados {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C04 — Evolución mensual de préstamos

**Métrica:** `cantidad`: Préstamos del mes; `auxiliar`: ya devueltos; `porcentaje`/`promedio`: —.

```graphql
query C04 {
  prestamosPorMes {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C05 — Porcentaje mensual de devoluciones tardías

**Métrica:** `cantidad`: Devoluciones del mes; `auxiliar`: devoluciones tardías; `porcentaje`/`promedio`: porcentaje de tardías.

```graphql
query C05 {
  devolucionesTardiasPorMes {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C06 — Duración de préstamos por categoría

**Métrica:** `cantidad`: Préstamos devueltos por categoría; `auxiliar`: —; `porcentaje`/`promedio`: duración promedio en días.

```graphql
query C06 {
  duracionPromedioPorCategoria {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C07 — Retrasos promedio en devoluciones por categoría

**Métrica:** `cantidad`: Devoluciones tardías por categoría; `auxiliar`: —; `porcentaje`/`promedio`: retraso promedio en días.

```graphql
query C07 {
  retrasoPromedioPorCategoria {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C08 — Copias físicas con mayor rotación

**Métrica:** `cantidad`: Préstamos por ejemplar; `auxiliar`: préstamos activos; `porcentaje`/`promedio`: —.

```graphql
query C08 {
  ejemplaresConMasRotacion {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C09 — Distribución de préstamos por día de semana

**Métrica:** `cantidad`: Préstamos de ese día de semana; `auxiliar`: activos; `porcentaje`/`promedio`: —.

```graphql
query C09 {
  prestamosPorDiaSemana {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

### C10 — Categorías con mayor demanda activa

**Métrica:** `cantidad`: Préstamos activos por categoría; `auxiliar`: lectores distintos; `porcentaje`/`promedio`: —.

```graphql
query C10 {
  categoriasMasPrestadasActualmente {
    etiqueta
    cantidad
    auxiliar
    porcentaje
    promedio
    detalle
  }
}
```

## Referencias técnicas

- MongoDB Aggregation Pipeline: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB `$lookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB `$dateDiff`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/datediff/
- Apollo Server resolvers: https://www.apollographql.com/docs/apollo-server/data/resolvers

## Evidencias que deben guardar

Para cada reporte, guarda: 1) la consulta en Apollo Sandbox, 2) la respuesta real, 3) una explicación breve de qué significa el resultado y 4) qué decisión permitiría tomar en una biblioteca. No confundir los datos ficticios con información oficial.
