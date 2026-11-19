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
    tips.countDocuments({ objectId: { $not: { $type: 'objectId' } } })
  ]);
  console.log(`Sem casa: ${objectCount} objetos, ${taskCount} cuidados. Dicas antigas sem objeto a eliminar: ${tipCount}.`);

  if (apply) {
    if (await users.countDocuments(withoutHouse)) {
      throw new Error('Executa primeiro migrate:house-memberships -- --apply.');
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

    // Confirma as referências antes de alterar dados antigos.
    for await (const user of users.find({}, { projection: { houseId: 1 } })) {
      if (!await database.collection('houses').findOne({ _id: user.houseId })) {
        throw new Error('Uma conta aponta para uma casa inexistente.');
      }
    }
    for await (const task of tasks.find(withoutHouse)) {
      const owner = await users.findOne({ _id: task.userId });
      const object = await objects.findOne({ _id: task.objectId });
      const sameOwner = object?.userId?.equals(task.userId);
      const sameHouse = object?.houseId?.equals(owner.houseId);
      if (!object || (!sameOwner && !sameHouse)) {
        throw new Error('Há um cuidado sem objeto da mesma casa. Corrige a referência antes de migrar.');
      }
    }

    for await (const user of users.find({}, { projection: { houseId: 1 } })) {
      await withDatabaseTransaction(async (db, session) => {
        const filter = { ...withoutHouse, userId: user._id };
        await db.collection('objects').updateMany(filter, {
          $set: { houseId: user.houseId }, $unset: { userId: '', createdBy: '' }
        }, { session });
        await db.collection('tasks').updateMany(filter, {
          $set: { houseId: user.houseId }, $unset: { userId: '' }
        }, { session });
      });
    }

    // As dicas antigas por categoria não têm objeto de destino definido.
    await tips.deleteMany({ objectId: { $not: { $type: 'objectId' } } });
    if (await objects.countDocuments(withoutHouse) ||
        await tasks.countDocuments(withoutHouse) ||
        await tips.countDocuments(withoutHouse)) {
      throw new Error('Ainda há dados sem casa. Confirma que a API está parada antes de repetir.');
    }
    // A demonstração passa a usar uma casa partilhada pela Ana, Bruno e gestor.
    const demoOwner = await users.findOne({ email: 'ana@keepwell.test' });
    if (demoOwner) {
      for (const email of ['bruno@keepwell.test', 'admin@keepwell.test', 'gestor@keepwell.test']) {
        await withDatabaseTransaction(async (db, session) => {
          const member = await db.collection('users').findOne({ email }, { session });
          if (!member) return;
          if (email === 'admin@keepwell.test' && await db.collection('users').findOne({ email: 'gestor@keepwell.test' }, { session })) {
            throw new Error('Existem contas admin e gestor de demonstração. Resolve a duplicação antes de migrar.');
          }
          const role = email === 'bruno@keepwell.test' ? 'member' : 'manager';
          const source = member.houseId;
          if (!source.equals(demoOwner.houseId)) {
            const count = await db.collection('users').countDocuments({ houseId: source }, { session });
            if (count !== 1) throw new Error('Uma casa de demonstração já tem outros membros. Confirma os dados antes de migrar.');
            for (const collection of ['objects', 'tasks', 'tips']) {
              await db.collection(collection).updateMany({ houseId: source }, { $set: { houseId: demoOwner.houseId } }, { session });
            }
          }
          await db.collection('users').updateOne({ _id: member._id }, {
            $set: {
              houseId: demoOwner.houseId, houseRole: role,
              ...(email === 'admin@keepwell.test' && { email: 'gestor@keepwell.test' }),
              updatedAt: new Date()
            }
          }, { session });
          if (!source.equals(demoOwner.houseId)) await db.collection('houses').deleteOne({ _id: source }, { session });
        });
      }
    }
    await tips.updateMany({ houseId: { $type: 'objectId' }, objectId: { $type: 'objectId' } }, { $unset: { categoryId: '' } });
    await users.updateMany({ houseId: { $type: 'objectId' } }, { $unset: { role: '' } });
    await objects.updateMany({ houseId: { $type: 'objectId' } }, { $unset: { userId: '', createdBy: '' } });
    await tasks.updateMany({ houseId: { $type: 'objectId' } }, { $unset: { userId: '' } });
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
