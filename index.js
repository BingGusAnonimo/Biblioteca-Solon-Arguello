require('dotenv').config();

const path = require('node:path');
const http = require('node:http');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { expressMiddleware } = require('@as-integrations/express5');

const typeDefs = require('./src/graphql/typeDefs');
const resolvers = require('./src/graphql/resolvers');

async function iniciarServidor() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('Falta MONGODB_URI en el archivo .env');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB Atlas conectado correctamente');

    const app = express();
    const httpServer = http.createServer(app);
    const apollo = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
    });
    await apollo.start();

    // Panel y API en el mismo servidor. CORS necesario para Apollo Sandbox.
    app.use('/graphql',
      cors({ origin: ['http://localhost:4000', 'http://127.0.0.1:4000', 'https://studio.apollographql.com'] }),
      express.json({ limit: '1mb' }),
      expressMiddleware(apollo)
    );

    app.use(express.static(path.join(__dirname, 'public')));
    app.get('/', (_req, res) => res.redirect('/admin.html'));

    const port = Number(process.env.PORT) || 4000;
    await new Promise((resolve) => httpServer.listen(port, '127.0.0.1', resolve));

    console.log(`Panel administrativo: http://localhost:${port}/admin.html`);
    console.log(`Apollo Sandbox: http://localhost:${port}/graphql`);
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exitCode = 1;
  }
}

iniciarServidor();
