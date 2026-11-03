import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../database.js';
import { registerUser } from '../services/registration.js';
import { loginUser } from '../services/authentication.js';
import { createCategory, deleteCategory } from '../services/categories.js';
import { createObject } from '../services/objects.js';

const marker = randomUUID();
const emails = [`object-a-${marker}@example.com`, `object-b-${marker}@example.com`];
const userIds = [];
const categoryIds = [];
let database;
let server;
try {
  database = await connectDatabase();
  const tokens = [];
  for (const email of emails) {
    const user = await registerUser({ name: 'Teste Objetos', email, password: 'TesteObjetos123!' });
    userIds.push(new ObjectId(user.id));
    tokens.push((await loginUser({ email, password: 'TesteObjetos123!' })).token);
  }
  const category = await createCategory({ name: `Objetos-${marker}` });
  categoryIds.push(new ObjectId(category.id));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}/objects`;
  const request = (index, method, path = '', body) => fetch(base + path, {
    method, headers: { Authorization: `Bearer ${tokens[index]}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await request(0, 'POST', '', { name: 'Teste', categoryId: new ObjectId().toString() })).status, 400);
  assert.equal((await request(0, 'POST', '', { name: 'Teste', categoryId: category.id, userId: userIds[1].toString() })).status, 400);
  let response = await request(0, 'POST', '', { name: 'Portátil pessoal', categoryId: category.id });
  const created = await response.json();
  assert.equal(response.status, 201, JSON.stringify(created));
  const object = created.object;
  const saved = await database.collection('objects').findOne({ _id: new ObjectId(object.id) });
  assert.ok(saved.userId.equals(userIds[0]));
  assert.ok(saved.categoryId.equals(categoryIds[0]));
  response = await request(0, 'GET');
  const own = await response.json();
  assert.equal(own.total, 1);
  assert.equal(own.objects[0].id, object.id);
  response = await request(1, 'GET');
  const other = await response.json();
  assert.equal(other.total, 0);
  assert.deepEqual(other.objects, []);
  assert.equal((await request(1, 'GET', `/${object.id}`)).status, 404);
  assert.equal((await request(0, 'GET', `/${object.id}`)).status, 200);
  assert.equal((await request(0, 'GET', '/invalido')).status, 400);
  assert.equal((await request(0, 'GET', '?pageSize=101')).status, 400);
  await assert.rejects(deleteCategory(category.id), { status: 409 });
  assert.ok(await database.collection('categories').findOne({ _id: categoryIds[0] }));

  // Criação e eliminação simultâneas: qualquer resultado tem de preservar a referência.
  const raceCategory = await createCategory({ name: `Corrida-${marker}` });
  const raceId = new ObjectId(raceCategory.id);
  categoryIds.push(raceId);
  await Promise.allSettled([
    createObject({ name: 'Teste concorrente', categoryId: raceCategory.id }, userIds[0]),
    deleteCategory(raceCategory.id)
  ]);
  const referenced = await database.collection('objects').countDocuments({ categoryId: raceId });
  const remaining = await database.collection('categories').findOne({ _id: raceId });
  assert.ok(referenced === 0 || remaining !== null, 'Não pode existir objeto sem categoria.');
  console.log('Objetos verificados: criação, paginação, dono, isolamento entre contas, categoria válida e transações.');
} finally {
  if (database) {
    // Elimina apenas dados pertencentes às contas aleatórias deste teste.
    if (userIds.length) {
      await database.collection('objects').deleteMany({ userId: { $in: userIds } });
      await database.collection('sessions').deleteMany({ userId: { $in: userIds } });
      await database.collection('users').deleteMany({ _id: { $in: userIds }, email: { $in: emails } });
    }
    if (categoryIds.length) await database.collection('categories').deleteMany({ _id: { $in: categoryIds } });
    // Marcadores exatos cobrem uma eventual resposta de criação perdida.
    await database.collection('categories').deleteMany({ name: { $in: [`Objetos-${marker}`, `Corrida-${marker}`] } });
    console.log('Objetos, categorias, contas e sessões temporários removidos.');
  }
  if (server) await new Promise(resolve => server.close(resolve));
  await closeDatabase();
}
