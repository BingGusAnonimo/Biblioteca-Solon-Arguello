'use strict';
// Modifica únicamente las etiquetas de scripts en las páginas administrativas existentes.
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '..', 'public');
const paginas = ['admin.html','libros.html','ejemplares.html','lectores.html','prestamos.html','reportes.html'];
for (const archivo of paginas) {
  const ruta = path.join(dir, archivo);
  if (!fs.existsSync(ruta)) { console.warn('No se encontró:', archivo); continue; }
  let html = fs.readFileSync(ruta, 'utf8');
  if (html.includes('src="/sesion.js"')) { console.log('Ya integrado:', archivo); continue; }
  const marcador = archivo === 'reportes.html' ? '<script defer src="/reportes.js"></script>' : '<script defer src="/admin.js"></script>';
  if (!html.includes(marcador)) { console.warn('Marcador no encontrado en:', archivo); continue; }
  html = html.replace(marcador, '<script defer src="/sesion.js"></script>\n  ' + marcador);
  fs.writeFileSync(ruta, html);
  console.log('Protección visual integrada:', archivo);
}
