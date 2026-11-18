import { connectDatabase, closeDatabase, withDatabaseTransaction } from '../database.js';
import { buildHouse } from '../models/house.js';

const args = process.argv.slice(2);
const apply = args.length === 1 && args[0] === '--apply';
if (args.length && !apply) {
  console.error('Usa o comando sem argumentos para consultar ou passa --apply para aplicar.');
  process.exit(1);
}

const missingHouse = { houseId: { $exists: false }, houseRole: { $exists: false } };

try {
  const database = await connectDatabase();
  const users = database.collection('users');
  const count = await users.countDocuments(missingHouse);
  console.log(`Contas sem casa: ${count}.`);

  if (apply) {
    if (!await database.listCollections({ name: 'houses' }).hasNext()) {
      throw new Error('Executa db:setup antes de aplicar a migração.');
    }

    let migrated = 0;
    for await (const { _id } of users.find(missingHouse, { projection: { _id: 1 } })) {
      const changed = await withDatabaseTransaction(async (db, session) => {
        const filter = { _id, ...missingHouse };
        const user = await db.collection('users').findOne(filter, { session });
        if (!user) return false;

        const house = buildHouse(user.name);
        const { insertedId: houseId } = await db.collection('houses').insertOne(house, { session });
        await db.collection('users').updateOne(filter, {
          $set: { houseId, houseRole: 'owner', updatedAt: house.updatedAt }
        }, { session });
        return true;
      });
      if (changed) migrated++;
    }
    console.log(`Contas associadas a uma casa: ${migrated}.`);
  }
} finally {
  await closeDatabase();
}
