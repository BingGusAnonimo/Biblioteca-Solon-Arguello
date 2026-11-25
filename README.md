# Biblioteca Solón Argüello — Sistema de Catálogo Bibliotecario

> **Prototipo académico.** Sistema de consulta bibliográfica, control de ejemplares, lectores, préstamos y devoluciones para el caso de estudio de la Biblioteca Pública Central Estatal «Solón Argüello» (Tepic, Nayarit). La carga masiva de datos se generó con **registros ficticios de demostración** y **no representa el inventario oficial** de la institución.

## Equipo

- Juan Ángel Rivera Ramírez
- Samuel Aarón Espino de la Cruz
- Sebastián Emiliano Campos Orozco

## 1. Objetivo

Desarrollar un sistema web para que los visitantes consulten títulos y disponibilidad de ejemplares, mientras que el personal autorizado pueda administrar libros, copias, lectores y movimientos de préstamo y devolución. El prototipo incluye reportes analíticos que permiten interpretar la información almacenada.

## 2. Tecnologías

| Componente | Tecnología |
|---|---|
| Base de datos en la nube | MongoDB Atlas |
| Modelado y validación | Mongoose |
| Servidor | Node.js y Express 5 |
| API | GraphQL con Apollo Server |
| Interfaz | HTML, CSS y JavaScript con `fetch()` |
| Autenticación | `express-session`, `connect-mongo`, `bcryptjs` |
| Control de versiones | Git y GitHub |
| Pruebas automatizadas | Módulo `node:test` de Node.js |

La decisión de usar MongoDB frente a Neo4j se documenta en la investigación técnica incluida por el equipo en `docs/`.

## 3. Funcionalidades

**Catálogo público**
- Buscar libros por título, autor, editorial o ISBN.
- Filtrar por categoría y por disponibilidad.
- Consultar la ficha bibliográfica, los ejemplares disponibles y la paginación.

**Panel administrativo (requiere iniciar sesión)**
- Alta, consulta, edición y eliminación de libros, ejemplares y lectores, con las restricciones del negocio.
- Registro de préstamos y devoluciones.
- Consulta de estados del inventario, estadísticas y reportes.
- Inicio y cierre de sesión del personal.

**Análisis**
- 30 consultas analíticas implementadas con agregaciones de MongoDB y expuestas desde GraphQL.
- Panel `reportes.html` con tablas y gráficas; exportación de resultados a CSV/JSON.
- Auditoría de consistencia de datos mediante 12 reglas de solo lectura.

**Nota:** El prototipo no está habilitado para despliegue público. Se requiere una revisión adicional de seguridad, configuración de HTTPS y medidas operativas para uso real.

## 4. Estructura general

```text
BIBLIOTECA_SOLON_NOSQL/
├── index.js                       # Express, Apollo, rutas y sesiones
├── package.json
├── .env                           # Credenciales locales; NUNCA se sube
├── .env.example                   # Plantilla sin secretos, si está incluida
├── public/
│   ├── catalogo.html, catalogo.css, catalogo.js
│   ├── login.html, login.css, login.js
│   ├── admin.html, admin.css, admin.js
│   ├── libros.html
│   ├── ejemplares.html
│   ├── lectores.html
│   ├── prestamos.html
│   ├── reportes.html, reportes.css, reportes.js
│   ├── reportes-util.js
│   └── sesion.js
├── src/
│   ├── models/                    # Libro, Ejemplar, Lector, Prestamo, UsuarioAdmin
│   ├── graphql/                   # Esquemas y resolvers de CRUD, catálogo y reportes
│   ├── analytics/                 # Pipelines de reportes y reglas de auditoría
│   └── auth/                      # Permisos GraphQL
├── scripts/
│   ├── generar-secret.js
│   ├── crear-admin.js
│   ├── seed.js
│   ├── auditar.js
│   └── ejecutar-reportes.js
├── tests/
└── docs/
    ├── CONSULTAS_COMPLEJAS.md
    ├── AUDITORIA.md
    ├── SEGURIDAD.md
    └── ...
```

La estructura anterior muestra los archivos principales; puede haber archivos adicionales de la implementación.

## 5. Requisitos previos

- Node.js y npm instalados (usar una versión compatible con las dependencias del `package.json`).
- Una cuenta de MongoDB Atlas con una base de datos de pruebas.
- Acceso a Internet para conectar el servidor local con Atlas.
- Git para control de versiones.

## 6. Instalación local

Clonar el repositorio, o abrir la carpeta del proyecto en VS Code.

```powershell
npm install
```

Crear un archivo `.env` **local y privado**. No copiar credenciales en capturas, commits ni documentos:

```dotenv
MONGODB_URI=<URI_PRIVADA_DE_MONGODB_ATLAS>
PORT=4000
```

**No utilizar literalmente el valor entre `<...>`**. Colocar la URI verdadera en `.env`, sin añadir una línea `SESSION_SECRET` manualmente. Luego ejecutar `node scripts/generar-secret.js`: el script agregará el secreto de sesión cuando aún no exista. Si `SESSION_SECRET` ya existe con un valor válido, no hace falta regenerarlo en cada inicio.

Asegurarse de que `.env` y `node_modules/` están excluidos por `.gitignore`.

Crear una cuenta administrativa por terminal (solo la primera vez para ese nombre de usuario):

```powershell
node scripts/generar-secret.js
node scripts/crear-admin.js
```

`crear-admin.js` solicitará un usuario y una contraseña de al menos 12 caracteres. La contraseña se guarda como hash, no como texto plano.

Iniciar el servidor:

```powershell
npm start
```

Por defecto, el servidor atiende **solo en el equipo local** (`127.0.0.1`, puerto 4000).

## 7. Direcciones de acceso

| Dirección local | Función | Acceso |
|---|---|---|
| `http://localhost:4000/` | Redirección al catálogo | Público |
| `http://localhost:4000/catalogo.html` | Búsqueda y disponibilidad | Público |
| `http://localhost:4000/login.html` | Iniciar sesión | Público |
| `http://localhost:4000/admin.html` | Resumen administrativo | Personal autorizado |
| `http://localhost:4000/libros.html` | Gestión de libros | Personal autorizado |
| `http://localhost:4000/ejemplares.html` | Gestión de copias | Personal autorizado |
| `http://localhost:4000/lectores.html` | Gestión de lectores | Personal autorizado |
| `http://localhost:4000/prestamos.html` | Préstamos y devoluciones | Personal autorizado |
| `http://localhost:4000/reportes.html` | Reportes y estadísticas | Personal autorizado |
| `http://localhost:4000/graphql` | API GraphQL | Consultas públicas limitadas; el resto requiere sesión |

Las mutaciones administrativas verifican sesión y token CSRF. No basta con ocultar botones en la interfaz.

## 8. Base de datos y modelo

Colecciones principales del ejercicio:

| Colección | Uso |
|---|---|
| `libros` | Ficha bibliográfica: título, autor, categoría, editorial, año e ISBN |
| `ejemplares` | Copias físicas, código de inventario, estado y ubicación |
| `lectores` | Registro de lectores y su estado |
| `prestamos` | Movimientos de préstamo, fecha límite, devolución y estado |

Relaciones: un libro puede tener varios ejemplares; un lector puede tener varios préstamos históricos; cada préstamo referencia un ejemplar.

Estados de ejemplar: `DISPONIBLE`, `PRESTADO`, `BAJA`. Estados de préstamo: `ACTIVO`, `DEVUELTO`.

Colecciones técnicas adicionales: `usuarios_admin` y `sesiones_admin`; **no son parte de las cuatro colecciones de 1,000 documentos**.

## 9. Datos de demostración

Se preparó una carga académica de **1,000 documentos por colección principal**: 4,000 en total, según la verificación realizada por el equipo. Los libros generados llevan un indicador `[DEMO]` y no son registros oficiales de la biblioteca.

Comandos disponibles:

```powershell
node scripts/seed.js             # Simulación; no escribe
node scripts/seed.js --aplicar   # Inserta los faltantes; MODIFICA Atlas
```

**No ejecutar `--aplicar` sobre una base real**. El script fue diseñado para la base `biblioteca_solon_demo`, no para el inventario institucional.

## 10. Verificación y pruebas

Ejecutar las pruebas locales:

```powershell
node --test
```

Revisar la auditoría, que no modifica documentos:

```powershell
node scripts/auditar.js
node scripts/auditar.js --json
```

En la ejecución documentada durante el desarrollo se obtuvieron **12 reglas sin incidencias detectadas** sobre las cuatro colecciones principales. Esto no sustituye una auditoría de seguridad ni garantiza la ausencia absoluta de errores.

Listar los 30 reportes:

```powershell
node scripts/ejecutar-reportes.js
```

Ejecutar uno o todos:

```powershell
node scripts/ejecutar-reportes.js A01
node scripts/ejecutar-reportes.js --todos
```

Los códigos de reportes se distribuyen en tres grupos:

- **A01–A10:** libros e inventario — Juan Ángel Rivera Ramírez.
- **B01–B10:** lectores y actividad — Samuel Aarón Espino de la Cruz.
- **C01–C10:** préstamos y devoluciones — Sebastián Emiliano Campos Orozco.

El detalle, el objetivo y la operación GraphQL de cada uno están en [`docs/CONSULTAS_COMPLEJAS.md`](docs/CONSULTAS_COMPLEJAS.md).

### Ejemplo de consulta pública

```graphql
query {
  catalogo(pagina: 1, porPagina: 9) {
    total
    paginas
    registros {
      titulo
      autor
      disponibles
      totalEjemplares
    }
  }
  categoriasCatalogo
}
```

### Ejemplo de consulta administrativa

Requiere una sesión autorizada:

```graphql
query {
  librosPorCategoria {
    etiqueta
    cantidad
    auxiliar
    porcentaje
  }
}
```

## 11. Seguridad y buenas prácticas

- El archivo `.env` **no debe subirse al repositorio**, ni compartirse en capturas.
- Las credenciales de MongoDB Atlas deben tener privilegios mínimos y ser rotadas si se expusieron.
- Los documentos ficticios se mantienen separados de la información real.
- La API protege consultas administrativas y mutaciones mediante sesión; la protección por login se implementa también en el servidor.
- No publicar este prototipo directamente en Internet. Antes de un despliegue real se requieren HTTPS, configuración segura de proxies, validación operativa y revisión de permisos.
- No se deben subir volcados de la base de datos, tokens, cookies, archivos `.env` ni credenciales administrativas.

Ver [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) para detalles y limitaciones.

## 12. Investigación y documentación

- `docs/CONSULTAS_COMPLEJAS.md`: las 30 consultas y sus métricas.
- `docs/AUDITORIA.md`: las 12 reglas de consistencia.
- `docs/SEED_DEMO.md`: generación de datos ficticios.
- `docs/SEGURIDAD.md`: autenticación y autorización.
- Investigación comparativa **MongoDB Atlas vs. Neo4j AuraDB**: archivo Word preparado por el equipo para incluirse en `docs/`.
- `docs/GUIA_ENTREGA.md`: evidencia, comprobaciones y publicación en GitHub.
- `docs/EVIDENCIAS.md`: lista de capturas de demostración.

## 13. Alcance y limitaciones

Este proyecto es una demostración académica. La base actual contiene datos ficticios y los resultados de sus estadísticas no deben interpretarse como indicadores reales de la biblioteca. Algunas vistas CRUD presentan un número limitado de registros por consulta; por ello, el total se verifica desde GraphQL o MongoDB Atlas. La instalación y operación externa requieren credenciales de Atlas y condiciones de seguridad adicionales.

## 14. Referencias del proyecto

- Entrevista/visita documentada en la propuesta: https://youtu.be/SvxVj6zZnP8
- Documentación de [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)
- Documentación de [Mongoose](https://mongoosejs.com/docs/)
- Documentación de [Apollo Server](https://www.apollographql.com/docs/apollo-server)
- Documentación de [GraphQL](https://graphql.org/learn/)

**No se incluye el video de demostración final hasta que el equipo lo grabe y publique.**

---

**Uso académico.** No se declara que este software esté autorizado por la biblioteca para su uso institucional o comercial.
