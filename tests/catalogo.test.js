'use strict';

// Pruebas aisladas: no utilizan credenciales, red ni una conexión MongoDB.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function crearResolver(documentos = [], categorias = []) {
  const llamadas = [];
  const Libro = {
    distinct: campo => ({ exec: async () => { assert.equal(campo, 'categoria'); return categorias; } }),
    aggregate: pipeline => {
      llamadas.push(pipeline);
      return {
        exec: async () => [{
          registros: documentos,
          totales: documentos.length ? [{ valor: documentos.length }] : []
        }]
      };
    }
  };
  const Ejemplar = { collection: { name: 'ejemplares' } };
  class GraphQLError extends Error { constructor(message, options) { super(message); this.extensions = options?.extensions; } }
  const module = { exports: {} };
  const codigo = fs.readFileSync(path.join(__dirname, '../src/graphql/catalogoResolvers.js'), 'utf8');
  vm.runInNewContext(codigo, {
    module, exports: module.exports,
    require: nombre => {
      if (nombre === 'graphql') return { GraphQLError };
      if (nombre === '../models/Libro') return Libro;
      if (nombre === '../models/Ejemplar') return Ejemplar;
      throw new Error('Importación inesperada: ' + nombre);
    }
  });
  return { resolver: module.exports.Query, llamadas };
}

const libro = {
  _id: '64a000000000000000000001',
  titulo: 'Pedro Páramo', autor: 'Juan Rulfo', categoria: 'Literatura mexicana',
  editorial: null, anio: 1955, isbn: null,
  totalEjemplares: 3, disponibles: 2, prestados: 1, bajas: 0
};

test('el catálogo devuelve datos y total paginado', async () => {
  const { resolver, llamadas } = crearResolver([libro]);
  const r = await resolver.catalogo(null, { pagina: 1, porPagina: 9 });
  assert.equal(r.total, 1);
  assert.equal(r.paginas, 1);
  assert.equal(r.registros[0].id, String(libro._id));
  assert.equal(r.registros[0].disponibles, 2);
  assert.equal(r.registros[0].prestados, 1);
  assert.equal(llamadas[0][1].$lookup.from, 'ejemplares');
});

test('aplica filtro de disponibilidad antes de paginar', async () => {
  const { resolver, llamadas } = crearResolver([libro]);
  await resolver.catalogo(null, { pagina: 1, porPagina: 9, soloDisponibles: true });
  const consulta = llamadas[0];
  assert.ok(consulta.some(etapa => etapa.$match?.disponibles?.$gt === 0));
  assert.ok(consulta.some(etapa => etapa.$facet));
});

test('rechaza tamaños de página incorrectos', async () => {
  const { resolver } = crearResolver();
  await assert.rejects(() => resolver.catalogo(null, { pagina: 0, porPagina: 9 }), /página/);
  await assert.rejects(() => resolver.catalogo(null, { pagina: 1, porPagina: 100 }), /entre 1 y 24/);
});

test('devuelve categorías ordenadas y sin vacíos', async () => {
  const { resolver } = crearResolver([], ['Historia', '', 'Cuentos', 'Literatura']);
  assert.deepEqual(Array.from(await resolver.categoriasCatalogo()), ['Cuentos', 'Historia', 'Literatura']);
});
