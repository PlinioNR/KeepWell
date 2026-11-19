import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { MongoClient, ObjectId } from 'mongodb';

const name = 'kw_migrate_' + randomUUID().slice(0, 8);
const client = new MongoClient(process.env.MONGODB_URI.trim());
const database = client.db(name);
function run(script, ...args) {
  const result = spawnSync(process.execPath, ['src/scripts/' + script + '.js', ...args], {
    stdio: 'inherit', env: { ...process.env, MONGODB_DB: name }
  });
  assert.equal(result.status, 0, script);
}
try {
  await client.connect();
  run('setup-database');
  const now = new Date();
  const dates = { createdAt: now, updatedAt: now };
  const ids = {};
  for (const [label, role] of [['ana', 'user'], ['bruno', 'user'], ['admin', 'admin']]) {
    const result = await database.collection('users').insertOne({
      name: label + ' Demo', email: label + '@keepwell.test',
      passwordHash: 'migration-test-only', role, ...dates
    });
    ids[label] = result.insertedId;
  }
  const categoryId = new ObjectId();
  await database.collection('categories').insertOne({ _id: categoryId, name: 'Teste', ...dates });
  const { insertedId: objectId } = await database.collection('objects').insertOne({
    name: 'Objeto antigo', userId: ids.bruno, categoryId, photoKey: null, ...dates
  });
  const { insertedId: taskId } = await database.collection('tasks').insertOne({
    title: 'Cuidado antigo', objectId, userId: ids.bruno, dueOn: '2026-11-01',
    status: 'completed', completedAt: now, notes: 'Observação preservada.', ...dates
  });
  const { insertedId: tipId } = await database.collection('tips').insertOne({
    title: 'Dica antiga', text: 'Texto preservado.', categoryId, ...dates
  });
  run('migrate-house-memberships');
  assert.equal(await database.collection('houses').countDocuments(), 0);
  run('migrate-house-memberships', '--apply');
  run('migrate-house-data');
  assert.equal((await database.collection('objects').findOne({ _id: objectId })).houseId, undefined);
  run('migrate-house-data', '--apply');
  const owner = await database.collection('users').findOne({ _id: ids.ana });
  const member = await database.collection('users').findOne({ _id: ids.bruno });
  const manager = await database.collection('users').findOne({ _id: ids.admin });
  assert.equal(owner.houseRole, 'owner');
  assert.equal(member.houseRole, 'member');
  assert.equal(manager.houseRole, 'manager');
  assert.equal(manager.email, 'gestor@keepwell.test');
  for (const user of [owner, member, manager]) {
    assert.ok(user.houseId.equals(owner.houseId));
    assert.ok(!('role' in user));
  }
  const object = await database.collection('objects').findOne({ _id: objectId });
  const task = await database.collection('tasks').findOne({ _id: taskId });
  const tip = await database.collection('tips').findOne({ _id: tipId });
  for (const item of [object, task, tip]) assert.ok(item.houseId.equals(owner.houseId));
  assert.ok(object.createdBy.equals(ids.bruno));
  assert.ok(task.objectId.equals(objectId));
  assert.equal(task.notes, 'Observação preservada.');
  assert.equal(task.completedAt.getTime(), now.getTime());
  assert.ok(!('userId' in object));
  assert.ok(!('userId' in task));
  run('migrate-house-memberships', '--apply');
  run('migrate-house-data', '--apply');
  assert.equal(await database.collection('houses').countDocuments(), 1);
  run('seed-demo');
  const before = await Promise.all(['users', 'houses', 'objects', 'tasks', 'tips'].map(c => database.collection(c).countDocuments()));
  run('seed-demo');
  const after = await Promise.all(['users', 'houses', 'objects', 'tasks', 'tips'].map(c => database.collection(c).countDocuments()));
  assert.deepEqual(after, before);
  assert.equal(await database.collection('users').countDocuments({ houseId: owner.houseId }), 3);
  console.log('Migração e seed verificados: dados preservados, papéis e repetição sem duplicados.');
} finally {
  try {
    if (/^kw_migrate_[a-f0-9]{8}$/.test(name)) await database.dropDatabase();
  } finally {
    await client.close();
  }
  console.log('Base temporária de migração removida.');
}
