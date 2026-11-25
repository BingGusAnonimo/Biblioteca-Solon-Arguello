'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../public/reportes-util');

test('solo admite nombres de campos GraphQL válidos', () => {
  assert.equal(U.esCampoGraphQL('librosPorCategoria'), true);
  assert.equal(U.esCampoGraphQL('abc { eliminarLibro }'), false);
  assert.throws(() => U.queryReporte('a b'), /no es válido/);
});
test('construye la consulta sin mutaciones', () => {
  assert.match(U.queryReporte('librosPorCategoria'), /^query VisualizarReporte/);
  assert.match(U.queryReporte('librosPorCategoria'), /etiqueta cantidad auxiliar porcentaje promedio detalle/);
});
test('identifica reportes de las tres áreas', () => {
  for (const [codigo, area] of [['A01','LIBROS'],['B10','LECTORES'],['C04','PRESTAMOS']]) {
    assert.equal(U.esReporteValido({ codigo, campo: 'x', nombre: 'Reporte', area }), true);
  }
  assert.equal(U.esReporteValido({codigo: 'D11',campo: 'x',nombre: 'mal',area:'LIBROS'}), false);
});
test('normaliza valores opcionales sin convertir null a cero', () => {
  const f = U.normalizarFila({ etiqueta: 'Arte', cantidad: 100, auxiliar: null, porcentaje: 82 });
  assert.equal(f.porcentaje, 82); assert.equal(f.auxiliar, null);
  assert.deepEqual(U.medidasDisponibles([f]), ['cantidad','porcentaje']);
});
test('la gráfica de porcentajes respeta la escala de 100', () => {
  const d = U.datosGrafica([{ etiqueta: 'Arte', porcentaje: 82 }], 'porcentaje');
  assert.equal(d[0].porcentajeBarra, 82);
});
test('la gráfica de cantidades escala respecto al máximo visible', () => {
  const d = U.datosGrafica([{ etiqueta: 'A', cantidad: 10 },{ etiqueta:'B',cantidad:20}], 'cantidad');
  assert.equal(d[0].porcentajeBarra, 50); assert.equal(d[1].porcentajeBarra, 100);
});
test('la exportación CSV cita campos y mitiga inyección de fórmulas', () => {
  const csv = U.crearCSV([{etiqueta:'=SUM(1,2)',cantidad:2,auxiliar:null,porcentaje:null,promedio:null,detalle:'A,"B"'}]);
  assert.match(csv, /"'=SUM\(1,2\)"/);
  assert.match(csv, /"A,""B"""/);
});
