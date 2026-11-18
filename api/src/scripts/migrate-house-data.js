import { connectDatabase, closeDatabase, withDatabaseTransaction } from '../database.js';

const args = process.argv.slice(2);
const apply = args.length === 1 && args[0] === '--apply';
if (args.length && !apply) {
  console.error('Usa o comando sem argumentos para consultar ou passa --apply para aplicar.');
  process.exit(1);
}

const withoutHouse = { houseId: { $exists: false } };

try {
  const database = await connectDatabase();
  const users = database.collection('users');
  const objects = database.collection('objects');
  const tasks = database.collection('tasks');
  const tips = database.collection('tips');
  const [objectCount, taskCount, tipCount] = await Promise.all([
    objects.countDocuments(withoutHouse),
    tasks.countDocuments(withoutHouse),
    tips.countDocuments(withoutHouse)
  ]);
  console.log(`Sem casa: ${objectCount} objetos, ${taskCount} cuidados, ${tipCount} dicas.`);

  if (apply) {
    if (await users.countDocuments(withoutHouse)) {
      throw new Error('Executa primeiro migrate:house-memberships -- --apply.');
    }
    const ana = tipCount ? await users.findOne({ email: 'ana@keepwell.test' }) : null;
    if (tipCount && !ana?.houseId) {
      throw new Error('A conta da Ana precisa de uma casa para receber as dicas existentes.');
    }

    // Verifica se há referências antigas sem utilizador antes de fazer escritas.
    for (const collection of [objects, tasks]) {
      const ownerIds = await collection.distinct('userId', withoutHouse);
      for (const userId of ownerIds) {
        if (!await users.findOne({ _id: userId, houseId: { $type: 'objectId' } })) {
          throw new Error(`Há registos sem um utilizador com casa em ${collection.collectionName}.`);
        }
      }
      if (await collection.countDocuments({ ...withoutHouse, userId: { $not: { $type: 'objectId' } } })) {
        throw new Error(`Há registos sem um utilizador válido em ${collection.collectionName}.`);
      }
    }

    for await (const user of users.find({}, { projection: { houseId: 1 } })) {
      await withDatabaseTransaction(async (db, session) => {
        const filter = { ...withoutHouse, userId: user._id };
        await db.collection('objects').updateMany(filter, {
          $set: { houseId: user.houseId, createdBy: user._id }
        }, { session });
        await db.collection('tasks').updateMany(filter, {
          $set: { houseId: user.houseId }
        }, { session });
      });
    }

    if (ana) await tips.updateMany(withoutHouse, { $set: { houseId: ana.houseId } });
    if (await objects.countDocuments(withoutHouse) ||
        await tasks.countDocuments(withoutHouse) ||
        await tips.countDocuments(withoutHouse)) {
      throw new Error('Ainda há dados sem casa. Confirma que a API está parada antes de repetir.');
    }
    console.log('Objetos, cuidados e dicas associados às casas.');
  }
} catch (error) {
  if (error.name === 'MongoServerError') {
    console.error(`Falha do MongoDB durante a migração (código ${error.code}).`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
