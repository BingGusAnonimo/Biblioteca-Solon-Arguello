'use strict';

const { definiciones } = require('../analytics/reportes');

// Se suma al esquema original: no cambia Queries ni Mutations existentes.
module.exports = `#graphql
  type FilaReporte {
    etiqueta: String!
    cantidad: Int!
    auxiliar: Int
    porcentaje: Float
    promedio: Float
    detalle: String
  }

  type DescripcionReporte {
    codigo: String!
    campo: String!
    nombre: String!
    area: String!
  }

  extend type Query {
    reportesDisponibles: [DescripcionReporte!]!
    ${definiciones.map(r => `${r.campo}: [FilaReporte!]!`).join('\n    ')}
  }
`;
