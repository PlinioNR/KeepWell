import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../database.js';
import { registerUser } from '../services/registration.js';
import { loginUser } from '../services/authentication.js';
import { createObject, deleteObject } from '../services/objects.js';

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
  let response = await request('POST', '', { name, icon: 'laptop', description: 'Equipamento pessoal' });
  assert.equal(response.status, 201);
  const created = (await response.json()).category;
  assert.equal(response.headers.get('location'), `/categories/${created.id}`);
  categoryIds.push(new ObjectId(created.id));
  assert.equal(created.icon, 'laptop');
  assert.equal(created.description, 'Equipamento pessoal');
  response = await request('GET', '/icons');
  assert.equal(response.status, 200);
  assert.ok((await response.json()).icons.includes('laptop'));
  assert.equal((await request('PATCH', `/${created.id}`, { icon: 'nao-existe' })).status, 400);
  response = await request('PATCH', `/${created.id}`, { icon: 'bike' });
  assert.equal(response.status, 200);
  let partial = (await response.json()).category;
  assert.equal(partial.name, name);
  assert.equal(partial.description, 'Equipamento pessoal');
  assert.equal(partial.icon, 'bike');
  const testObject = await createObject({ name: 'Objeto da contagem', categoryId: created.id }, userId);
  response = await request('GET', `?search=${encodeURIComponent(name.toLowerCase())}`);
  assert.equal(response.status, 200);
  let categories = (await response.json()).categories;
  assert.equal(categories.length, 1);
  assert.equal(categories[0].objectCount, 1);
  await database.collection('users').updateOne({ _id: userId, email }, { $set: { role: 'user' } });
  response = await request('GET', `?search=${encodeURIComponent(name)}`);
  categories = (await response.json()).categories;
  assert.equal(categories.length, 1);
  assert.ok(!('objectCount' in categories[0]));
  await database.collection('users').updateOne({ _id: userId, email }, { $set: { role: 'admin' } });
  await deleteObject(testObject.id, userId);
  response = await request('GET', `?search=${encodeURIComponent(name)}`);
  assert.equal((await response.json()).categories[0].objectCount, 0);
  for (const query of ['?search=a&search=b', '?search=' + 'x'.repeat(61), '?objectCount=true']) {
    assert.equal((await request('GET', query)).status, 400);
  }
  response = await request('PATCH', `/${created.id}`, { description: '' });
  assert.equal((await response.json()).category.description, '');
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
  const tipsUrl = 'http://127.0.0.1:' + server.address().port + '/tips';
  const tipRequest = (method, path = '', body) => fetch(tipsUrl + path, {
    method,
    headers: { Authorization: 'Bearer ' + login.token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const tipInput = { categoryId: created.id, title: 'Limpar o filtro', text: 'Secar antes de montar.' };
  assert.equal((await fetch(tipsUrl)).status, 401);
  const tipResponse = await tipRequest('POST', '', tipInput);
  assert.equal(tipResponse.status, 201);
  const { tip } = await tipResponse.json();
  const tipPath = '/' + tip.id;
  assert.equal((await request('DELETE', '/' + created.id)).status, 409);
  assert.equal((await tipRequest('PATCH', tipPath, { text: 'Texto atualizado.' })).status, 200);
  await database.collection('users').updateOne({ _id: userId, email }, { $set: { role: 'user' } });
  assert.equal((await tipRequest('POST', '', tipInput)).status, 403);
  assert.equal((await tipRequest('PATCH', tipPath, { text: 'Outro texto' })).status, 403);
  assert.equal((await tipRequest('DELETE', tipPath)).status, 403);
  const matchingTips = await tipRequest('GET', '?categoryId=' + created.id + '&search=filtro');
  assert.equal(matchingTips.status, 200);
  const { tips } = await matchingTips.json();
  assert.equal(tips.length, 1);
  assert.equal(tips[0].text, 'Texto atualizado.');
  await database.collection('users').updateOne({ _id: userId, email }, { $set: { role: 'admin' } });
  assert.equal((await tipRequest('DELETE', tipPath)).status, 204);
  assert.equal((await tipRequest('GET', tipPath)).status, 404);
  assert.equal((await request('DELETE', `/${created.id}`)).status, 204);
  assert.equal((await request('GET', `/${created.id}`)).status, 404);
  assert.equal((await request('DELETE', `/${created.id}`)).status, 404);
  await database.collection('users').updateOne({ _id: userId, email }, { $set: { role: 'user' } });
  assert.equal((await request('POST', '', { name })).status, 403);
  console.log('Categorias e dicas verificadas no Atlas: consulta, criação, edição, eliminação, duplicados, dados inválidos e permissões atuais.');
} finally {
  if (database) {
    if (userId) await database.collection('objects').deleteMany({ userId });
    // Só ids devolvidos pela criação neste teste podem ser eliminados aqui.
    if (categoryIds.length) await database.collection('tips').deleteMany({ categoryId: { $in: categoryIds } });
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



