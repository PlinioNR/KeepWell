import app from './app.js';
import { connectDatabase, closeDatabase } from './database.js';

// O servidor trata do arranque; app.js configura os pedidos e as rotas.
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
}
// Primeiro confirma o MongoDB; só depois disponibiliza a API.
let server;
try {
  await connectDatabase();
  server = app.listen(port, () => {
    console.log(`API KeepWell disponível em http://localhost:${port}`);
  });

  server.on('error', async (error) => {
    console.error(error.code === 'EADDRINUSE'
      ? `A porta ${port} já está a ser utilizada.`
      : 'Não foi possível iniciar a API.');
    await closeDatabase();
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

// Ctrl+C encerra o HTTP e a ligação ao MongoDB de forma controlada.
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeDatabase();
  clearTimeout(timeout);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

