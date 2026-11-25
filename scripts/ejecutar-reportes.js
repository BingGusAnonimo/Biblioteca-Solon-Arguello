'use strict';

// node scripts/ejecutar-reportes.js             -> Lista 30 reportes
// node scripts/ejecutar-reportes.js A01         -> Ejecuta A01
// node scripts/ejecutar-reportes.js --todos     -> Ejecuta los 30, solo lectura
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { definiciones } = require('../src/analytics/reportes');
const modelos = {
  Libro: require('../src/models/Libro'),
  Ejemplar: require('../src/models/Ejemplar'),
  Lector: require('../src/models/Lector'),
  Prestamo: require('../src/models/Prestamo')
};

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log('REPORTES DISPONIBLES (30)');
    for (const r of definiciones) console.log(`${r.codigo} ${r.area.padEnd(9)} ${r.campo}`);
    console.log('\nUsa: node scripts/ejecutar-reportes.js A01');
    return;
  }
  const seleccion = arg === '--todos' ? definiciones : definiciones.filter(r => r.codigo === arg.toUpperCase());
  if (seleccion.length === 0 || process.argv.length > 3) {
    throw new Error('Usa un código A01...C10 o --todos');
  }
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en .env');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  if (mongoose.connection.name !== 'biblioteca_solon_demo') {
    throw new Error('Base incorrecta; solo se permite biblioteca_solon_demo');
  }
  for (const r of seleccion) {
    const filas = await modelos[r.modelo].aggregate(r.pipeline).exec();
    console.log(`\n${r.codigo} · ${r.nombre} · ${filas.length} filas`);
    console.table(filas.slice(0, 15).map(x => ({
      etiqueta: String(x.etiqueta ?? x._id ?? 'Sin información'),
      cantidad: x.cantidad ?? 0,
      auxiliar: x.auxiliar ?? '',
      porcentaje: x.porcentaje ?? '',
      promedio: x.promedio ?? ''
    })));
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });
