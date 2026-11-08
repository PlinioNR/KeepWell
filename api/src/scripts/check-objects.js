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
  let response = await request(0, 'POST', '', { name: 'Portátil pessoal', categoryId: category.id, acquiredOn: '2023-07-03', description: '  Computador pessoal.  ' });
  const created = await response.json();
  assert.equal(response.status, 201, JSON.stringify(created));
  const object = created.object;
  assert.equal(object.acquiredOn, '2023-07-03');
  assert.equal(object.description, 'Computador pessoal.');
  const saved = await database.collection('objects').findOne({ _id: new ObjectId(object.id) });
  assert.ok(saved.userId.equals(userIds[0]));
  assert.equal(saved.description, 'Computador pessoal.');
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
  // Dados exclusivos desta secção para provar combinação dos filtros e paginação.
  const filterCategory = await createCategory({ name: `Filtro-${marker}` });
  categoryIds.push(new ObjectId(filterCategory.id));
  const extraObjects = [
    await createObject({ name: 'Câmara (A+B).01', categoryId: category.id }, userIds[0]),
    await createObject({ name: 'Portátil secundário', categoryId: filterCategory.id }, userIds[0]),
    await createObject({ name: 'Portátil pessoal', categoryId: category.id }, userIds[1])
  ];
  response = await request(0, 'GET', '?search=PORT');
  assert.equal(response.status, 200);
  let filtered = await response.json();
  assert.equal(filtered.total, 2);
  response = await request(0, 'GET', `?categoryId=${category.id}`);
  filtered = await response.json();
  assert.equal(filtered.total, 2);
  assert.ok(filtered.objects.every(item => item.categoryId === category.id));
  response = await request(0, 'GET', `?search=port&categoryId=${category.id}`);
  filtered = await response.json();
  assert.equal(filtered.total, 1);
  assert.equal(filtered.objects[0].id, object.id);
  response = await request(1, 'GET', `?search=port&categoryId=${category.id}`);
  filtered = await response.json();
  assert.equal(filtered.total, 1);
  assert.equal(filtered.objects[0].id, extraObjects[2].id);
  response = await request(0, 'GET', `?search=${encodeURIComponent('(A+B).')}`);
  filtered = await response.json();
  assert.equal(filtered.total, 1);
  assert.equal(filtered.objects[0].name, 'Câmara (A+B).01');
  response = await request(0, 'GET', '?search=port&pageSize=1');
  const pageOne = await response.json();
  response = await request(0, 'GET', '?search=port&pageSize=1&page=2');
  const pageTwo = await response.json();
  assert.equal(pageOne.total, 2);
  assert.equal(pageTwo.total, 2);
  assert.equal(pageOne.objects.length, 1);
  assert.equal(pageTwo.objects.length, 1);
  assert.notEqual(pageOne.objects[0].id, pageTwo.objects[0].id);
  response = await request(0, 'GET', '?search=sem-resultados');
  assert.equal((await response.json()).total, 0);
  response = await request(0, 'GET', `?categoryId=${new ObjectId()}`);
  assert.equal((await response.json()).total, 0);
  for (const path of ['?search=a&search=b', '?categoryId=invalido', '?categoryId=a&categoryId=b', `?search=${'x'.repeat(101)}`]) {
    assert.equal((await request(0, 'GET', path)).status, 400);
  }
  await database.collection('objects').deleteMany({
    _id: { $in: extraObjects.map(item => new ObjectId(item.id)) }, userId: { $in: userIds }
  });
  await deleteCategory(filterCategory.id);
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
  // A conta B não pode editar ou eliminar o objeto da conta A.
  assert.equal((await request(1, 'PATCH', `/${object.id}`, { name: 'Tentativa externa' })).status, 404);
  assert.equal((await request(1, 'DELETE', `/${object.id}`)).status, 404);
  assert.equal((await request(0, 'PATCH', `/${object.id}`, { userId: userIds[1].toString() })).status, 400);
  assert.equal((await request(0, 'PATCH', `/${object.id}`, {})).status, 400);
  assert.equal((await request(0, 'PATCH', `/${object.id}`, { name: null })).status, 400);
  assert.equal((await request(0, 'PATCH', `/${object.id}`, { categoryId: new ObjectId().toString() })).status, 400);
  assert.equal((await request(0, 'DELETE', '/invalido')).status, 400);
  assert.equal((await request(0, 'PATCH', `/${new ObjectId()}`, { name: 'Inexistente' })).status, 404);
  response = await request(0, 'PATCH', `/${object.id}`, { name: 'Portátil atualizado' });
  assert.equal(response.status, 200);
  const edited = (await response.json()).object;
  assert.equal(edited.name, 'Portátil atualizado');
  assert.equal(edited.createdAt, object.createdAt);
  assert.equal(edited.description, object.description);
  assert.equal((await request(0, 'PATCH', `/${object.id}`, { description: null })).status, 400);
  assert.equal((await request(0, 'PATCH', `/${object.id}`, { description: 'x'.repeat(1001) })).status, 400);
  assert.equal((await request(1, 'PATCH', `/${object.id}`, { description: 'Tentativa externa' })).status, 404);
  response = await request(0, 'PATCH', `/${object.id}`, { description: 'Primeira linha\nSegunda linha' });
  assert.equal(response.status, 200);
  const described = (await response.json()).object;
  assert.equal(described.description, 'Primeira linha\nSegunda linha');
  assert.equal(described.name, edited.name);
  assert.equal(described.createdAt, object.createdAt);
  response = await request(0, 'PATCH', `/${object.id}`, { description: '' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).object.description, '');
  assert.equal(edited.categoryId, object.categoryId);
  assert.equal(edited.acquiredOn, '2023-07-03');
  assert.equal((await request(0, 'PATCH', `/${object.id}`, { acquiredOn: '2025-02-29' })).status, 400);
  response = await request(0, 'PATCH', `/${object.id}`, { acquiredOn: '2024-02-29' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).object.acquiredOn, '2024-02-29');
  response = await request(0, 'PATCH', `/${object.id}`, { acquiredOn: null });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).object.acquiredOn, null);
  const nextCategory = await createCategory({ name: `Outra-${marker}` });
  categoryIds.push(new ObjectId(nextCategory.id));
  response = await request(0, 'PATCH', `/${object.id}`, { categoryId: nextCategory.id });
  assert.equal(response.status, 200);
  const moved = (await response.json()).object;
  assert.equal(moved.categoryId, nextCategory.id);
  assert.equal(moved.name, edited.name);
  await deleteCategory(category.id); // A categoria anterior já não está usada.
  await assert.rejects(deleteCategory(nextCategory.id), { status: 409 });

  // Referência técnica temporária para testar a regra, antes do modelo de tarefas.
  // O id do objeto identifica exclusivamente os dados deste teste.
  const task = await database.collection('tasks').insertOne({ objectId: new ObjectId(object.id), userId: userIds[0] });
  try {
    assert.equal((await request(0, 'DELETE', `/${object.id}`)).status, 409);
    assert.equal((await request(0, 'GET', `/${object.id}`)).status, 200);
  } finally {
    await database.collection('tasks').deleteOne({ _id: task.insertedId, objectId: new ObjectId(object.id) });
  }
  assert.equal((await request(0, 'DELETE', `/${object.id}`)).status, 204);
  assert.equal((await request(0, 'GET', `/${object.id}`)).status, 404);
  assert.equal((await request(0, 'DELETE', `/${object.id}`)).status, 404);
  console.log('Objetos verificados: CRUD, pesquisa literal, filtro, paginação, dono, isolamento, categorias, tarefas e transações.');
} finally {
  if (database) {
    // Elimina apenas dados pertencentes às contas aleatórias deste teste.
    if (userIds.length) await database.collection('tasks').deleteMany({ userId: { $in: userIds } });
    if (userIds.length) {
      await database.collection('objects').deleteMany({ userId: { $in: userIds } });
      await database.collection('sessions').deleteMany({ userId: { $in: userIds } });
      await database.collection('users').deleteMany({ _id: { $in: userIds }, email: { $in: emails } });
    }
    if (categoryIds.length) await database.collection('categories').deleteMany({ _id: { $in: categoryIds } });
    // Marcadores exatos cobrem uma eventual resposta de criação perdida.
    await database.collection('categories').deleteMany({ name: { $in: [`Objetos-${marker}`, `Corrida-${marker}`, `Outra-${marker}`, `Filtro-${marker}`] } });
    console.log('Objetos, categorias, contas e sessões temporários removidos.');
  }
  if (server) await new Promise(resolve => server.close(resolve));
  await closeDatabase();
}




