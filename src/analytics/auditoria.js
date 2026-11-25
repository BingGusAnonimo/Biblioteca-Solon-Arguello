'use strict';

// Solo lectura. Consulta referencias cruzadas y coherencia básica del ciclo de préstamos.
const lookup = (from, localField, foreignField, as) => ({
  $lookup: { from, localField, foreignField, as }
});
const sin = campo => ({ [campo]: { $size: 0 } });

const reglas = [
  { codigo: 'D01', descripcion: 'Ejemplares cuyo libro no existe', modelo: 'Ejemplar', pipeline: [
    lookup('libros', 'libro', '_id', 'rel'), { $match: sin('rel') }
  ] },
  { codigo: 'D02', descripcion: 'Préstamos cuyo lector no existe', modelo: 'Prestamo', pipeline: [
    lookup('lectores', 'lector', '_id', 'rel'), { $match: sin('rel') }
  ] },
  { codigo: 'D03', descripcion: 'Préstamos cuyo ejemplar no existe', modelo: 'Prestamo', pipeline: [
    lookup('ejemplares', 'ejemplar', '_id', 'rel'), { $match: sin('rel') }
  ] },
  { codigo: 'D04', descripcion: 'Ejemplares PRESTADO sin préstamo ACTIVO', modelo: 'Ejemplar', pipeline: [
    { $match: { estado: 'PRESTADO' } },
    { $lookup: { from: 'prestamos', let: { idEjemplar: '$_id' }, pipeline: [
      { $match: { estado: 'ACTIVO', $expr: { $eq: ['$ejemplar', '$$idEjemplar'] } } },
      { $limit: 1 }
    ], as: 'rel' } }, { $match: sin('rel') }
  ] },
  { codigo: 'D05', descripcion: 'Préstamos ACTIVO cuyo ejemplar no está PRESTADO', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'ACTIVO' } },
    lookup('ejemplares', 'ejemplar', '_id', 'rel'),
    { $match: { 'rel.0.estado': { $ne: 'PRESTADO' } } }
  ] },
  { codigo: 'D06', descripcion: 'Ejemplares con dos o más préstamos ACTIVO', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'ACTIVO' } },
    { $group: { _id: '$ejemplar', total: { $sum: 1 } } },
    { $match: { total: { $gt: 1 } } }
  ] },
  { codigo: 'D07', descripcion: 'Préstamos DEVUELTO sin fecha de devolución', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'DEVUELTO', fechaDevolucion: null } }
  ] },
  { codigo: 'D08', descripcion: 'Préstamos ACTIVO con fecha de devolución', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'ACTIVO', fechaDevolucion: { $ne: null } } }
  ] },
  { codigo: 'D09', descripcion: 'Devoluciones anteriores a la fecha de préstamo', modelo: 'Prestamo', pipeline: [
    { $match: { fechaDevolucion: { $type: 'date' }, $expr: { $lt: ['$fechaDevolucion', '$fechaPrestamo'] } } }
  ] },
  { codigo: 'D10', descripcion: 'Vencimientos anteriores a la fecha del préstamo', modelo: 'Prestamo', pipeline: [
    { $match: { fechaVencimiento: { $type: 'date' }, $expr: { $lt: ['$fechaVencimiento', '$fechaPrestamo'] } } }
  ] },
  { codigo: 'D11', descripcion: 'Códigos de inventario duplicados', modelo: 'Ejemplar', pipeline: [
    { $group: { _id: '$codigoInventario', total: { $sum: 1 } } }, { $match: { total: { $gt: 1 } } }
  ] },
  { codigo: 'D12', descripcion: 'Códigos de lector duplicados', modelo: 'Lector', pipeline: [
    { $group: { _id: '$codigoLector', total: { $sum: 1 } } }, { $match: { total: { $gt: 1 } } }
  ] }
];

module.exports = { reglas };
