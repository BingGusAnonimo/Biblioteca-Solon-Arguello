const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Libro = require('../src/models/Libro');
const Ejemplar = require('../src/models/Ejemplar');
const Lector = require('../src/models/Lector');

const libroBase = () => ({
  titulo: 'Pedro Páramo',
  autor: 'Juan Rulfo',
  categoria: 'Literatura mexicana'
});

const lectorBase = () => ({ codigoLector: 'LECT-001', nombre: 'Lector de Prueba' });

test('acepta un libro válido sin campos opcionales', () => {
  assert.equal(new Libro(libroBase()).validateSync(), undefined);
});

test('rechaza título formado solo por espacios', () => {
  const libro = new Libro({ ...libroBase(), titulo: '   ' });
  assert.ok(libro.validateSync()?.errors.titulo);
});

test('rechaza años futuros fuera del máximo', () => {
  const libro = new Libro({ ...libroBase(), anio: new Date().getFullYear() + 5 });
  assert.ok(libro.validateSync()?.errors.anio);
});

test('valida formato de ISBN opcional', () => {
  assert.ok(new Libro({ ...libroBase(), isbn: 'ABC' }).validateSync()?.errors.isbn);
  assert.equal(new Libro({ ...libroBase(), isbn: '9786070123456' }).validateSync(), undefined);
});

test('rechaza códigos de ejemplar con espacios', () => {
  const ejemplar = new Ejemplar({
    libro: new mongoose.Types.ObjectId(), codigoInventario: 'EJ 001'
  });
  assert.ok(ejemplar.validateSync()?.errors.codigoInventario);
});

test('normaliza los códigos de inventario a mayúsculas', () => {
  const ejemplar = new Ejemplar({
    libro: new mongoose.Types.ObjectId(), codigoInventario: 'ej-001'
  });
  assert.equal(ejemplar.codigoInventario, 'EJ-001');
  assert.equal(ejemplar.validateSync(), undefined);
});

test('rechaza correos con formato incorrecto', () => {
  const lector = new Lector({ ...lectorBase(), correo: 'correo-invalido' });
  assert.ok(lector.validateSync()?.errors.correo);
});

test('rechaza teléfonos que no tienen 10 dígitos', () => {
  const lector = new Lector({ ...lectorBase(), telefono: '123' });
  assert.ok(lector.validateSync()?.errors.telefono);
});

test('acepta lectores sin correo ni teléfono', () => {
  assert.equal(new Lector(lectorBase()).validateSync(), undefined);
});

test('no hace peticiones a Atlas durante estas pruebas locales', () => {
  assert.equal(mongoose.connection.readyState, 0);
});
