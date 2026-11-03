import { connectDatabase, closeDatabase } from '../database.js';
import { setupUsers } from '../models/user.js';

// Prepara apenas a estrutura: não cria contas nem guarda palavras-passe.
try {
  const database = await connectDatabase();
  await setupUsers(database);
  console.log('Coleção users preparada com validação e email único.');
} catch {
  console.error('Não foi possível preparar users. Verifica a ligação, as permissões e eventuais dados/índices existentes.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
