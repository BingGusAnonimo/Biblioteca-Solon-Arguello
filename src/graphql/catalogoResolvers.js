'use strict';

const { GraphQLError } = require('graphql');
const Libro = require('../models/Libro');
const Ejemplar = require('../models/Ejemplar');

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const errorFiltro = (mensaje) => new GraphQLError(mensaje, {
  extensions: { code: 'BAD_USER_INPUT' }
});

const catalogoResolvers = {
  Query: {
    categoriasCatalogo: async () => {
      const valores = await Libro.distinct('categoria').exec();
      return valores
        .filter(v => typeof v === 'string' && v.trim())
        .sort((a, b) => a.localeCompare(b, 'es'));
    },

    catalogo: async (_, args) => {
      const { busqueda, categoria, soloDisponibles = false } = args;
      const pagina = args.pagina ?? 1;
      const porPagina = args.porPagina ?? 12;

      if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100000) {
        throw errorFiltro('La página debe ser un entero positivo');
      }
      if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 24) {
        throw errorFiltro('El tamaño de página debe estar entre 1 y 24');
      }
      if (typeof busqueda === 'string' && busqueda.length > 120) {
        throw errorFiltro('La búsqueda no debe exceder 120 caracteres');
      }
      if (typeof categoria === 'string' && categoria.length > 100) {
        throw errorFiltro('La categoría es demasiado larga');
      }

      const filtro = {};
      if (busqueda?.trim()) {
        const patron = new RegExp(escaparRegex(busqueda.trim()), 'i');
        filtro.$or = [
          { titulo: patron }, { autor: patron },
          { categoria: patron }, { editorial: patron }, { isbn: patron }
        ];
      }
      if (categoria?.trim()) {
        filtro.categoria = new RegExp(`^${escaparRegex(categoria.trim())}$`, 'i');
      }

      // Para cada título, se cuentan las copias por estado usando la colección real de ejemplares.
      const pipeline = [
        { $match: filtro },
        {
          $lookup: {
            from: Ejemplar.collection.name,
            let: { idLibro: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$libro', '$$idLibro'] } } },
              { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
            ],
            as: 'resumenEjemplares'
          }
        },
        {
          $addFields: {
            totalEjemplares: { $sum: '$resumenEjemplares.cantidad' },
            disponibles: {
              $sum: { $map: {
                input: '$resumenEjemplares', as: 'e',
                in: { $cond: [{ $eq: ['$$e._id', 'DISPONIBLE'] }, '$$e.cantidad', 0] }
              } }
            },
            prestados: {
              $sum: { $map: {
                input: '$resumenEjemplares', as: 'e',
                in: { $cond: [{ $eq: ['$$e._id', 'PRESTADO'] }, '$$e.cantidad', 0] }
              } }
            },
            bajas: {
              $sum: { $map: {
                input: '$resumenEjemplares', as: 'e',
                in: { $cond: [{ $eq: ['$$e._id', 'BAJA'] }, '$$e.cantidad', 0] }
              } }
            }
          }
        },
        ...(soloDisponibles ? [{ $match: { disponibles: { $gt: 0 } } }] : []),
        {
          $facet: {
            registros: [
              { $sort: { titulo: 1, _id: 1 } },
              { $skip: (pagina - 1) * porPagina },
              { $limit: porPagina },
              { $project: { resumenEjemplares: 0 } }
            ],
            totales: [{ $count: 'valor' }]
          }
        }
      ];

      const [resultado] = await Libro.aggregate(pipeline).exec();
      const total = resultado?.totales?.[0]?.valor ?? 0;
      return {
        registros: (resultado?.registros || []).map(doc => ({
          id: String(doc._id),
          titulo: doc.titulo,
          autor: doc.autor,
          categoria: doc.categoria,
          editorial: doc.editorial ?? null,
          anio: doc.anio ?? null,
          isbn: doc.isbn ?? null,
          totalEjemplares: doc.totalEjemplares ?? 0,
          disponibles: doc.disponibles ?? 0,
          prestados: doc.prestados ?? 0,
          bajas: doc.bajas ?? 0
        })),
        total,
        pagina,
        porPagina,
        paginas: Math.ceil(total / porPagina)
      };
    }
  }
};

module.exports = catalogoResolvers;
