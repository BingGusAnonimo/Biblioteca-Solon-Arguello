'use strict';

const crypto = require('node:crypto');

const OBJETIVO = 1000;
const BASE_DEMO = 'biblioteca_solon_demo';
const TIPOS = ['libros', 'ejemplares', 'lectores', 'prestamos'];

const rellenar = (numero) => String(numero).padStart(4, '0');

function idFicticio(tipo, numero) {
  if (!TIPOS.includes(tipo)) throw new Error(`Tipo desconocido: ${tipo}`);
  if (!Number.isInteger(numero) || numero < 1 || numero > OBJETIVO) {
    throw new Error('El número de registro debe estar entre 1 y 1000');
  }
  // Cadena hexadecimal compatible con ObjectId y estable entre ejecuciones.
  return crypto.createHash('sha256')
    .update(`BIBLIOTECA_SOLON_DEMO_V1:${tipo}:${rellenar(numero)}`)
    .digest('hex')
    .slice(0, 24);
}

function registroLibro(numero) {
  const inicios = [
    'Historias de la sierra', 'Rutas de la memoria',
    'Cartas del océano', 'El jardín de los sueños',
    'Voces de la ciudad', 'Crónicas del bosque',
    'La isla de las ideas', 'Viaje entre palabras',
    'Los secretos del tiempo', 'La casa del conocimiento'
  ];
  const categorias = [
    'Narrativa', 'Ciencia', 'Historia', 'Tecnología', 'Poesía',
    'Educación', 'Arte', 'Infantil', 'Geografía', 'Filosofía'
  ];
  const editoriales = ['Editorial Demo Norte', 'Ediciones Demo Nayarit', 'Editorial Ejemplo'];
  return {
    titulo: `[DEMO] ${inicios[(numero - 1) % inicios.length]} ${rellenar(numero)}`,
    autor: `Autor ficticio ${rellenar((numero % 250) + 1)}`,
    categoria: categorias[(numero - 1) % categorias.length],
    editorial: editoriales[(numero - 1) % editoriales.length],
    anio: 1985 + (numero % 40)
  };
}

function registroLector(numero) {
  return {
    codigoLector: `DEMO-LEC-${rellenar(numero)}`,
    nombre: `Lector ficticio ${rellenar(numero)}`,
    correo: `lector.demo.${rellenar(numero)}@example.com`,
    telefono: '3110000000',
    activo: true
  };
}

function registroEjemplar(numero, idLibro) {
  return {
    libro: idLibro,
    codigoInventario: `DEMO-EJ-${rellenar(numero)}`,
    estado: 'DISPONIBLE',
    ubicacion: `Sala Demo - Estante ${1 + ((numero - 1) % 25)}`
  };
}

const DIAS = 24 * 60 * 60 * 1000;
function registroPrestamo(numero, lectorId, ejemplarId, activo, ahora = new Date()) {
  const fechaActual = ahora.getTime();
  // Las devoluciones son históricas; los préstamos activos pueden estar vencidos.
  const antiguedad = activo ? 5 + (numero % 35) : 70 + (numero % 280);
  const fechaPrestamo = new Date(fechaActual - antiguedad * DIAS);
  const fechaVencimiento = new Date(fechaPrestamo.getTime() + 14 * DIAS);
  const fechaDevolucion = activo
    ? null
    : new Date(fechaPrestamo.getTime() + (5 + (numero % 18)) * DIAS);
  return {
    lector: lectorId,
    ejemplar: ejemplarId,
    fechaPrestamo,
    fechaVencimiento,
    fechaDevolucion,
    estado: activo ? 'ACTIVO' : 'DEVUELTO'
  };
}

function indicesFaltantes(tipo, existentes, cantidad) {
  const indices = [];
  for (let i = 1; i <= OBJETIVO && indices.length < cantidad; i++) {
    if (!existentes.has(idFicticio(tipo, i))) indices.push(i);
  }
  return indices;
}

module.exports = {
  OBJETIVO, BASE_DEMO, TIPOS, idFicticio, rellenar,
  registroLibro, registroLector, registroEjemplar,
  registroPrestamo, indicesFaltantes
};
