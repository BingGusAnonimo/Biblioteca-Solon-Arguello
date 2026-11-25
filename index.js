'use strict';
require('dotenv').config();

const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const MongoStoreImport = require('connect-mongo');
const MongoStore = MongoStoreImport.MongoStore || MongoStoreImport.default || MongoStoreImport;
const { ApolloServer } = require('@apollo/server');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { expressMiddleware } = require('@as-integrations/express5');

const typeDefs = require('./src/graphql/typeDefs');
const resolvers = require('./src/graphql/resolvers');
const catalogoTypeDefs = require('./src/graphql/catalogoTypeDefs');
const catalogoResolvers = require('./src/graphql/catalogoResolvers');
const reportesTypeDefs = require('./src/graphql/reportesTypeDefs');
const reportesResolvers = require('./src/graphql/reportesResolvers');
const UsuarioAdmin = require('./src/models/UsuarioAdmin');
const { protegerResolvers, mismoToken } = require('./src/auth/permisos');

const PAGINAS_PRIVADAS = new Set([
  '/admin.html', '/libros.html', '/ejemplares.html',
  '/lectores.html', '/prestamos.html', '/reportes.html'
]);
const COOKIE = 'solon.sid';
const cookieSecure = process.env.NODE_ENV === 'production';

function requireAdmin(req, res, next) {
  if (req.session?.usuario?.rol === 'ADMIN') return next();
  res.set('Cache-Control', 'no-store');
  return res.redirect(303, `/login.html?next=${encodeURIComponent(req.path)}`);
}

function mismoOrigen(req, res, next) {
  const origen = req.get('origin');
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Origen no permitido' });
  if (origen) {
    try {
      const url = new URL(origen);
      if (url.host !== req.get('host') || !['http:', 'https:'].includes(url.protocol)) {
        return res.status(403).json({ error: 'Origen no permitido' });
      }
    } catch (_) { return res.status(403).json({ error: 'Origen no permitido' }); }
  }
  next();
}

async function iniciarServidor() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en .env');
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 64) {
      throw new Error('Falta SESSION_SECRET seguro. Ejecuta: node scripts/generar-secret.js');
    }

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB Atlas conectado correctamente');
    const app = express();
    app.disable('x-powered-by');
    const httpServer = http.createServer(app);

    app.use(session({
      name: COOKIE,
      secret: process.env.SESSION_SECRET,
      store: MongoStore.create({ client: mongoose.connection.getClient(), collectionName: 'sesiones_admin', ttl: 8 * 60 * 60, touchAfter: 60 }),
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'strict', secure: cookieSecure, maxAge: 8 * 60 * 60 * 1000, path: '/' }
    }));

    const loginLimit = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 8,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' }
    });

    const hashFalso = await bcrypt.hash('un-usuario-inexistente-no-debe-autenticarse', 12);

    app.get('/api/auth/me', (req, res) => {
      res.set('Cache-Control', 'no-store');
      const usuario = req.session?.usuario;
      if (!usuario || usuario.rol !== 'ADMIN') return res.json({ autenticado: false });
      return res.json({ autenticado: true, usuario: { nombre: usuario.nombre, rol: usuario.rol }, csrfToken: req.session.csrfToken });
    });

    app.post('/api/auth/login', mismoOrigen, loginLimit, express.json({ limit: '16kb' }), async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const usuario = String(req.body?.usuario || '').trim().toLowerCase();
      const contrasena = req.body?.contrasena;
      if (!/^[a-z0-9._-]{3,40}$/.test(usuario) || typeof contrasena !== 'string' || contrasena.length > 256) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      }
      try {
        const registrado = await UsuarioAdmin.findOne({ usuario, activo: true }).select('+passwordHash').exec();
        const correcta = await bcrypt.compare(contrasena, registrado?.passwordHash || hashFalso);
        if (!registrado || !correcta) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        req.session.regenerate(err => {
          if (err) return res.status(500).json({ error: 'No se pudo iniciar la sesión.' });
          req.session.usuario = { id: String(registrado._id), nombre: registrado.usuario, rol: registrado.rol };
          req.session.csrfToken = crypto.randomBytes(24).toString('hex');
          req.session.save(error => {
            if (error) return res.status(500).json({ error: 'No se pudo guardar la sesión.' });
            return res.json({ ok: true });
          });
        });
      } catch (_) { return res.status(500).json({ error: 'No se pudo verificar el acceso.' }); }
    });

    app.post('/api/auth/logout', mismoOrigen, (req, res) => {
      res.set('Cache-Control', 'no-store');
      if (!req.session?.usuario || !mismoToken(req.session.csrfToken, req.get('x-csrf-token'))) {
        return res.status(403).json({ error: 'Sesión o token inválido.' });
      }
      req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'No se pudo cerrar sesión.' });
        res.clearCookie(COOKIE, { path: '/', sameSite: 'strict', secure: cookieSecure });
        return res.json({ ok: true });
      });
    });

    // También proteger los documentos HTML, no únicamente sus enlaces del menú.
    app.use((req, res, next) => {
      if (!PAGINAS_PRIVADAS.has(req.path)) return next();
      return requireAdmin(req, res, next);
    });

    const todosResolvers = {
      ...resolvers,
      Query: { ...resolvers.Query, ...catalogoResolvers.Query, ...reportesResolvers.Query }
    };
    const apollo = new ApolloServer({
      typeDefs: [typeDefs, catalogoTypeDefs, reportesTypeDefs],
      resolvers: protegerResolvers(todosResolvers),
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
      introspection: process.env.NODE_ENV !== 'production'
    });
    await apollo.start();

    app.use('/graphql',
      cors({ origin: ['http://localhost:4000', 'http://127.0.0.1:4000', 'https://studio.apollographql.com'] }),
      express.json({ limit: '1mb' }),
      expressMiddleware(apollo, {
        context: async ({ req }) => ({
          usuario: req.session?.usuario || null,
          csrfToken: req.session?.csrfToken || null,
          csrfEnviado: req.get('x-csrf-token') || ''
        })
      })
    );

    app.use(express.static(path.join(__dirname, 'public'), { index: false }));
    app.get('/', (_req, res) => res.redirect('/catalogo.html'));

    const port = Number(process.env.PORT) || 4000;
    await new Promise(resolve => httpServer.listen(port, '127.0.0.1', resolve));
    console.log(`Catálogo público: http://localhost:${port}/catalogo.html`);
    console.log(`Acceso del personal: http://localhost:${port}/login.html`);
    console.log(`Apollo Sandbox: http://localhost:${port}/graphql`);
    console.log('Operaciones administrativas protegidas por sesión y token CSRF');
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exitCode = 1;
  }
}

iniciarServidor();
