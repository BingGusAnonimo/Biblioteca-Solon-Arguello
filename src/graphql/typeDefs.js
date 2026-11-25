const typeDefs = `#graphql

  # LIBROS

  type Libro {
    id: ID!
    titulo: String!
    autor: String!
    categoria: String!
    editorial: String
    anio: Int
    isbn: String
  }

  input ActualizarLibroInput {
    titulo: String
    autor: String
    categoria: String
    editorial: String
    anio: Int
    isbn: String
  }

  # EJEMPLARES

  enum EstadoEjemplar {
    DISPONIBLE
    PRESTADO
    BAJA
  }

  type Ejemplar {
    id: ID!
    libro: Libro!
    codigoInventario: String!
    estado: EstadoEjemplar!
    ubicacion: String
  }

  input ActualizarEjemplarInput {
    ubicacion: String
  }

  # LECTORES

  type Lector {
    id: ID!
    codigoLector: String!
    nombre: String!
    correo: String
    telefono: String
    activo: Boolean!
  }

  input ActualizarLectorInput {
    nombre: String
    correo: String
    telefono: String
    activo: Boolean
  }

  # PRESTAMOS

  enum EstadoPrestamo {
    ACTIVO
    DEVUELTO
  }

  type Prestamo {
    id: ID!
    lector: Lector!
    ejemplar: Ejemplar!
    fechaPrestamo: String!
    fechaVencimiento: String!
    fechaDevolucion: String
    estado: EstadoPrestamo!
  }

  # QUERIES

  type Query {
    estado: String!

    libros(
      busqueda: String
      categoria: String
      limite: Int = 50
    ): [Libro!]!

    libro(id: ID!): Libro
    totalLibros: Int!

    ejemplares(
      libroId: ID
      estado: EstadoEjemplar
    ): [Ejemplar!]!

    ejemplar(id: ID!): Ejemplar
    totalEjemplares: Int!

    lectores(
      busqueda: String
      limite: Int = 50
    ): [Lector!]!

    lector(id: ID!): Lector
    totalLectores: Int!

    prestamos(
      estado: EstadoPrestamo
    ): [Prestamo!]!

    prestamo(id: ID!): Prestamo
    totalPrestamos: Int!
  }

  # MUTATIONS

  type Mutation {
    agregarLibro(
      titulo: String!
      autor: String!
      categoria: String!
      editorial: String
      anio: Int
      isbn: String
    ): Libro!

    actualizarLibro(
      id: ID!
      datos: ActualizarLibroInput!
    ): Libro

    eliminarLibro(id: ID!): Boolean!

    agregarEjemplar(
      libroId: ID!
      codigoInventario: String!
      ubicacion: String
    ): Ejemplar!

    actualizarEjemplar(
      id: ID!
      datos: ActualizarEjemplarInput!
    ): Ejemplar

    eliminarEjemplar(id: ID!): Boolean!

    agregarLector(
      codigoLector: String!
      nombre: String!
      correo: String
      telefono: String
    ): Lector!

    actualizarLector(
      id: ID!
      datos: ActualizarLectorInput!
    ): Lector

    eliminarLector(id: ID!): Boolean!

    registrarPrestamo(
      lectorId: ID!
      ejemplarId: ID!
      fechaVencimiento: String!
    ): Prestamo!

    registrarDevolucion(
      prestamoId: ID!
    ): Prestamo!
  }
`;

module.exports = typeDefs;