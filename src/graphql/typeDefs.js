
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

  type Query {
    estado: String!

    libros(
      busqueda: String
      categoria: String
      limite: Int = 50
    ): [Libro!]!

    libro(id: ID!): Libro

    totalLibros: Int!
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
  }

`;

module.exports = typeDefs;
