import express from 'express';
import { connectDatabase, pingDatabase, closeDatabase } from './database.js';

// O Express recebe os pedidos HTTP e permite definir as rotas da API.
const app = express();

// Converte pedidos com corpo JSON em objetos JavaScript acessíveis em req.body.
// O limite evita receber corpos demasiado grandes para esta API.
app.use(express.json({ limit: '100kb' }));

// Usa a porta configurada no ambiente ou 3000 durante o desenvolvimento.
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
}

// Esta rota confirma apenas que o servidor responde; ainda não testa o MongoDB.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'keepwell-api' });
});

// Verifica a disponibilidade atual da base de dados, além do processo HTTP.
app.get('/health/database', async (_req, res) => {
  try {
    await pingDatabase();
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

// Devolve JSON também quando o cliente pede uma rota que não existe.
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Trata erros sem enviar detalhes internos do servidor para o cliente.
// O Express identifica este middleware pelos quatro argumentos.
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'O corpo do pedido contém JSON inválido.' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'O corpo do pedido excede o tamanho permitido.' });
  }

  console.error('Erro interno ao processar o pedido.');
  return res.status(500).json({ error: 'Erro interno do servidor.' });
});

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
