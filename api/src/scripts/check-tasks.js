import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../database.js';
import { registerUser } from '../services/registration.js';
import { loginUser } from '../services/authentication.js';
import { createCategory } from '../services/categories.js';
import { createObject, deleteObject } from '../services/objects.js';
import { createTask } from '../services/tasks.js';
import { buildTask } from '../models/task.js';

const marker = randomUUID();
const emails = [`task-a-${marker}@example.com`, `task-b-${marker}@example.com`];
const userIds = [];
let database;
let categoryId;
let server;
try {
  database = await connectDatabase();
  const tokens = [];
  for (const email of emails) {
    const user = await registerUser({ name: 'Teste Cuidados', email, password: 'TesteCuidados123!' });
    userIds.push(new ObjectId(user.id));
    tokens.push((await loginUser({ email, password: 'TesteCuidados123!' })).token);
  }
  const category = await createCategory({ name: `Cuidados-${marker}` });
  categoryId = new ObjectId(category.id);
  const object = await createObject({ name: 'Objeto A', categoryId: category.id }, userIds[0]);
  const otherObject = await createObject({ name: 'Objeto B', categoryId: category.id }, userIds[1]);
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}/tasks`;
  const request = (index, method, path = '', body) => fetch(base + path, {
    method, headers: { Authorization: `Bearer ${tokens[index]}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const valid = { objectId: object.id, title: 'Limpar o filtro', dueOn: '2026-11-15' };
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await request(0, 'POST', '', { ...valid, objectId: otherObject.id })).status, 404);
  assert.equal((await request(0, 'POST', '', { ...valid, objectId: new ObjectId().toString() })).status, 404);
  assert.equal((await request(0, 'POST', '', { ...valid, userId: userIds[1].toString() })).status, 400);
  assert.equal((await request(0, 'POST', '', { ...valid, dueOn: '2026-02-30' })).status, 400);
  let response = await request(0, 'POST', '', valid);
  const created = await response.json();
  assert.equal(response.status, 201, JSON.stringify(created));
  assert.equal(response.headers.get('location'), `/tasks/${created.task.id}`);
  assert.equal(created.task.status, 'pending');
  assert.equal(created.task.completedAt, null);
  assert.ok(!('userId' in created.task));
  const saved = await database.collection('tasks').findOne({ _id: new ObjectId(created.task.id) });
  assert.ok(saved.userId.equals(userIds[0]));
  assert.ok(saved.objectId.equals(new ObjectId(object.id)));
  assert.equal((await request(0, 'GET', `/${created.task.id}`)).status, 200);
  assert.equal((await request(1, 'GET', `/${created.task.id}`)).status, 404);
  assert.equal((await request(0, 'GET', '/invalido')).status, 400);
  response = await request(1, 'GET');
  assert.equal((await response.json()).total, 0);
  const second = await createTask({ ...valid, title: 'Cuidado anterior', dueOn: '2026-11-01' }, userIds[0]);
  response = await request(0, 'GET', '?pageSize=1');
  let list = await response.json();
  assert.equal(list.total, 2);
  assert.equal(list.tasks.length, 1);
  assert.equal(list.tasks[0].id, second.id);
  response = await request(0, 'GET', '?pageSize=1&page=2');
  list = await response.json();
  assert.equal(list.tasks[0].id, created.task.id);
  assert.equal((await request(0, 'GET', '?userId=externo')).status, 400);
  await assert.rejects(deleteObject(object.id, userIds[0]), { status: 409 });
  await assert.rejects(database.collection('tasks').insertOne({
    ...buildTask(valid, userIds[0]), completedAt: new Date()
  }), { code: 121 });
  // Conclusão e histórico respeitam o dono e não duplicam registos.
  assert.equal((await request(1, 'POST', `/${created.task.id}/complete`, {})).status, 404);
  assert.equal((await request(0, 'POST', '/invalido/complete', {})).status, 400);
  assert.equal((await request(0, 'POST', `/${created.task.id}/complete`, { completedAt: new Date() })).status, 400);
  assert.equal((await request(0, 'POST', `/${created.task.id}/complete`, { notes: null })).status, 400);
  response = await request(0, 'POST', `/${created.task.id}/complete`, { notes: '  Filtro lavado e testado.  ' });
  assert.equal(response.status, 200);
  const completed = (await response.json()).task;
  assert.equal(completed.status, 'completed');
  assert.ok(Number.isFinite(Date.parse(completed.completedAt)));
  assert.equal(completed.notes, 'Filtro lavado e testado.');
  assert.equal(completed.createdAt, created.task.createdAt);
  assert.equal(completed.dueOn, valid.dueOn);
  response = await request(0, 'POST', `/${created.task.id}/complete`, { notes: 'Outra observação' });
  const repeated = (await response.json()).task;
  assert.equal(repeated.completedAt, completed.completedAt);
  assert.equal(repeated.updatedAt, completed.updatedAt);
  assert.equal(repeated.notes, completed.notes);
  assert.equal(await database.collection('tasks').countDocuments({ _id: new ObjectId(created.task.id) }), 1);
  const historyUrl = `http://127.0.0.1:${server.address().port}/objects/${object.id}/history`;
  const auth = index => ({ headers: { Authorization: `Bearer ${tokens[index]}` } });
  assert.equal((await fetch(historyUrl)).status, 401);
  assert.equal((await fetch(historyUrl, auth(1))).status, 404);
  response = await fetch(historyUrl, auth(0));
  let history = await response.json();
  assert.equal(response.status, 200);
  assert.equal(history.total, 1);
  assert.equal(history.tasks[0].id, completed.id);
  assert.equal(history.tasks[0].notes, completed.notes);
  assert.equal(history.tasks[0].status, 'completed');
  const parallel = await Promise.all([
    request(0, 'POST', `/${second.id}/complete`, {}),
    request(0, 'POST', `/${second.id}/complete`, {})
  ]);
  assert.ok(parallel.every(item => item.status === 200));
  const completions = await Promise.all(parallel.map(item => item.json()));
  assert.equal(completions[0].task.completedAt, completions[1].task.completedAt);
  response = await fetch(historyUrl + '?pageSize=1', auth(0));
  const firstPage = await response.json();
  response = await fetch(historyUrl + '?pageSize=1&page=2', auth(0));
  const secondPage = await response.json();
  assert.equal(firstPage.total, 2);
  assert.equal(firstPage.tasks.length, 1);
  assert.notEqual(firstPage.tasks[0].id, secondPage.tasks[0].id);
  assert.ok(Date.parse(firstPage.tasks[0].completedAt) >= Date.parse(secondPage.tasks[0].completedAt));
  const emptyHistory = await fetch(`http://127.0.0.1:${server.address().port}/objects/${otherObject.id}/history`, auth(1));
  assert.equal((await emptyHistory.json()).total, 0);
  assert.equal((await fetch(historyUrl + '?pageSize=101', auth(0))).status, 400);
  await assert.rejects(deleteObject(object.id, userIds[0]), { status: 409 });
  const raceObject = await createObject({ name: 'Objeto concorrente', categoryId: category.id }, userIds[0]);
  const results = await Promise.allSettled([
    createTask({ ...valid, objectId: raceObject.id }, userIds[0]),
    deleteObject(raceObject.id, userIds[0])
  ]);
  assert.ok(results.some(result => result.status === 'fulfilled'));
  const raceId = new ObjectId(raceObject.id);
  const tasks = await database.collection('tasks').countDocuments({ objectId: raceId });
  const parent = await database.collection('objects').findOne({ _id: raceId });
  assert.ok(tasks === 0 || parent !== null, 'Não pode existir tarefa sem objeto.');
  console.log('Cuidados verificados: criação, calendário, estado, conclusão idempotente, histórico, paginação, dono, validação MongoDB e concorrência.');
} finally {
  if (database && userIds.length) {
    await database.collection('tasks').deleteMany({ userId: { $in: userIds } });
    await database.collection('objects').deleteMany({ userId: { $in: userIds } });
    await database.collection('sessions').deleteMany({ userId: { $in: userIds } });
    await database.collection('users').deleteMany({ _id: { $in: userIds }, email: { $in: emails } });
    if (categoryId) await database.collection('categories').deleteOne({ _id: categoryId });
    await database.collection('categories').deleteOne({ name: `Cuidados-${marker}` });
    console.log('Cuidados, objetos, contas, categorias e sessões temporários removidos.');
  }
  if (server) await new Promise(resolve => server.close(resolve));
  await closeDatabase();
}

