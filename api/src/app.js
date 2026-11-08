import multer from 'multer';
import express from 'express';
import { pingDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import objectRoutes from './routes/objects.js';
import taskRoutes from './routes/tasks.js';

// O Express recebe os pedidos HTTP e permite definir as rotas da API.
const app = express();

// Converte pedidos com corpo JSON em objetos JavaScript acessíveis em req.body.
// O limite evita receber corpos demasiado grandes para esta API.
app.use(express.json({ limit: '100kb' }));

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

// Agrupa as rotas de conta no prefixo /auth.
app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/objects', objectRoutes);
app.use('/tasks', taskRoutes);

// Devolve JSON também quando o cliente pede uma rota que não existe.
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Trata erros sem enviar detalhes internos do servidor para o cliente.
// O Express identifica este middleware pelos quatro argumentos.
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({ error: tooLarge
      ? 'A fotografia deve ter no máximo 5 MiB.'
      : 'Envia apenas um ficheiro no campo photo, sem outros campos.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'O corpo do pedido contém JSON inválido.' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'O corpo do pedido excede o tamanho permitido.' });
  }

  // Só estes códigos são usados pelos erros previstos de validação/registo.
  if ([400, 401, 403, 404, 409, 413, 415, 503].includes(error.status)) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error('Erro interno ao processar o pedido.');
  return res.status(500).json({ error: 'Erro interno do servidor.' });
});


export default app;







