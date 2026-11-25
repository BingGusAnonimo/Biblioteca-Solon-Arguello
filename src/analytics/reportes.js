'use strict';

// Treinta pipelines de solo lectura. No contienen $out, $merge ni escritura.
// Se ejecutan contra las colecciones existentes del proyecto.
const COPIAS = 'ejemplares';
const LIBROS = 'libros';
const LECTORES = 'lectores';
const PRESTAMOS = 'prestamos';

const unir = (from, localField, foreignField, as) => ({
  $lookup: { from, localField, foreignField, as }
});
const expandir = path => ({ $unwind: `$${path}` });
const top = (orden = { cantidad: -1, _id: 1 }, n = 15) => [
  { $sort: orden }, { $limit: n }
];
const sumaSi = (exp) => ({ $sum: { $cond: [exp, 1, 0] } });
const dividirPorc = (numerador, denominador) => ({
  $round: [{ $multiply: [100, { $cond: [
    { $gt: [denominador, 0] }, { $divide: [numerador, denominador] }, 0
  ] }] }, 2]
});
const diasEntre = (a, b) => ({ $dateDiff: { startDate: a, endDate: b, unit: 'day' } });
const ahora = '$$NOW';
const haceDias = dias => ({ $dateSubtract: { startDate: ahora, unit: 'day', amount: dias } });
const libroEnEjemplar = [unir(LIBROS, 'libro', '_id', 'libroDoc'), expandir('libroDoc')];
const lectorEnPrestamo = [unir(LECTORES, 'lector', '_id', 'lectorDoc'), expandir('lectorDoc')];
const libroEnPrestamo = [
  unir(COPIAS, 'ejemplar', '_id', 'ejemplarDoc'), expandir('ejemplarDoc'),
  unir(LIBROS, 'ejemplarDoc.libro', '_id', 'libroDoc'), expandir('libroDoc')
];
const resumenCopias = [
  unir(COPIAS, '_id', 'libro', 'copias'),
  { $addFields: {
    numCopias: { $size: '$copias' },
    numDisponibles: { $size: { $filter: { input: '$copias', as: 'c', cond: { $eq: ['$$c.estado', 'DISPONIBLE'] } } } },
    numPrestados: { $size: { $filter: { input: '$copias', as: 'c', cond: { $eq: ['$$c.estado', 'PRESTADO'] } } } }
  } }
];

// Cada fila puede incluir: etiqueta, cantidad, auxiliar, porcentaje, promedio, detalle.
// cantidad es el conteo principal, auxiliar otro conteo, promedio una medida temporal.
const definiciones = [
  // A: Libros e inventario (Juan Ángel)
  { codigo: 'A01', campo: 'librosPorCategoria', nombre: 'Títulos y copias por categoría', area: 'LIBROS', modelo: 'Libro', pipeline: [
    ...resumenCopias, { $group: { _id: '$categoria', cantidad: { $sum: 1 }, auxiliar: { $sum: '$numCopias' }, disponibles: { $sum: '$numDisponibles' } } },
    { $addFields: { porcentaje: dividirPorc('$disponibles', '$auxiliar') } }, ...top()
  ] },
  { codigo: 'A02', campo: 'disponibilidadPorCategoria', nombre: 'Disponibilidad real por categoría', area: 'LIBROS', modelo: 'Ejemplar', pipeline: [
    ...libroEnEjemplar, { $group: { _id: '$libroDoc.categoria', cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'DISPONIBLE'] }) } },
    { $addFields: { porcentaje: dividirPorc('$auxiliar', '$cantidad') } }, ...top()
  ] },
  { codigo: 'A03', campo: 'titulosSinEjemplares', nombre: 'Títulos sin copias físicas', area: 'LIBROS', modelo: 'Libro', pipeline: [
    unir(COPIAS, '_id', 'libro', 'copias'), { $match: { copias: { $size: 0 } } },
    { $project: { _id: 0, etiqueta: '$titulo', cantidad: { $literal: 1 }, detalle: '$categoria' } },
    { $sort: { etiqueta: 1 } }, { $limit: 20 }
  ] },
  { codigo: 'A04', campo: 'autoresConMasTitulos', nombre: 'Autores con mayor diversidad bibliográfica', area: 'LIBROS', modelo: 'Libro', pipeline: [
    { $group: { _id: '$autor', cantidad: { $sum: 1 }, categorias: { $addToSet: '$categoria' } } },
    { $addFields: { auxiliar: { $size: '$categorias' } } }, ...top()
  ] },
  { codigo: 'A05', campo: 'editorialesConMasEjemplares', nombre: 'Editoriales con más inventario', area: 'LIBROS', modelo: 'Libro', pipeline: [
    ...resumenCopias, { $group: { _id: { $ifNull: ['$editorial', 'Sin editorial'] }, cantidad: { $sum: '$numCopias' }, auxiliar: { $sum: 1 } } }, ...top()
  ] },
  { codigo: 'A06', campo: 'inventarioPorUbicacion', nombre: 'Estado de copias por estante', area: 'LIBROS', modelo: 'Ejemplar', pipeline: [
    { $group: { _id: { $ifNull: ['$ubicacion', 'Sin ubicación'] }, cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'DISPONIBLE'] }), prestados: sumaSi({ $eq: ['$estado', 'PRESTADO'] }) } },
    { $addFields: { porcentaje: dividirPorc('$auxiliar', '$cantidad') } }, ...top()
  ] },
  { codigo: 'A07', campo: 'titulosConMasCopias', nombre: 'Títulos con más ejemplares', area: 'LIBROS', modelo: 'Ejemplar', pipeline: [
    { $group: { _id: '$libro', cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'DISPONIBLE'] }) } },
    unir(LIBROS, '_id', '_id', 'libroDoc'), expandir('libroDoc'), { $addFields: { etiqueta: '$libroDoc.titulo' } }, ...top()
  ] },
  { codigo: 'A08', campo: 'categoriasSinDisponibilidad', nombre: 'Proporción de títulos agotados por categoría', area: 'LIBROS', modelo: 'Libro', pipeline: [
    ...resumenCopias, { $group: { _id: '$categoria', cantidad: sumaSi({ $eq: ['$numDisponibles', 0] }), auxiliar: { $sum: 1 } } },
    { $addFields: { porcentaje: dividirPorc('$cantidad', '$auxiliar') } }, ...top({ porcentaje: -1, _id: 1 })
  ] },
  { codigo: 'A09', campo: 'publicacionesPorDecada', nombre: 'Distribución de títulos por década', area: 'LIBROS', modelo: 'Libro', pipeline: [
    { $match: { anio: { $type: 'number', $gte: 1000 } } },
    { $addFields: { decada: { $multiply: [10, { $floor: { $divide: ['$anio', 10] } }] } } },
    { $group: { _id: '$decada', cantidad: { $sum: 1 }, categorias: { $addToSet: '$categoria' } } },
    { $addFields: { auxiliar: { $size: '$categorias' } } }, ...top({ _id: -1 }, 20)
  ] },
  { codigo: 'A10', campo: 'faltantesISBNPorCategoria', nombre: 'Calidad de datos: títulos sin ISBN', area: 'LIBROS', modelo: 'Libro', pipeline: [
    { $group: { _id: '$categoria', cantidad: sumaSi({ $in: [{ $ifNull: ['$isbn', ''] }, ['', null]] }), auxiliar: { $sum: 1 } } },
    { $addFields: { porcentaje: dividirPorc('$cantidad', '$auxiliar') } }, ...top({ porcentaje: -1, _id: 1 })
  ] },

  // B: Lectores y actividad (Samuel Aarón)
  { codigo: 'B01', campo: 'lectoresConMasPrestamos', nombre: 'Lectores con más movimientos', area: 'LECTORES', modelo: 'Prestamo', pipeline: [
    { $group: { _id: '$lector', cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'ACTIVO'] }) } },
    unir(LECTORES, '_id', '_id', 'lectorDoc'), expandir('lectorDoc'), { $addFields: { etiqueta: '$lectorDoc.nombre' } }, ...top()
  ] },
  { codigo: 'B02', campo: 'lectoresSinHistorial', nombre: 'Lectores que nunca solicitaron préstamos', area: 'LECTORES', modelo: 'Lector', pipeline: [
    unir(PRESTAMOS, '_id', 'lector', 'prestamosDoc'), { $match: { prestamosDoc: { $size: 0 } } },
    { $project: { _id: 0, etiqueta: '$nombre', cantidad: { $literal: 0 }, detalle: '$codigoLector' } },
    { $sort: { etiqueta: 1 } }, { $limit: 20 }
  ] },
  { codigo: 'B03', campo: 'frecuenciaDeLectores', nombre: 'Frecuencia histórica de uso por lector', area: 'LECTORES', modelo: 'Prestamo', pipeline: [
    { $group: { _id: '$lector', cantidad: { $sum: 1 }, primera: { $min: '$fechaPrestamo' }, ultima: { $max: '$fechaPrestamo' } } },
    unir(LECTORES, '_id', '_id', 'lectorDoc'), expandir('lectorDoc'),
    { $addFields: { etiqueta: '$lectorDoc.nombre', promedio: { $round: [{ $divide: ['$cantidad', { $max: [1, { $divide: [{ $add: [1, diasEntre('$primera', '$ultima')] }, 30] }] }] }, 2] } } },
    ...top()
  ] },
  { codigo: 'B04', campo: 'lectoresConVencidos', nombre: 'Lectores con préstamos vencidos activos', area: 'LECTORES', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'ACTIVO', $expr: { $lt: ['$fechaVencimiento', ahora] } } },
    { $group: { _id: '$lector', cantidad: { $sum: 1 }, promedio: { $avg: diasEntre('$fechaVencimiento', ahora) } } },
    unir(LECTORES, '_id', '_id', 'lectorDoc'), expandir('lectorDoc'),
    { $addFields: { etiqueta: '$lectorDoc.nombre', promedio: { $round: ['$promedio', 2] } } }, ...top()
  ] },
  { codigo: 'B05', campo: 'lectoresPorEstadoYUso', nombre: 'Lectores activos/inactivos con historial', area: 'LECTORES', modelo: 'Lector', pipeline: [
    unir(PRESTAMOS, '_id', 'lector', 'historial'),
    { $group: { _id: { $concat: [{ $cond: ['$activo', 'Activo', 'Inactivo'] }, ' / ', { $cond: [{ $gt: [{ $size: '$historial' }, 0] }, 'Con uso', 'Sin uso'] }] }, cantidad: { $sum: 1 }, auxiliar: { $sum: { $size: '$historial' } } } },
    ...top()
  ] },
  { codigo: 'B06', campo: 'lectoresConDevolucionesTardias', nombre: 'Lectores con más devoluciones fuera de plazo', area: 'LECTORES', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'DEVUELTO', $expr: { $gt: ['$fechaDevolucion', '$fechaVencimiento'] } } },
    { $group: { _id: '$lector', cantidad: { $sum: 1 }, promedio: { $avg: diasEntre('$fechaVencimiento', '$fechaDevolucion') } } },
    unir(LECTORES, '_id', '_id', 'lectorDoc'), expandir('lectorDoc'),
    { $addFields: { etiqueta: '$lectorDoc.nombre', promedio: { $round: ['$promedio', 2] } } }, ...top()
  ] },
  { codigo: 'B07', campo: 'promedioPrestamosPorLector', nombre: 'Promedio de préstamos por estado del lector', area: 'LECTORES', modelo: 'Lector', pipeline: [
    unir(PRESTAMOS, '_id', 'lector', 'movimientos'),
    { $group: { _id: { $cond: ['$activo', 'Activos', 'Inactivos'] }, cantidad: { $sum: 1 }, auxiliar: { $sum: { $size: '$movimientos' } } } },
    { $addFields: { promedio: { $round: [{ $divide: ['$auxiliar', { $max: [1, '$cantidad'] }] }, 2] } } }, ...top()
  ] },
  { codigo: 'B08', campo: 'lectoresRecurrentes90Dias', nombre: 'Lectores con dos o más préstamos recientes', area: 'LECTORES', modelo: 'Prestamo', pipeline: [
    { $match: { $expr: { $gte: ['$fechaPrestamo', haceDias(90)] } } },
    { $group: { _id: '$lector', cantidad: { $sum: 1 } } }, { $match: { cantidad: { $gte: 2 } } },
    unir(LECTORES, '_id', '_id', 'lectorDoc'), expandir('lectorDoc'), { $addFields: { etiqueta: '$lectorDoc.nombre' } }, ...top()
  ] },
  { codigo: 'B09', campo: 'lectoresMulticategoria', nombre: 'Lectores que consultan varias categorías', area: 'LECTORES', modelo: 'Prestamo', pipeline: [
    ...libroEnPrestamo, { $group: { _id: '$lector', categorias: { $addToSet: '$libroDoc.categoria' }, auxiliar: { $sum: 1 } } },
    { $addFields: { cantidad: { $size: '$categorias' } } }, { $match: { cantidad: { $gte: 2 } } },
    unir(LECTORES, '_id', '_id', 'lectorDoc'), expandir('lectorDoc'), { $addFields: { etiqueta: '$lectorDoc.nombre' } }, ...top()
  ] },
  { codigo: 'B10', campo: 'lectoresSinActividad90Dias', nombre: 'Lectores sin movimientos en 90 días', area: 'LECTORES', modelo: 'Lector', pipeline: [
    { $lookup: { from: PRESTAMOS, let: { idLector: '$_id' }, pipeline: [
      { $match: { $expr: { $eq: ['$lector', '$$idLector'] } } },
      { $sort: { fechaPrestamo: -1 } }, { $limit: 1 }
    ], as: 'ultimo' } },
    { $match: { $expr: { $lt: [{ $ifNull: [{ $arrayElemAt: ['$ultimo.fechaPrestamo', 0] }, new Date('1900-01-01T00:00:00Z')] }, haceDias(90)] } } },
    { $project: { _id: 0, etiqueta: '$nombre', cantidad: { $literal: 0 }, detalle: '$codigoLector' } },
    { $sort: { etiqueta: 1 } }, { $limit: 20 }
  ] },

  // C: Préstamos y devoluciones (Sebastián)
  { codigo: 'C01', campo: 'estadoGeneralPrestamos', nombre: 'Distribución de movimientos por estado', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $group: { _id: '$estado', cantidad: { $sum: 1 }, vencidos: sumaSi({ $and: [{ $eq: ['$estado', 'ACTIVO'] }, { $lt: ['$fechaVencimiento', ahora] }] }) } },
    { $addFields: { auxiliar: '$vencidos' } }, ...top()
  ] },
  { codigo: 'C02', campo: 'vencidosPorAntiguedad', nombre: 'Préstamos vencidos por tramos de retraso', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'ACTIVO', $expr: { $lt: ['$fechaVencimiento', ahora] } } },
    { $addFields: { diasAtraso: diasEntre('$fechaVencimiento', ahora) } },
    { $group: { _id: { $switch: { branches: [
      { case: { $lte: ['$diasAtraso', 7] }, then: '0 a 7 días' },
      { case: { $lte: ['$diasAtraso', 30] }, then: '8 a 30 días' }
    ], default: 'Más de 30 días' } }, cantidad: { $sum: 1 }, promedio: { $avg: '$diasAtraso' } } },
    { $addFields: { promedio: { $round: ['$promedio', 2] } } }, ...top()
  ] },
  { codigo: 'C03', campo: 'librosMasPrestados', nombre: 'Títulos con más movimientos de préstamo', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    ...libroEnPrestamo, { $group: { _id: '$libroDoc._id', cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'ACTIVO'] }) } },
    unir(LIBROS, '_id', '_id', 'libroResumen'), expandir('libroResumen'),
    { $addFields: { etiqueta: '$libroResumen.titulo' } }, ...top()
  ] },
  { codigo: 'C04', campo: 'prestamosPorMes', nombre: 'Evolución mensual de préstamos', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $match: { fechaPrestamo: { $type: 'date' } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$fechaPrestamo', timezone: 'America/Mazatlan' } }, cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'DEVUELTO'] }) } },
    ...top({ _id: -1 }, 24)
  ] },
  { codigo: 'C05', campo: 'devolucionesTardiasPorMes', nombre: 'Porcentaje mensual de devoluciones tardías', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'DEVUELTO', fechaDevolucion: { $type: 'date' } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$fechaDevolucion', timezone: 'America/Mazatlan' } }, cantidad: { $sum: 1 }, auxiliar: sumaSi({ $gt: ['$fechaDevolucion', '$fechaVencimiento'] }) } },
    { $addFields: { porcentaje: dividirPorc('$auxiliar', '$cantidad') } }, ...top({ _id: -1 }, 24)
  ] },
  { codigo: 'C06', campo: 'duracionPromedioPorCategoria', nombre: 'Duración de préstamos por categoría', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'DEVUELTO', fechaDevolucion: { $type: 'date' } } }, ...libroEnPrestamo,
    { $group: { _id: '$libroDoc.categoria', cantidad: { $sum: 1 }, promedio: { $avg: diasEntre('$fechaPrestamo', '$fechaDevolucion') } } },
    { $addFields: { promedio: { $round: ['$promedio', 2] } } }, ...top()
  ] },
  { codigo: 'C07', campo: 'retrasoPromedioPorCategoria', nombre: 'Retrasos promedio en devoluciones por categoría', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'DEVUELTO', $expr: { $gt: ['$fechaDevolucion', '$fechaVencimiento'] } } }, ...libroEnPrestamo,
    { $group: { _id: '$libroDoc.categoria', cantidad: { $sum: 1 }, promedio: { $avg: diasEntre('$fechaVencimiento', '$fechaDevolucion') } } },
    { $addFields: { promedio: { $round: ['$promedio', 2] } } }, ...top()
  ] },
  { codigo: 'C08', campo: 'ejemplaresConMasRotacion', nombre: 'Copias físicas con mayor rotación', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $group: { _id: '$ejemplar', cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'ACTIVO'] }) } },
    unir(COPIAS, '_id', '_id', 'ejemplarDoc'), expandir('ejemplarDoc'),
    unir(LIBROS, 'ejemplarDoc.libro', '_id', 'libroDoc'), expandir('libroDoc'),
    { $addFields: { etiqueta: { $concat: ['$ejemplarDoc.codigoInventario', ' — ', '$libroDoc.titulo'] } } }, ...top()
  ] },
  { codigo: 'C09', campo: 'prestamosPorDiaSemana', nombre: 'Distribución de préstamos por día de semana', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $match: { fechaPrestamo: { $type: 'date' } } },
    { $group: { _id: { $isoDayOfWeek: { date: '$fechaPrestamo', timezone: 'America/Mazatlan' } }, cantidad: { $sum: 1 }, auxiliar: sumaSi({ $eq: ['$estado', 'ACTIVO'] }) } },
    { $addFields: { etiqueta: { $arrayElemAt: [['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], { $subtract: ['$_id', 1] }] } } },
    ...top({ _id: 1 }, 7)
  ] },
  { codigo: 'C10', campo: 'categoriasMasPrestadasActualmente', nombre: 'Categorías con mayor demanda activa', area: 'PRESTAMOS', modelo: 'Prestamo', pipeline: [
    { $match: { estado: 'ACTIVO' } }, ...libroEnPrestamo,
    { $group: { _id: '$libroDoc.categoria', cantidad: { $sum: 1 }, lectores: { $addToSet: '$lector' } } },
    { $addFields: { auxiliar: { $size: '$lectores' } } }, ...top()
  ] }
];

module.exports = { definiciones, unir, top };
