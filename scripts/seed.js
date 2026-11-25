'use strict';

// Uso:
//   node scripts/seed.js             -> simulación (sin escribir)
//   node scripts/seed.js --aplicar   -> insertar datos faltantes
// No elimina documentos, no borra colecciones y no modifica registros preexistentes.

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const {
  OBJETIVO, BASE_DEMO, idFicticio,
  registroLibro, registroLector, registroEjemplar,
  registroPrestamo, indicesFaltantes
} = require('./seed-core');

const Libro = require('../src/models/Libro');
const Ejemplar = require('../src/models/Ejemplar');
const Lector = require('../src/models/Lector');
const Prestamo = require('../src/models/Prestamo');

const aplicar = process.argv.includes('--aplicar');
const flagsValidos = new Set(['--aplicar']);
if (process.argv.slice(2).some(arg => !flagsValidos.has(arg))) {
  console.error('Uso: node scripts/seed.js [--aplicar]');
  process.exit(1);
}

function objectId(hex) {
  return new mongoose.Types.ObjectId(hex);
}

async function indicesExistentes(Model, tipo) {
  const ids = Array.from({ length: OBJETIVO }, (_, i) => objectId(idFicticio(tipo, i + 1)));
  const documentos = await Model.find({ _id: { $in: ids } }, { _id: 1 }).lean().exec();
  return new Set(documentos.map(doc => doc._id.toString()));
}

async function planificar(Model, tipo) {
  const total = await Model.countDocuments().exec();
  const yaGenerados = await indicesExistentes(Model, tipo);
  const faltan = Math.max(0, OBJETIVO - total);
  const indices = indicesFaltantes(tipo, yaGenerados, faltan);
  if (indices.length !== faltan) {
    throw new Error(`No hay identificadores DEMO suficientes para ${tipo}; requiere revisión manual`);
  }
  return { tipo, total, faltan, indices, yaGenerados: yaGenerados.size };
}

async function guardarLotes(Model, tipo, indices, crearRegistro) {
  let insertados = 0;
  for (let inicio = 0; inicio < indices.length; inicio += 150) {
    const numeros = indices.slice(inicio, inicio + 150);
    const operaciones = numeros.map(numero => {
      const _id = objectId(idFicticio(tipo, numero));
      return {
        updateOne: {
          filter: { _id },
          update: { $setOnInsert: { _id, ...crearRegistro(numero) } },
          upsert: true
        }
      };
    });
    const resultado = await Model.bulkWrite(operaciones, { ordered: true });
    insertados += resultado.upsertedCount || 0;
    console.log(`  ${tipo}: ${insertados}/${indices.length} registros nuevos`);
  }
  return insertados;
}

async function obtenerDemo(Model, tipo, campos = '_id') {
  const ids = Array.from({ length: OBJETIVO }, (_, i) => objectId(idFicticio(tipo, i + 1)));
  return Model.find({ _id: { $in: ids } })
    .select(campos).sort({ _id: 1 }).lean().exec();
}

async function guardarPrestamos(indices) {
  if (indices.length === 0) return;

  // Solo relacionamos datos de prueba con otros datos de prueba.
  const lectores = (await obtenerDemo(Lector, 'lectores', '_id activo'))
    .filter(lector => lector.activo);
  const ejemplares = await obtenerDemo(Ejemplar, 'ejemplares', '_id estado');
  const disponibles = ejemplares.filter(e => e.estado === 'DISPONIBLE');

  if (!lectores.length || !disponibles.length) {
    throw new Error('Se requieren lectores y ejemplares DEMO disponibles para generar préstamos');
  }

  // Reservamos ejemplares diferentes para los préstamos activos.
  const activosN = Math.min(Math.floor(indices.length * 0.20), disponibles.length);
  const activos = indices.slice(0, activosN);
  const devueltos = indices.slice(activosN);
  const activosEjemplares = disponibles.slice(0, activosN);
  const reservados = new Set(activosEjemplares.map(e => String(e._id)));
  const poolHistoricos = ejemplares.filter(e => !reservados.has(String(e._id)));
  if (devueltos.length && !poolHistoricos.length) {
    throw new Error('Faltan ejemplares DEMO libres para asociar préstamos históricos');
  }

  // Los históricos están cerrados: NO cambiamos el estado actual de sus ejemplares.
  for (let inicio = 0; inicio < devueltos.length; inicio += 150) {
    const numeros = devueltos.slice(inicio, inicio + 150);
    const operaciones = numeros.map((numero, pos) => {
      const ejemplar = poolHistoricos[(inicio + pos) % poolHistoricos.length];
      const lector = lectores[(inicio + pos) % lectores.length];
      const _id = objectId(idFicticio('prestamos', numero));
      return {
        updateOne: {
          filter: { _id },
          update: { $setOnInsert: {
            _id, ...registroPrestamo(numero, lector._id, ejemplar._id, false)
          } },
          upsert: true
        }
      };
    });
    await Prestamo.bulkWrite(operaciones, { ordered: true });
    console.log(`  prestamos DEVUELTOS: ${Math.min(inicio + 150, devueltos.length)}/${devueltos.length}`);
  }

  // Las altas de préstamos ACTIVOS y sus cambios de estado son atómicas.
  // Así no quedan préstamos ACTIVOS con ejemplares DISPONIBLES si algo falla.
  for (let inicio = 0; inicio < activos.length; inicio += 50) {
    const numeros = activos.slice(inicio, inicio + 50);
    const ejemplaresLote = activosEjemplares.slice(inicio, inicio + 50);
    await mongoose.connection.transaction(async session => {
      const idsEjemplares = ejemplaresLote.map(e => e._id);
      const cambiado = await Ejemplar.updateMany(
        { _id: { $in: idsEjemplares }, estado: 'DISPONIBLE' },
        { $set: { estado: 'PRESTADO' } },
        { session }
      ).exec();
      if (cambiado.modifiedCount !== idsEjemplares.length) {
        throw new Error('Un ejemplar dejó de estar disponible durante la carga');
      }
      const operaciones = numeros.map((numero, pos) => {
        const lector = lectores[(inicio + pos) % lectores.length];
        const _id = objectId(idFicticio('prestamos', numero));
        return {
          updateOne: {
            filter: { _id },
            update: { $setOnInsert: {
              _id, ...registroPrestamo(numero, lector._id, ejemplaresLote[pos]._id, true)
            } },
            upsert: true
          }
        };
      });
      await Prestamo.bulkWrite(operaciones, { session, ordered: true });
    });
    console.log(`  prestamos ACTIVOS: ${Math.min(inicio + 50, activos.length)}/${activos.length}`);
  }
}

async function mostrarTotales(encabezado) {
  const resultados = await Promise.all([
    Libro.countDocuments().exec(),
    Ejemplar.countDocuments().exec(),
    Lector.countDocuments().exec(),
    Prestamo.countDocuments().exec()
  ]);
  console.log(`\n${encabezado}`);
  ['libros', 'ejemplares', 'lectores', 'prestamos'].forEach((tipo, i) => {
    console.log(`  ${tipo.padEnd(12)} ${resultados[i]}`);
  });
  return resultados;
}

async function principal() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en .env');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  if (mongoose.connection.name !== BASE_DEMO) {
    throw new Error(
      `BLOQUEADO: conectado a "${mongoose.connection.name}". ` +
      `Solo se permite escribir en "${BASE_DEMO}".`
    );
  }

  console.log(`\nBase autorizada: ${mongoose.connection.name}`);
  const plan = await Promise.all([
    planificar(Libro, 'libros'),
    planificar(Ejemplar, 'ejemplares'),
    planificar(Lector, 'lectores'),
    planificar(Prestamo, 'prestamos')
  ]);
  await mostrarTotales('ESTADO INICIAL');
  console.log('\nPLAN (completar hasta 1000 sin borrar registros)');
  for (const p of plan) {
    console.log(`  ${p.tipo.padEnd(12)} +${p.faltan} nuevos (DEMOs existentes: ${p.yaGenerados})`);
  }

  if (!aplicar) {
    console.log('\nSIMULACIÓN: no se escribió nada en Atlas.');
    console.log('Para ejecutar: node scripts/seed.js --aplicar');
    return;
  }

  console.log('\nAPLICANDO CARGA...');
  await Promise.all([Libro.init(), Ejemplar.init(), Lector.init(), Prestamo.init()]);
  await guardarLotes(Libro, 'libros', plan[0].indices, registroLibro);
  const demoLibros = await obtenerDemo(Libro, 'libros');
  if (plan[1].indices.length && !demoLibros.length) {
    throw new Error('No hay libros DEMO para asociar a los ejemplares');
  }
  await guardarLotes(Ejemplar, 'ejemplares', plan[1].indices, numero =>
    registroEjemplar(numero, demoLibros[(numero - 1) % demoLibros.length]._id)
  );
  await guardarLotes(Lector, 'lectores', plan[2].indices, registroLector);
  await guardarPrestamos(plan[3].indices);

  const totales = await mostrarTotales('ESTADO FINAL');
  if (totales.some(total => total < OBJETIVO)) {
    throw new Error('No se alcanzaron 1000 documentos en todas las colecciones');
  }
  console.log('\nCarga terminada. Los documentos anteriores se conservaron.');
  console.log('Todos los libros nuevos están identificados con [DEMO].');
}

principal()
  .catch(error => {
    console.error('\nERROR:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
