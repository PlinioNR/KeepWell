import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../database.js';
import { registerUser } from '../services/registration.js';
import { loginUser } from '../services/authentication.js';

const marker = randomUUID();
const email = `category-admin-test-${marker}@example.com`;
const name = `Teste-${marker}`;
let database;
let userId;
let server;
const categoryIds = [];
try {
  database = await connectDatabase();
  const user = await registerUser({ name: 'Teste Admin', email, password: 'TesteAdmin123!' });
  userId = new ObjectId(user.id);
  const login = await loginUser({ email, password: 'TesteAdmin123!' });
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}/categories`;
  const request = (method, path = '', body) => fetch(base + path, {
    method, headers: { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await request('GET')).status, 200);
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    assert.equal((await request(method, method === 'POST' ? '' : `/${new ObjectId()}`, { name })).status, 403);
  }
  // Apenas a conta aleatória deste teste recebe admin; nenhuma conta real é alterada.
  await database.collection('users').updateOne({ _id: userId, email }, { $set: { role: 'admin' } });
  assert.equal((await request('POST', '', { name, role: 'admin' })).status, 400);
  assert.equal((await request('PATCH', '/invalido', { name })).status, 400);
  assert.equal((await request('GET', `/${new ObjectId()}`)).status, 404);
  let response = await request('POST', '', { name });
  assert.equal(response.status, 201);
  const created = (await response.json()).category;
  categoryIds.push(new ObjectId(created.id));
  assert.equal(response.headers.get('location'), `/categories/${created.id}`);
  assert.equal((await request('POST', '', { name: name.toLowerCase() })).status, 409);
  response = await request('GET', `/${created.id}`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).category.name, name);
  response = await request('PATCH', `/${created.id}`, { name: `Editada-${marker}` });
  assert.equal(response.status, 200);
  const updated = (await response.json()).category;
  assert.equal(updated.id, created.id);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.name, `Editada-${marker}`);
  assert.equal((await request('PATCH', `/${new ObjectId()}`, { name })).status, 404);
  assert.equal((await request('DELETE', `/${created.id}`)).status, 204);
  assert.equal((await request('GET', `/${created.id}`)).status, 404);
  assert.equal((await request('DELETE', `/${created.id}`)).status, 404);
  await database.collection('users').updateOne({ _id: userId, email }, { $set: { role: 'user' } });
  assert.equal((await request('POST', '', { name })).status, 403);
  console.log('CRUD verificado no Atlas: consulta, criação, edição, eliminação, duplicados, dados inválidos e permissões atuais.');
} finally {
  if (database) {
    // Só ids devolvidos pela criação neste teste podem ser eliminados aqui.
    if (categoryIds.length) await database.collection('categories').deleteMany({ _id: { $in: categoryIds } });
    // Em caso de resposta perdida, encontra apenas os nomes exclusivos deste teste.
    await database.collection('categories').deleteMany({ name: { $in: [name, `Editada-${marker}`] } });
    const user = await database.collection('users').findOne(userId ? { _id: userId, email } : { email });
    if (user) {
      await database.collection('sessions').deleteMany({ userId: user._id });
      await database.collection('users').deleteOne({ _id: user._id, email });
    }
    assert.equal(await database.collection('users').countDocuments({ email }), 0);
    console.log('Dados e sessão temporários removidos.');
  }
  if (server) await new Promise(resolve => server.close(resolve));
  await closeDatabase();
}
