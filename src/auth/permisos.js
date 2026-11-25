'use strict';

const { GraphQLError } = require('graphql');

// El catálogo público consulta títulos y disponibilidad; todo lo demás
// requiere una sesión administrativa válida.
const QUERIES_PUBLICAS = new Set(['estado', 'catalogo', 'categoriasCatalogo']);

function mismoToken(a, b) {
  const crypto = require('node:crypto');
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!/^[0-9a-f]{48}$/.test(a) || !/^[0-9a-f]{48}$/.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function protegerResolvers(resolvers) {
  const queries = {};
  for (const [campo, resolver] of Object.entries(resolvers.Query || {})) {
    queries[campo] = (padre, args, contexto, info) => {
      if (!QUERIES_PUBLICAS.has(campo) && contexto?.usuario?.rol !== 'ADMIN') {
        throw new GraphQLError('Inicia sesión para consultar información administrativa.', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      return resolver(padre, args, contexto, info);
    };
  }

  const mutations = {};
  for (const [campo, resolver] of Object.entries(resolvers.Mutation || {})) {
    mutations[campo] = (padre, args, contexto, info) => {
      if (contexto?.usuario?.rol !== 'ADMIN') {
        throw new GraphQLError('Se requiere una cuenta administrativa.', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      if (!mismoToken(contexto.csrfToken, contexto.csrfEnviado)) {
        throw new GraphQLError('Token de seguridad inválido. Recarga el panel.', {
          extensions: { code: 'FORBIDDEN' }
        });
      }
      return resolver(padre, args, contexto, info);
    };
  }

  return { ...resolvers, Query: queries, Mutation: mutations };
}

module.exports = { QUERIES_PUBLICAS, mismoToken, protegerResolvers };
