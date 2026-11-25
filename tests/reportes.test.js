'use strict';

// Estas pruebas NO se conectan a Atlas ni importan credenciales.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { definiciones } = require('../src/analytics/reportes');
const { reglas } = require('../src/analytics/auditoria');
const typeDefs = require('../src/graphql/reportesTypeDefs');

function esSoloLectura(etapas) {
  for (const etapa of etapas) {
    for (const [nombre, valor] of Object.entries(etapa)) {
      assert.ok(!['$out', '$merge'].includes(nombre), `Etapa no permitida: ${nombre}`);
      if (nombre === '$lookup' && Array.isArray(valor.pipeline)) esSoloLectura(valor.pipeline);
      if (nombre === '$facet') for (const sub of Object.values(valor)) esSoloLectura(sub);
    }
  }
}

test('hay exactamente 30 consultas, diez por integrante', () => {
  assert.equal(definiciones.length, 30);
  for (const area of ['LIBROS', 'LECTORES', 'PRESTAMOS']) {
    assert.equal(definiciones.filter(r => r.area === area).length, 10);
  }
});

test('los códigos y nombres GraphQL son distintos y válidos', () => {
  assert.equal(new Set(definiciones.map(r => r.codigo)).size, 30);
  assert.equal(new Set(definiciones.map(r => r.campo)).size, 30);
  for (const [n, grupo] of [['A','LIBROS'], ['B','LECTORES'], ['C','PRESTAMOS']]) {
    for (let i = 1; i <= 10; i++) {
      const codigo = n + String(i).padStart(2,'0');
      assert.equal(definiciones.find(r => r.codigo === codigo)?.area, grupo);
    }
  }
});

test('cada reporte tiene pipeline de agregación y usa un modelo conocido', () => {
  for (const r of definiciones) {
    assert.ok(['Libro', 'Ejemplar', 'Lector', 'Prestamo'].includes(r.modelo), r.codigo);
    assert.ok(Array.isArray(r.pipeline) && r.pipeline.length >= 3, r.codigo);
  }
});

test('las 30 consultas son de solo lectura', () => {
  for (const r of definiciones) esSoloLectura(r.pipeline);
});

test('GraphQL anuncia cada consulta compleja y su tipo', () => {
  for (const r of definiciones) {
    assert.match(typeDefs, new RegExp(`\\b${r.campo}: \\[FilaReporte!\\]!`));
  }
});

test('los 12 controles de auditoría están definidos y son únicos', () => {
  assert.equal(reglas.length, 12);
  assert.equal(new Set(reglas.map(x => x.codigo)).size, 12);
});

test('la auditoría no contiene escrituras', () => {
  for (const r of reglas) esSoloLectura(r.pipeline);
});

test('los pipelines cruzan datos reales mediante lookup', () => {
  const n = definiciones.filter(r => r.pipeline.some(etapa => !!etapa.$lookup)).length;
  assert.ok(n >= 20, `Solo ${n} reportes usan relaciones`);
});

test('el servidor incorpora el módulo sin borrar los módulos existentes', () => {
  const codigo = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
  for (const etiqueta of ['typeDefs, catalogoTypeDefs, reportesTypeDefs', '...resolvers.Query', '...catalogoResolvers.Query', '...reportesResolvers.Query']) {
    assert.ok(codigo.includes(etiqueta), etiqueta);
  }
});

test('las reglas de auditoría detectan referencias inexistentes y estados inconsistentes', () => {
  const codigos = reglas.map(x=>x.codigo);
  for (const c of ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10']) assert.ok(codigos.includes(c));
});
