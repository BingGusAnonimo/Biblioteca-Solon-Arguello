'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  idFicticio, registroLibro, registroLector, registroEjemplar,
  registroPrestamo, indicesFaltantes
} = require('../scripts/seed-core');

test('los ObjectId son estables entre ejecuciones y distintos por colección', () => {
  assert.equal(idFicticio('libros', 1), idFicticio('libros', 1));
  assert.notEqual(idFicticio('libros', 1), idFicticio('ejemplares', 1));
  assert.match(idFicticio('libros', 1), /^[a-f0-9]{24}$/);
});

test('los registros de libros se identifican como DEMO', () => {
  const libro = registroLibro(1);
  assert.ok(libro.titulo.startsWith('[DEMO]'));
  assert.ok(libro.autor.includes('ficticio'));
  assert.ok(libro.anio <= new Date().getFullYear() + 1);
});

test('los códigos del lector son únicos y compatibles con las validaciones', () => {
  assert.equal(registroLector(1).codigoLector, 'DEMO-LEC-0001');
  assert.notEqual(registroLector(1).codigoLector, registroLector(2).codigoLector);
  assert.match(registroLector(1).telefono, /^\d{10}$/);
});

test('cada ejemplar registra una referencia a un libro', () => {
  const ref = idFicticio('libros', 1);
  const ej = registroEjemplar(2, ref);
  assert.equal(ej.libro, ref);
  assert.equal(ej.estado, 'DISPONIBLE');
});

test('préstamos activos carecen de fecha de devolución', () => {
  const p = registroPrestamo(1, 'lector', 'ejemplar', true, new Date('2026-11-24'));
  assert.equal(p.estado, 'ACTIVO');
  assert.equal(p.fechaDevolucion, null);
});

test('préstamos devueltos registran fecha de devolución', () => {
  const p = registroPrestamo(2, 'lector', 'ejemplar', false, new Date('2026-11-24'));
  assert.equal(p.estado, 'DEVUELTO');
  assert.ok(p.fechaDevolucion instanceof Date);
  assert.ok(p.fechaDevolucion >= p.fechaPrestamo);
});

test('al reejecutar se omiten identificadores ya existentes', () => {
  const encontrados = new Set([idFicticio('libros', 1), idFicticio('libros', 3)]);
  assert.deepEqual(indicesFaltantes('libros', encontrados, 2), [2, 4]);
});
