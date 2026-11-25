'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Ejecutar desde la raíz de BIBLIOTECA_SOLON_NOSQL.
// Solo inserta el vínculo al menú si todavía no existe.
const paginas = ['admin.html','libros.html','ejemplares.html','lectores.html','prestamos.html'];
const publicDir = path.resolve(process.cwd(), 'public');
let changed = 0;
for (const pagina of paginas) {
  const file = path.join(publicDir, pagina);
  if (!fs.existsSync(file)) { console.log(`OMITIR ${pagina}: archivo no encontrado`); continue; }
  let contenido = fs.readFileSync(file, 'utf8');
  if (/href=["'](?:\.\/)?reportes\.html["']/.test(contenido)) { console.log(`OK ${pagina}: enlace existente`); continue; }
  const prestamos = contenido.indexOf('href="prestamos.html"');
  if (prestamos < 0) { console.log(`REVISAR ${pagina}: no se encontró el menú esperado`); continue; }
  const cierreNav = contenido.indexOf('</nav>', prestamos);
  if (cierreNav < 0) { console.log(`REVISAR ${pagina}: no se encontró cierre de navegación`); continue; }
  const enlace = '<a class="nav-link" href="reportes.html"><span class="nav-icon">▥</span><span>Reportes</span></a>\n';
  contenido = contenido.slice(0, cierreNav) + enlace + contenido.slice(cierreNav);
  fs.writeFileSync(file, contenido, 'utf8');
  console.log(`ACTUALIZADO ${pagina}`); changed++;
}
console.log(`Menús actualizados: ${changed}. No se modificaron modelos, base de datos ni .env.`);
