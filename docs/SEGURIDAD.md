# Autenticación del personal - Biblioteca Solón Argüello

## Acceso
El catálogo y sus consultas de solo lectura (`catalogo`, `categoriasCatalogo`, `estado`) son públicos. El resto de las consultas GraphQL, incluidos los 30 reportes y las consultas de lectores/préstamos, requiere sesión `ADMIN`. Todas las Mutations requieren sesión y cabecera `x-csrf-token` válida.

## Sesiones
Se utiliza `express-session` con `connect-mongo` para almacenar la sesión en Atlas. La cookie `solon.sid` es `HttpOnly`, `SameSite=Strict`, tiene duración máxima de ocho horas y utiliza `Secure` en producción. Las sesiones se almacenan en la colección técnica `sesiones_admin`.

## Credenciales
`node scripts/crear-admin.js` pide las credenciales desde la terminal y almacena únicamente un hash bcrypt en `usuarios_admin`. `node scripts/generar-secret.js` genera un secreto aleatorio en el archivo `.env`, excluido de Git. No se crean usuarios por defecto con contraseña conocida.

## Límites
- Es un prototipo académico. La seguridad del entorno de producción requiere HTTPS, configuración de proxy, cabeceras de seguridad, copias de respaldo y auditorías adicionales.
- No expongas ni la cadena de conexión ni la contraseña de Atlas.
- Si cambias la clave de la cuenta, las sesiones activas no se revocan automáticamente hasta su vencimiento. Para incidentes, se deben eliminar las sesiones almacenadas.
- Atlas incluye ahora colecciones técnicas `usuarios_admin` y `sesiones_admin`; distingue estas colecciones de las cuatro colecciones bibliográficas DEMO y consulta a tu profesora si el requisito de 1000 documentos se aplica también a las técnicas.
- El panel administrativo sigue cargando hasta 100 elementos por sección; la paginación completa continúa pendiente.
