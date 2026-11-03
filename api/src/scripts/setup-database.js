import { connectDatabase, closeDatabase } from '../database.js';
import { setupUsers } from '../models/user.js';
import { setupSessions } from '../models/session.js';

// Prepara apenas a estrutura: não cria contas nem guarda palavras-passe.
try {
  const database = await connectDatabase();
  await setupUsers(database);
  await setupSessions(database);
  console.log('Coleções users e sessions preparadas com validação e índices.');
} catch {
  console.error('Não foi possível preparar a base de dados. Verifica a ligação, as permissões e eventuais dados/índices existentes.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

