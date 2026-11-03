import { connectDatabase, closeDatabase } from '../database.js';
import { setupUsers } from '../models/user.js';
import { setupSessions } from '../models/session.js';
import { setupCategories } from '../models/category.js';
import { setupObjects } from '../models/object.js';

// Prepara apenas a estrutura: não cria contas nem guarda palavras-passe.
try {
  const database = await connectDatabase();
  await setupUsers(database);
  await setupSessions(database);
  await setupCategories(database);
  await setupObjects(database);
  console.log('Coleções users, sessions, categories e objects preparadas com validação e índices.');
} catch {
  console.error('Não foi possível preparar a base de dados. Verifica a ligação, as permissões e eventuais dados/índices existentes.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}



