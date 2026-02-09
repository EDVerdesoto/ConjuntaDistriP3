const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('apollo-server-express');
const config = require('./config');
const sequelize = require('./config/database');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ─── Health checks ───────────────────────────────────────────
  app.get('/health', async (_req, res) => {
    try {
      await sequelize.authenticate();
      res.json({ status: 'ok', db: 'connected' });
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  app.get('/ready', async (_req, res) => {
    try {
      await sequelize.authenticate();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not ready' });
    }
  });

  // ─── Apollo GraphQL ──────────────────────────────────────────
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
    introspection: true,
    formatError: (err) => {
      console.error('GraphQL Error:', err);
      return {
        message: err.message,
        path: err.path,
      };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  // ─── Database sync & listen (with retry) ─────────────────────
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 3000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      console.log('🗄️  PostgreSQL conectado y tablas sincronizadas');
      break;
    } catch (err) {
      console.log(`⏳ Esperando PostgreSQL (intento ${attempt}/${MAX_RETRIES})...`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }

  app.listen(config.port, () => {
    console.log(`✅ Booking service (GraphQL) corriendo en puerto ${config.port}`);
    console.log(`🚀 GraphQL endpoint: http://localhost:${config.port}${server.graphqlPath}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Error al iniciar booking-service:', err);
  process.exit(1);
});
