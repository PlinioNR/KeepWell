import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import sharp from 'sharp';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../database.js';
import { registerUser } from '../services/registration.js';
import { loginUser } from '../services/authentication.js';
import { createCategory } from '../services/categories.js';
import { createObject } from '../services/objects.js';
import { readPhotoFile, removePhotoFile, maxPhotoBytes } from '../storage/photo-files.js';

const marker = randomUUID();
const emails = [`photo-a-${marker}@example.com`, `photo-b-${marker}@example.com`];
const userIds = [];
const keys = new Set();
let database;
let categoryId;
let server;
try {
  database = await connectDatabase();
  const tokens = [];
  for (const email of emails) {
    const user = await registerUser({ name: 'Teste Fotografia', email, password: 'TesteFoto123!' });
    userIds.push(new ObjectId(user.id));
    tokens.push((await loginUser({ email, password: 'TesteFoto123!' })).token);
  }
  const category = await createCategory({ name: `Fotos-${marker}` });
  categoryId = new ObjectId(category.id);
  const object = await createObject({ name: 'Objeto com foto', categoryId: category.id }, userIds[0]);
  const _id = new ObjectId(object.id);
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}/objects/${object.id}`;
  const image = await sharp({ create: { width: 50, height: 30, channels: 3, background: '#ff8800' } }).png().toBuffer();
  const headers = index => ({ Authorization: `Bearer ${tokens[index]}` });
  function form(buffer = image, mime = 'image/png', field = 'photo') {
    const body = new FormData();
    body.append(field, new Blob([buffer], { type: mime }), '../foto.png');
    return body;
  }
  async function upload(body = form(), index = 0) {
    const response = await fetch(`${base}/photo`, { method: 'PUT', headers: headers(index), body });
    const saved = await database.collection('objects').findOne({ _id });
    if (saved?.photoKey) keys.add(saved.photoKey);
    return response;
  }
  assert.equal((await fetch(`${base}/photo`)).status, 401);
  assert.equal((await fetch(`${base}/photo`, { headers: headers(0) })).status, 404);
  assert.equal((await upload(form(), 1)).status, 404);
  assert.equal((await upload(form(Buffer.from('falso'), 'image/png'))).status, 415);
  assert.equal((await upload(form(Buffer.from('texto'), 'text/plain'))).status, 415);
  assert.equal((await upload(form(image, 'image/png', 'errado'))).status, 400);
  assert.equal((await upload(new FormData())).status, 400);
  assert.equal((await fetch(`${base}/photo`, { method: 'PUT', headers: { ...headers(0), 'Content-Type': 'multipart/form-data' }, body: 'sem fronteira' })).status, 400);
  assert.equal((await upload(form(Buffer.alloc(maxPhotoBytes + 1)))).status, 413);
  const extra = form(); extra.append('name', 'campo extra');
  assert.equal((await upload(extra)).status, 400);
  let response = await upload();
  const uploaded = await response.json();
  assert.equal(response.status, 200, JSON.stringify(uploaded));
  assert.equal(uploaded.object.photoUrl, `/objects/${object.id}/photo`);
  assert.ok(!('photoKey' in uploaded.object));
  const first = (await database.collection('objects').findOne({ _id })).photoKey;
  response = await fetch(`${base}/photo`, { headers: headers(0) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /image\/jpeg/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const downloaded = Buffer.from(await response.arrayBuffer());
  assert.equal((await sharp(downloaded).metadata()).format, 'jpeg');
  assert.equal((await fetch(`${base}/photo`, { headers: headers(1) })).status, 404);
  assert.equal((await fetch(`${base}/photo`, { method: 'DELETE', headers: headers(1) })).status, 404);
  response = await upload();
  assert.equal(response.status, 200);
  await assert.rejects(readPhotoFile(first), { status: 404 });
  const replacement = (await database.collection('objects').findOne({ _id })).photoKey;
  assert.notEqual(replacement, first);
  // Alterações dos campos do objeto não perdem a referência da fotografia.
  response = await fetch(base, { method: 'PATCH', headers: { ...headers(0), 'Content-Type': 'application/json' }, body: JSON.stringify({ description: 'Mantém a imagem' }) });
  assert.equal((await response.json()).object.photoUrl, uploaded.object.photoUrl);
  assert.equal((await fetch(`${base}/photo`, { method: 'DELETE', headers: headers(0) })).status, 204);
  await assert.rejects(readPhotoFile(replacement), { status: 404 });
  response = await fetch(base, { headers: headers(0) });
  assert.equal((await response.json()).object.photoUrl, null);
  assert.equal((await fetch(`${base}/photo`, { method: 'DELETE', headers: headers(0) })).status, 204);
  assert.equal((await upload()).status, 200);
  const parallel = await Promise.all([upload(), upload()]);
  assert.ok(parallel.every(item => item.status === 200));
  const finalKey = (await database.collection('objects').findOne({ _id })).photoKey;
  assert.ok((await readPhotoFile(finalKey)).length > 0);
  for (const key of keys) if (key !== finalKey) await assert.rejects(readPhotoFile(key), { status: 404 });
  const task = await database.collection('tasks').insertOne({ objectId: _id, userId: userIds[0] });
  try {
    assert.equal((await fetch(base, { method: 'DELETE', headers: headers(0) })).status, 409);
    assert.equal((await fetch(`${base}/photo`, { headers: headers(0) })).status, 200);
  } finally {
    await database.collection('tasks').deleteOne({ _id: task.insertedId, objectId: _id });
  }
  assert.equal((await fetch(base, { method: 'DELETE', headers: headers(0) })).status, 204);
  await assert.rejects(readPhotoFile(finalKey), { status: 404 });
  assert.equal((await fetch(`${base}/photo`, { headers: headers(0) })).status, 404);
  console.log('Fotografias verificadas: conteúdo, tamanho, autenticação, dono, substituição, consulta, remoção e limpeza do objeto.');
} finally {
  if (database && userIds.length) {
    const objects = await database.collection('objects').find({ userId: { $in: userIds } }).toArray();
    for (const object of objects) if (object.photoKey) keys.add(object.photoKey);
    await database.collection('tasks').deleteMany({ userId: { $in: userIds } });
    await database.collection('objects').deleteMany({ userId: { $in: userIds } });
    await database.collection('sessions').deleteMany({ userId: { $in: userIds } });
    await database.collection('users').deleteMany({ _id: { $in: userIds }, email: { $in: emails } });
    if (categoryId) await database.collection('categories').deleteOne({ _id: categoryId });
    await database.collection('categories').deleteOne({ name: `Fotos-${marker}` });
  }
  for (const key of keys) await removePhotoFile(key);
  if (server) await new Promise(resolve => server.close(resolve));
  await closeDatabase();
  console.log('Ficheiros e dados temporários do teste removidos.');
}

