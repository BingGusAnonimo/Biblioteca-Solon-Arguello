
const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const Libro = require('../models/Libro');
const Ejemplar = require('../models/Ejemplar');

// Validar identificadores de MongoDB
const validarId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new GraphQLError('El ID no es válido', {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }
};

// Evitar problemas con caracteres especiales en búsquedas
const escaparRegex = (texto) => {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const resolvers = {

  // =====================================
  // QUERIES
  // =====================================
  Query: {

    estado: () => {
      return 'Servidor GraphQL conectado a MongoDB Atlas';
    },

    // Consultar libros
    libros: async (_, { busqueda, categoria, limite }) => {
      const filtro = {};

      if (busqueda?.trim()) {
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

      if (categoria?.trim()) {
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
        .limit(cantidad)
        .exec();
    },

    // Buscar libro por ID
    libro: async (_, { id }) => {
      validarId(id);

      return await Libro.findById(id).exec();
    },

    // Contar libros
    totalLibros: async () => {
      return await Libro.countDocuments().exec();
    },

    // Consultar ejemplares
    ejemplares: async (_, { libroId, estado }) => {
      const filtro = {};

      if (libroId) {
        validarId(libroId);
        filtro.libro = libroId;
      }

      if (estado) {
        filtro.estado = estado;
      }

      return await Ejemplar.find(filtro)
        .populate('libro')
        .sort({ codigoInventario: 1 })
        .limit(100)
        .exec();
    },

    // Buscar ejemplar por ID
    ejemplar: async (_, { id }) => {
      validarId(id);

      return await Ejemplar.findById(id)
        .populate('libro')
        .exec();
    },

    // Contar ejemplares
    totalEjemplares: async () => {
      return await Ejemplar.countDocuments().exec();
    }
  },

  // =====================================
  // MUTATIONS
  // =====================================
  Mutation: {

    // Registrar libro
    agregarLibro: async (_, datos) => {
      return await Libro.create(datos);
    },

    // Actualizar libro existente
    actualizarLibro: async (_, { id, datos }) => {
      validarId(id);

      return await Libro.findByIdAndUpdate(
        id,
        { $set: datos },
        {
          new: true,
          runValidators: true
        }
      ).exec();
    },

    // Eliminar libro
    eliminarLibro: async (_, { id }) => {
      validarId(id);

      const relacionados = await Ejemplar.exists({
        libro: id
      }).exec();

      if (relacionados) {
        throw new GraphQLError(
          'No puedes eliminar un libro que tiene ejemplares'
        );
      }

      const resultado = await Libro.findByIdAndDelete(id)
        .exec();

      return resultado !== null;
    },

    // Registrar ejemplar
    agregarEjemplar: async (_, {
      libroId,
      codigoInventario,
      ubicacion
    }) => {
      validarId(libroId);

      const libro = await Libro.findById(libroId).exec();

      if (!libro) {
        throw new GraphQLError('El libro no existe');
      }

      try {
        const ejemplar = await Ejemplar.create({
          libro: libroId,
          codigoInventario,
          ubicacion,
          estado: 'DISPONIBLE'
        });

        await ejemplar.populate('libro');

        return ejemplar;

      } catch (error) {
        if (error.code === 11000) {
          throw new GraphQLError(
            'Ya existe ese código de inventario'
          );
        }

        throw error;
      }
    },

    // Actualizar ejemplar existente
    actualizarEjemplar: async (_, { id, datos }) => {
      validarId(id);

      const ejemplar = await Ejemplar.findByIdAndUpdate(
        id,
        { $set: datos },
        {
          new: true,
          runValidators: true
        }
      ).exec();

      if (!ejemplar) {
        return null;
      }

      await ejemplar.populate('libro');

      return ejemplar;
    },

    // Eliminar ejemplar
    eliminarEjemplar: async (_, { id }) => {
      validarId(id);

      const resultado = await Ejemplar.findByIdAndDelete(id)
        .exec();

      return resultado !== null;
    }
  }
};

module.exports = resolvers;
