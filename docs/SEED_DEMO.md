# Carga de datos ficticios — Biblioteca Solón Argüello

## Objetivo

Completar hasta **1,000 documentos por colección** en `biblioteca_solon_demo` para pruebas académicas.

Colecciones: `libros`, `ejemplares`, `lectores` y `prestamos`.

**No son datos reales de la biblioteca.** Los libros nuevos llevan `[DEMO]` en el título; los lectores y ejemplares usan códigos `DEMO-`.

## Requisitos

- Proyecto con los modelos existentes en `src/models/Libro.js`, `Ejemplar.js`, `Lector.js` y `Prestamo.js`.
- Dependencias del proyecto (`mongoose` y `dotenv`) previamente instaladas (`npm install`).
- `.env` con `MONGODB_URI=.../biblioteca_solon_demo?...`, protegido por `.gitignore`.
- Atlas conectado y permisos de lectura y escritura.

## Instalación

Copiar `scripts/seed.js`, `scripts/seed-core.js` y `tests/seed.test.js` a sus carpetas correspondientes en el proyecto. **No reemplazar `index.js` ni los modelos.**

Desde la carpeta raíz del proyecto:

```powershell
node --test tests/seed.test.js
node scripts/seed.js
node scripts/seed.js --aplicar
```

El primer comando ejecuta pruebas sin conectarse a Atlas; el segundo muestra una simulación de cantidades y no escribe datos; el tercero ejecuta la carga.

## Medidas de seguridad

- El script verifica que la base conectada se llame **exactamente** `biblioteca_solon_demo`.
- Nunca utiliza `deleteMany`, `dropDatabase` ni `dropCollection`.
- Usa identificadores estables y operaciones `upsert` con `$setOnInsert`; una nueva ejecución no duplica los documentos generados.
- Crea referencias exclusivamente entre libros, ejemplares y lectores ficticios generados.
- Los préstamos activos se guardan junto con su cambio a `PRESTADO` mediante transacciones.
- Los préstamos históricos aparecen `DEVUELTO` y no ocupan ejemplares.
- Se generan aproximadamente 20 % préstamos activos nuevos, siempre que haya suficientes ejemplares demo disponibles.
- Las cuentas iniciales pueden superar 1000 si ya hay más documentos; nunca se eliminan para reducir las cifras.

## Verificación en Atlas y GraphQL

En Atlas: `Browse Collections` -> `biblioteca_solon_demo` -> revisar `libros`, `ejemplares`, `lectores` y `prestamos`.

En Apollo Sandbox (`http://localhost:4000/graphql`):

```graphql
query {
  totalLibros
  totalEjemplares
  totalLectores
  totalPrestamos
}
```

Los cuatro totales deben ser **al menos 1000**; en una base con menos de 1000 inicialmente, se completan hasta 1000.

## Advertencia

Los formularios actuales del panel pueden mostrar solo los primeros 100 registros en algunas secciones; **esto no significa que Atlas tenga únicamente 100**. Para comprobar los totales utiliza la consulta GraphQL o la colección en Atlas.

Antes de subir a GitHub, revisar `git status`, confirmar que `.env` no está rastreado y crear un commit.
