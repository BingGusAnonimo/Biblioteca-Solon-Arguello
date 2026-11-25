// Se agrega al esquema existente sin modificar los CRUD del panel administrativo.
module.exports = `#graphql
  type FichaCatalogo {
    id: ID!
    titulo: String!
    autor: String!
    categoria: String!
    editorial: String
    anio: Int
    isbn: String
    totalEjemplares: Int!
    disponibles: Int!
    prestados: Int!
    bajas: Int!
  }

  type PaginaCatalogo {
    registros: [FichaCatalogo!]!
    total: Int!
    pagina: Int!
    porPagina: Int!
    paginas: Int!
  }

  extend type Query {
    catalogo(
      busqueda: String
      categoria: String
      soloDisponibles: Boolean = false
      pagina: Int = 1
      porPagina: Int = 12
    ): PaginaCatalogo!
    categoriasCatalogo: [String!]!
  }
`;
