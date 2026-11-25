require('dotenv').config();

const mongoose = require('mongoose');

const { ApolloServer } = require('@apollo/server');
const {
  startStandaloneServer
} = require('@apollo/server/standalone');

const typeDefs = require('./src/graphql/typeDefs');
const resolvers = require('./src/graphql/resolvers');

const iniciarServidor = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'Falta MONGODB_URI en el archivo .env'
      );
    }

    // Conexión a MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log('MongoDB Atlas conectado correctamente');

    // Servidor GraphQL
    const server = new ApolloServer({
      typeDefs,
      resolvers
    });

    const { url } = await startStandaloneServer(server, {
      listen: {
        port: Number(process.env.PORT) || 4000
      }
    });

    console.log(`Apollo Sandbox listo en: ${url}`);

  } catch (error) {
    console.error(
      'Error al iniciar el servidor:',
      error.message
    );

    process.exit(1);
  }
};

iniciarServidor();
