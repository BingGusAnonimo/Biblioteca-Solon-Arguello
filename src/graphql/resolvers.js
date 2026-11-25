
const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');
const Libro = require('../models/Libro');

// Validar identificadores de MongoDB
const validarId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new GraphQLError('El ID del libro no es válido', {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
};

// Evitar que los caracteres especiales alteren la búsqueda
const escaparRegex = (texto) => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const resolvers = {
  Query: {
    estado: () => {
      return 'Servidor GraphQL conectado a MongoDB Atlas';
    },

    libros: async (_, { busqueda, categoria, limite }) => {
      const filtro = {};

      if (busqueda && busqueda.trim()) {
        const patron = new RegExp(
          escaparRegex(busqueda.trim()),
          'i'
        );

        filtro.$or = [
          { titulo: patron },
          { autor: patron },
          { editorial: patron },
          { isbn: patron }
        ];
      }

      if (categoria && categoria.trim()) {
        filtro.categoria = new RegExp(
          `^${escaparRegex(categoria.trim())}$`,
          'i'
        );
      }

      const cantidad = Math.max(
        1,
        Math.min(limite ?? 50, 100)
      );

      return await Libro.find(filtro)
        .sort({ titulo: 1 })
        .limit(cantidad);
    },

    libro: async (_, { id }) => {
      validarId(id);
      return await Libro.findById(id);
    },

    totalLibros: async () => {
      return await Libro.countDocuments();
    }
  },

  Mutation: {
    agregarLibro: async (_, datos) => {
      return await Libro.create(datos);
    },

    actualizarLibro: async (_, { id, datos }) => {
      validarId(id);

      return await Libro.findByIdAndUpdate(
        id,
        { $set: datos },
        {
          new: true,
          runValidators: true
        }
      );
    },

    eliminarLibro: async (_, { id }) => {
      validarId(id);

      const eliminado = await Libro.findByIdAndDelete(id);

      return eliminado !== null;
    }
  }
};

module.exports = resolvers;
