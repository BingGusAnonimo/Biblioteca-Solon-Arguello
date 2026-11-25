
const typeDefs = `#graphql

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
    estado: EstadoEjemplar
    ubicacion: String
  }

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
  }

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
  }
`;

module.exports = typeDefs;
