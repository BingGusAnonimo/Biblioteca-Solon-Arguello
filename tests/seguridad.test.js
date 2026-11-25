'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { QUERIES_PUBLICAS, mismoToken, protegerResolvers } = require('../src/auth/permisos');
const { randomBytes } = require('node:crypto');
const csrf = randomBytes(24).toString('hex');
const base = {
  Query: {
    estado: () => 'OK',
    catalogo: () => ({ total: 4 }),
    categoriasCatalogo: () => ['Arte'],
    lectores: () => ['Privado'],
    reportesDisponibles: () => ['A01']
  },
  Mutation: { agregarLibro: () => ({ id: '1' }), eliminarLibro: () => true }
};
const protegido = protegerResolvers(base);
const publico = { usuario: null, csrfToken: null, csrfEnviado: '' };
const admin = { usuario: { rol: 'ADMIN' }, csrfToken: csrf, csrfEnviado: csrf };

test('solo se exponen tres consultas sin autenticación', () => {
  assert.deepEqual([...QUERIES_PUBLICAS].sort(), ['catalogo','categoriasCatalogo','estado']);
});
test('catálogo público sin iniciar sesión', () => assert.equal(protegido.Query.catalogo(null, {}, publico).total, 4));
test('lectores no accesibles sin sesión', () => assert.throws(() => protegido.Query.lectores(null, {}, publico), /Inicia sesión/));
test('reportes no accesibles sin sesión', () => assert.throws(() => protegido.Query.reportesDisponibles(null, {}, publico), /Inicia sesión/));
test('mutaciones no accesibles sin sesión', () => assert.throws(() => protegido.Mutation.agregarLibro(null, {}, publico), /cuenta administrativa/));
test('mutaciones requieren token CSRF', () => assert.throws(() => protegido.Mutation.agregarLibro(null, {}, {...admin, csrfEnviado: ''}), /Token de seguridad/));
test('mutaciones aceptadas con sesión y CSRF válido', () => assert.equal(protegido.Mutation.agregarLibro(null, {}, admin).id, '1'));
test('token de diferente longitud se rechaza', () => assert.equal(mismoToken(csrf, csrf.slice(0, 20)), false));
test('token alterado se rechaza', () => assert.equal(mismoToken(csrf, '0'.repeat(48)), false));
test('token correcto se acepta', () => assert.equal(mismoToken(csrf, csrf), true));
