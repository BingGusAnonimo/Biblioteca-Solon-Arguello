const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');

const Libro = require('../models/Libro');
const Ejemplar = require('../models/Ejemplar');
const Lector = require('../models/Lector');
const Prestamo = require('../models/Prestamo');

const errorUsuario = (mensaje) => new GraphQLError(mensaje, {
  extensions: { code: 'BAD_USER_INPUT' }
});

const validarId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) throw errorUsuario('El ID no es válido');
};

// Conserva los detalles de validación útiles sin exponer el stack interno de MongoDB.
const errorDatos = (error) => {
  if (error instanceof GraphQLError) return error;
  if (error.code === 11000) {
    const campo = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'identificador';
    return errorUsuario(`Ya existe un registro con el mismo ${campo}`);
  }
  if (error.name === 'ValidationError') {
    const mensajes = Object.values(error.errors || {}).map(e => e.message);
    return errorUsuario(mensajes.join(' · ') || 'Hay campos no válidos');
  }
  if (error.name === 'CastError') return errorUsuario('Uno de los valores tiene un formato incorrecto');
  return error;
};

const ejecutarCambio = async (operacion) => {
  try {
    return await operacion();
  } catch (error) {
    throw errorDatos(error);
  }
};

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const poblarPrestamo = (consulta) => consulta
  .populate('lector')
  .populate({ path: 'ejemplar', populate: { path: 'libro' } });

const convertirFecha = (valor) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw errorUsuario('Usa el formato de fecha YYYY-MM-DD');
  }
  const fecha = new Date(`${valor}T23:59:59.999Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    throw errorUsuario('La fecha no es válida');
  }
  if (fecha <= new Date()) {
    throw errorUsuario('La fecha de vencimiento debe ser futura');
  }
  return fecha;
};

const resolvers = {
  Query: {
    estado: () => 'Servidor GraphQL conectado a MongoDB Atlas',

    libros: async (_, { busqueda, categoria, limite }) => {
      const filtro = {};
      if (busqueda?.trim()) {
        const patron = new RegExp(escaparRegex(busqueda.trim()), 'i');
        filtro.$or = [
          { titulo: patron }, { autor: patron },
          { editorial: patron }, { isbn: patron }
        ];
      }
      if (categoria?.trim()) {
        filtro.categoria = new RegExp(`^${escaparRegex(categoria.trim())}$`, 'i');
      }
      const cantidad = Math.max(1, Math.min(limite ?? 50, 100));
      return await Libro.find(filtro).sort({ titulo: 1 }).limit(cantidad).exec();
    },

    libro: async (_, { id }) => {
      validarId(id);
      return await Libro.findById(id).exec();
    },
    totalLibros: async () => await Libro.countDocuments().exec(),

    ejemplares: async (_, { libroId, estado }) => {
      const filtro = {};
      if (libroId) { validarId(libroId); filtro.libro = libroId; }
      if (estado) filtro.estado = estado;
      return await Ejemplar.find(filtro)
        .populate('libro').sort({ codigoInventario: 1 }).limit(100).exec();
    },

    ejemplar: async (_, { id }) => {
      validarId(id);
      return await Ejemplar.findById(id).populate('libro').exec();
    },
    totalEjemplares: async () => await Ejemplar.countDocuments().exec(),

    lectores: async (_, { busqueda, limite }) => {
      const filtro = {};
      if (busqueda?.trim()) {
        const patron = new RegExp(escaparRegex(busqueda.trim()), 'i');
        filtro.$or = [
          { codigoLector: patron }, { nombre: patron }, { correo: patron }
        ];
      }
      const cantidad = Math.max(1, Math.min(limite ?? 50, 100));
      return await Lector.find(filtro).sort({ nombre: 1 }).limit(cantidad).exec();
    },

    lector: async (_, { id }) => {
      validarId(id);
      return await Lector.findById(id).exec();
    },
    totalLectores: async () => await Lector.countDocuments().exec(),

    prestamos: async (_, { estado }) => {
      const filtro = {};
      if (estado) filtro.estado = estado;
      return await poblarPrestamo(
        Prestamo.find(filtro).sort({ fechaPrestamo: -1 }).limit(100)
      ).exec();
    },
    prestamo: async (_, { id }) => {
      validarId(id);
      return await poblarPrestamo(Prestamo.findById(id)).exec();
    },
    totalPrestamos: async () => await Prestamo.countDocuments().exec()
  },

  Mutation: {
    agregarLibro: (_, datos) => ejecutarCambio(() => Libro.create(datos)),

    actualizarLibro: (_, { id, datos }) => ejecutarCambio(async () => {
      validarId(id);
      return await Libro.findByIdAndUpdate(id, { $set: datos }, {
        new: true, runValidators: true
      }).exec();
    }),

    eliminarLibro: (_, { id }) => ejecutarCambio(async () => {
      validarId(id);
      if (await Ejemplar.exists({ libro: id }).exec()) {
        throw errorUsuario('No puedes eliminar un libro que tiene ejemplares');
      }
      return (await Libro.findByIdAndDelete(id).exec()) !== null;
    }),

    agregarEjemplar: (_, { libroId, codigoInventario, ubicacion }) => ejecutarCambio(async () => {
      validarId(libroId);
      if (!await Libro.exists({ _id: libroId }).exec()) {
        throw errorUsuario('El libro no existe');
      }
      const ejemplar = await Ejemplar.create({
        libro: libroId, codigoInventario, ubicacion, estado: 'DISPONIBLE'
      });
      return await ejemplar.populate('libro');
    }),

    actualizarEjemplar: (_, { id, datos }) => ejecutarCambio(async () => {
      validarId(id);
      return await Ejemplar.findByIdAndUpdate(id, { $set: datos }, {
        new: true, runValidators: true
      }).populate('libro').exec();
    }),

    eliminarEjemplar: (_, { id }) => ejecutarCambio(async () => {
      validarId(id);
      if (await Prestamo.exists({ ejemplar: id }).exec()) {
        throw errorUsuario('No puedes eliminar un ejemplar con historial de préstamos');
      }
      return (await Ejemplar.findByIdAndDelete(id).exec()) !== null;
    }),

    agregarLector: (_, { codigoLector, nombre, correo, telefono }) => ejecutarCambio(
      () => Lector.create({ codigoLector, nombre, correo, telefono, activo: true })
    ),

    actualizarLector: (_, { id, datos }) => ejecutarCambio(async () => {
      validarId(id);
      return await Lector.findByIdAndUpdate(id, { $set: datos }, {
        new: true, runValidators: true
      }).exec();
    }),

    eliminarLector: (_, { id }) => ejecutarCambio(async () => {
      validarId(id);
      if (await Prestamo.exists({ lector: id }).exec()) {
        throw errorUsuario('No puedes eliminar un lector con historial de préstamos');
      }
      return (await Lector.findByIdAndDelete(id).exec()) !== null;
    }),

    registrarPrestamo: (_, { lectorId, ejemplarId, fechaVencimiento }) => ejecutarCambio(async () => {
      validarId(lectorId);
      validarId(ejemplarId);
      const vencimiento = convertirFecha(fechaVencimiento);
      let prestamoId;

      await mongoose.connection.transaction(async (session) => {
        const lector = await Lector.findOne({ _id: lectorId, activo: true })
          .session(session).exec();
        if (!lector) throw errorUsuario('El lector no existe o está inactivo');

        const ejemplar = await Ejemplar.findOneAndUpdate(
          { _id: ejemplarId, estado: 'DISPONIBLE' },
          { $set: { estado: 'PRESTADO' } },
          { new: true, session }
        ).exec();
        if (!ejemplar) throw errorUsuario('El ejemplar no está disponible');

        const nuevos = await Prestamo.create([{
          lector: lectorId, ejemplar: ejemplarId,
          fechaPrestamo: new Date(), fechaVencimiento: vencimiento, estado: 'ACTIVO'
        }], { session });
        prestamoId = nuevos[0]._id;
      });

      return await poblarPrestamo(Prestamo.findById(prestamoId)).exec();
    }),

    registrarDevolucion: (_, { prestamoId }) => ejecutarCambio(async () => {
      validarId(prestamoId);
      await mongoose.connection.transaction(async (session) => {
        const prestamo = await Prestamo.findOneAndUpdate(
          { _id: prestamoId, estado: 'ACTIVO' },
          { $set: { estado: 'DEVUELTO', fechaDevolucion: new Date() } },
          { new: true, session }
        ).exec();
        if (!prestamo) throw errorUsuario('El préstamo no existe o ya fue devuelto');

        const ejemplar = await Ejemplar.findOneAndUpdate(
          { _id: prestamo.ejemplar, estado: 'PRESTADO' },
          { $set: { estado: 'DISPONIBLE' } },
          { new: true, session }
        ).exec();
        if (!ejemplar) throw errorUsuario('El ejemplar no tiene el estado esperado');
      });
      return await poblarPrestamo(Prestamo.findById(prestamoId)).exec();
    })
  },

  Prestamo: {
    fechaPrestamo: p => p.fechaPrestamo.toISOString(),
    fechaVencimiento: p => p.fechaVencimiento.toISOString(),
    fechaDevolucion: p => p.fechaDevolucion ? p.fechaDevolucion.toISOString() : null
  }
};

module.exports = resolvers;
