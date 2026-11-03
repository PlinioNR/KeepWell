import { connectDatabase, closeDatabase } from '../database.js';

// Comando local deliberado; não existe uma rota pública para atribuir admin.
const email = process.argv[2]?.trim().toLowerCase();
if (!email || process.argv.length !== 3) {
  console.error('Uso: npm.cmd run admin:promote -- email-da-conta');
  process.exitCode = 1;
} else {
  try {
    const database = await connectDatabase();
    const result = await database.collection('users').updateOne(
      { email }, { $set: { role: 'admin', updatedAt: new Date() } }
    );
    if (!result.matchedCount) {
      console.error('Conta não encontrada. Cria primeiro a conta através do registo.');
      process.exitCode = 1;
    } else {
      console.log('Perfil de administrador atribuído à conta indicada.');
    }
  } catch {
    console.error('Não foi possível atribuir o perfil de administrador.');
    process.exitCode = 1;
  } finally { await closeDatabase(); }
}
