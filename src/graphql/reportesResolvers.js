'use strict';

const { definiciones } = require('../analytics/reportes');
const Libro = require('../models/Libro');
const Ejemplar = require('../models/Ejemplar');
const Lector = require('../models/Lector');
const Prestamo = require('../models/Prestamo');

const modelos = { Libro, Ejemplar, Lector, Prestamo };
const transformarFila = fila => ({
  etiqueta: String(fila.etiqueta ?? fila._id ?? 'Sin información'),
  cantidad: Math.trunc(Number(fila.cantidad ?? 0)),
  auxiliar: fila.auxiliar == null ? null : Math.trunc(Number(fila.auxiliar)),
  porcentaje: fila.porcentaje == null ? null : Number(fila.porcentaje),
  promedio: fila.promedio == null ? null : Number(fila.promedio),
  detalle: fila.detalle == null ? null : String(fila.detalle)
});

const Query = {
  reportesDisponibles: () => definiciones.map(({ codigo, campo, nombre, area }) => ({
    codigo, campo, nombre, area
  }))
};

for (const definicion of definiciones) {
  Query[definicion.campo] = async () => {
    // Una ejecución nueva por solicitud: las consultas de Mongoose no se reutilizan.
    const filas = await modelos[definicion.modelo].aggregate(definicion.pipeline).exec();
    return filas.map(transformarFila);
  };
}

module.exports = { Query };
