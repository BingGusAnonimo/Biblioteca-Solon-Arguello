'use strict';

// node scripts/auditar.js           -> Informe en terminal
// node scripts/auditar.js --json    -> Informe JSON
// Solo lectura: no modifica registros ni índices.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { reglas } = require('../src/analytics/auditoria');
const modelos = {
  Libro: require('../src/models/Libro'),
  Ejemplar: require('../src/models/Ejemplar'),
  Lector: require('../src/models/Lector'),
  Prestamo: require('../src/models/Prestamo')
};

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en .env');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  if (mongoose.connection.name !== 'biblioteca_solon_demo') {
    throw new Error('Auditoría cancelada: la base seleccionada no es biblioteca_solon_demo');
  }
  const totales = {};
  for (const [nombre, modelo] of Object.entries(modelos)) {
    totales[nombre.toLowerCase()] = await modelo.countDocuments().exec();
  }
  const incidencias = [];
  for (const regla of reglas) {
    const Modelo = modelos[regla.modelo];
    const [conteo] = await Modelo.aggregate([...regla.pipeline, { $count: 'cantidad' }]).exec();
    const cantidad = conteo?.cantidad ?? 0;
    let muestra = [];
    if (cantidad > 0) {
      const docs = await Modelo.aggregate([...regla.pipeline, { $limit: 3 }, { $project: { _id: 1 } }]).exec();
      muestra = docs.map(d => String(d._id));
    }
    incidencias.push({ codigo: regla.codigo, descripcion: regla.descripcion, cantidad, muestra });
  }
  const incidenciasTotales = incidencias.reduce((n, x) => n + x.cantidad, 0);
  const salida = {
    base: mongoose.connection.name,
    fecha: new Date().toISOString(),
    soloLectura: true,
    totales, incidenciasTotales, incidencias
  };
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(salida, null, 2) + '\n');
  } else {
    console.log('\nAUDITORÍA DE CONSISTENCIA (SIN ESCRITURA)');
    console.log('Base:', salida.base);
    console.log('Totales:', JSON.stringify(totales));
    for (const i of incidencias) {
      console.log(`${i.cantidad ? 'REVISAR' : 'OK'} ${i.codigo} (${i.cantidad}): ${i.descripcion}`);
      if (i.muestra.length) console.log('  IDs de ejemplo:', i.muestra.join(', '));
    }
    console.log(`\nIncidencias detectadas: ${incidenciasTotales}`);
    console.log(incidenciasTotales ? 'Revisar antes de usar reportes como evidencia definitiva.' : 'No se detectaron inconsistencias entre estas 12 reglas.');
  }
}
if (process.argv.slice(2).some(v => v !== '--json')) {
  console.error('Uso: node scripts/auditar.js [--json]'); process.exit(1);
}
main().catch(e => { console.error('ERROR de auditoría:', e.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });
