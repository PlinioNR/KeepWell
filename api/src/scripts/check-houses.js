import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ObjectId } from 'mongodb';

// Este teste cria a sua própria base e pasta de fotografias, sem usar os dados da equipa.
const databaseName = 'kw_houses_' + randomUUID().slice(0, 8);
process.env.MONGODB_DB = databaseName;
const photoDirectory = await mkdtemp(join(tmpdir(), 'kw-house-photos-'));
process.env.PHOTO_DIRECTORY = photoDirectory;
const { connectDatabase, closeDatabase } = await import('../database.js');
const { default: app } = await import('../app.js');
const { setupHouses } = await import('../models/house.js');
const { setupUsers } = await import('../models/user.js');
const { setupSessions } = await import('../models/session.js');
const { setupCategories } = await import('../models/category.js');
const { setupObjects } = await import('../models/object.js');
const { setupTasks } = await import('../models/task.js');
const { setupTips } = await import('../models/tip.js');
const { default: sharp } = await import('sharp');
let database;
let server;
try {
  database = await connectDatabase();
  for (const setup of [setupHouses, setupUsers, setupSessions, setupCategories, setupObjects, setupTasks, setupTips]) {
    await setup(database);
  }
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  async function request(account, method, path, body, expected = 200) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(account && { Authorization: 'Bearer ' + account.token }),
        ...(body !== undefined && { 'Content-Type': 'application/json' })
      },
      ...(body !== undefined && { body: JSON.stringify(body) })
    });
    const result = response.status === 204 ? {} : await response.json();
    assert.ok([expected].flat().includes(response.status), method + ' ' + path + ': ' + response.status + ' ' + JSON.stringify(result));
    return result;
  }
  async function account(name) {
    const email = name + '@keepwell.test';
    const { user } = await request(null, 'POST', '/auth/register', { name, email, password: 'Teste1234' }, 201);
    assert.equal(user.houseRole, 'owner');
    assert.ok(!('role' in user));
    const { token } = await request(null, 'POST', '/auth/login', { email, password: 'Teste1234' });
    return { token, user };
  }
  const owner = await account('Ana');
  const manager = await account('Gestor');
  const member = await account('Membro');
  const outsider = await account('Outra');
  const racer = await account('Concorrente');
  const extra = await account('Extra');
  await request(null, 'GET', '/house', undefined, 401);
  const first = await request(owner, 'POST', '/house/invite');
  assert.match(first.code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.ok(Math.abs(new Date(first.expiresAt) - Date.now() - 7 * 86400000) < 15000);
  await request(outsider, 'POST', '/house/join', { code: 'INVALIDO' }, 400);
  await database.collection('houses').updateOne({ _id: new ObjectId(owner.user.houseId) }, {
    $set: { inviteExpiresAt: new Date(0) }
  });
  await request(outsider, 'POST', '/house/join', { code: first.code }, 400);
  const invite = await request(owner, 'POST', '/house/invite');
  await request(outsider, 'POST', '/house/join', { code: first.code }, 400);
  const previousHouse = manager.user.houseId;
  await request(manager, 'POST', '/house/join', { code: invite.code.toLowerCase() });
  assert.equal(await database.collection('houses').countDocuments({ _id: new ObjectId(previousHouse) }), 0);
  await request(owner, 'PATCH', '/house/members/' + manager.user.id, { role: 'manager' });
  await request(member, 'POST', '/house/join', { code: invite.code });
  assert.ok(!('invite' in await request(member, 'GET', '/house')));
  assert.equal((await request(manager, 'GET', '/house')).members.length, 3);
  await request(member, 'POST', '/house/invite', undefined, 403);
  await request(member, 'PATCH', '/house', { name: 'Nova casa' }, 403);
  await request(manager, 'PATCH', '/house', { name: '  Casa partilhada  ' });
  await request(manager, 'PATCH', '/house/members/' + member.user.id, { role: 'manager' }, 403);
  await request(manager, 'DELETE', '/house/members/' + member.user.id, undefined, 403);
  await request(owner, 'PATCH', '/house/members/' + owner.user.id, { role: 'member' }, 403);
  await request(owner, 'DELETE', '/house/members/' + owner.user.id, undefined, 403);
  await request(owner, 'POST', '/house/leave', undefined, 403);

  const now = new Date();
  const { insertedId: categoryId } = await database.collection('categories').insertOne({
    name: 'Eletrónica', icon: 'laptop', description: '', createdAt: now, updatedAt: now
  });
  const category = categoryId.toString();
  for (const actor of [owner, manager, member]) {
    await request(actor, 'POST', '/categories', { name: 'Nova' }, 404);
    await request(actor, 'PATCH', '/categories/' + category, { name: 'Nova' }, 404);
    await request(actor, 'DELETE', '/categories/' + category, undefined, 404);
    assert.equal((await request(actor, 'GET', '/categories')).categories.length, 1);
  }
  const { object } = await request(member, 'POST', '/objects', { name: 'Portátil', categoryId: category }, 201);
  const objectPath = '/objects/' + object.id;
  assert.equal((await request(owner, 'GET', '/objects')).total, 1);
  assert.equal((await request(outsider, 'GET', '/objects')).total, 0);
  await request(outsider, 'GET', objectPath, undefined, 404);
  await request(outsider, 'GET', objectPath + '/history', undefined, 404);
  await request(member, 'PATCH', objectPath, { description: 'Descrição do membro' });
  await request(manager, 'PATCH', objectPath, { description: 'Computador da casa' });

  const image = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ffffff' } }).png().toBuffer();
  async function upload(actor, expected) {
    const form = new FormData();
    form.append('photo', new Blob([image], { type: 'image/png' }), 'foto.png');
    const response = await fetch(base + objectPath + '/photo', {
      method: 'PUT', headers: { Authorization: 'Bearer ' + actor.token }, body: form
    });
    assert.equal(response.status, expected);
  }
  await upload(member, 200);
  await upload(member, 200);
  await upload(manager, 200);
  assert.equal((await fetch(base + objectPath + '/photo', { headers: { Authorization: 'Bearer ' + owner.token } })).status, 200);
  await request(outsider, 'GET', objectPath + '/photo', undefined, 404);
  await request(member, 'DELETE', objectPath + '/photo', undefined, 204);
  await upload(member, 200);

  const taskBody = {
    objectId: object.id, title: 'Limpar o teclado', description: 'Usar um pano seco.',
    dueOn: '2099-01-01', repeatEveryDays: 30, reminderEnabled: true
  };
  await request(member, 'POST', '/tasks', taskBody, 403);
  await request(outsider, 'POST', '/tasks', taskBody, 404);
  const { task } = await request(manager, 'POST', '/tasks', taskBody, 201);
  const taskPath = '/tasks/' + task.id;
  assert.equal((await request(owner, 'GET', taskPath)).task.objectName, object.name);
  assert.equal((await request(member, 'GET', '/tasks')).total, 1);
  await request(outsider, 'GET', taskPath, undefined, 404);
  await request(member, 'PATCH', taskPath, { title: 'Outro título' }, 403);
  await request(member, 'DELETE', taskPath, undefined, 403);
  await request(member, 'POST', taskPath + '/complete', {}, 403);
  await request(owner, 'PATCH', taskPath, { description: 'Pano macio e seco.' });
  const completions = await Promise.all([
    request(owner, 'POST', taskPath + '/complete', { notes: 'Sem problemas.' }),
    request(manager, 'POST', taskPath + '/complete', { notes: 'Outra nota.' })
  ]);
  assert.equal(completions[0].task.completedAt, completions[1].task.completedAt);
  const pending = (await request(owner, 'GET', '/tasks?status=pending')).tasks;
  assert.equal(pending.length, 1);
  assert.equal(pending[0].description, 'Pano macio e seco.');
  assert.equal(pending[0].notes, '');
  assert.equal((await request(member, 'GET', objectPath + '/history')).total, 1);
  await request(owner, 'DELETE', objectPath, undefined, 409);
  await request(member, 'PATCH', '/auth/me/preferences', { remindersEnabled: true });
  assert.equal((await request(member, 'GET', '/tasks/reminders')).total, 1);
  assert.equal((await request(outsider, 'GET', '/tasks')).total, 0);
  const notifications = await request(member, 'GET', '/notifications');
  assert.ok(notifications.recent.some(item => item.taskId === task.id));
  assert.equal((await request(outsider, 'GET', '/notifications')).recent.length, 0);

  const tipBody = { title: 'Limpeza', text: 'Desligar o equipamento antes da limpeza.', objectId: object.id };
  await request(member, 'POST', '/tips', tipBody, 403);
  const { tip } = await request(manager, 'POST', '/tips', tipBody, 201);
  assert.equal((await request(member, 'GET', '/tips')).total, 1);
  await request(outsider, 'GET', '/tips/' + tip.id, undefined, 404);
  await request(outsider, 'PATCH', '/tips/' + tip.id, { text: 'Outro' }, 404);
  await request(member, 'PATCH', '/tips/' + tip.id, { text: 'Outro' }, 403);
  await request(owner, 'PATCH', '/tips/' + tip.id, { text: 'Usar um pano macio.' });
  await request(member, 'DELETE', '/tips/' + tip.id, undefined, 403);
  const video = await request(owner, 'PATCH', '/tips/' + tip.id, { videoUrl: 'https://example.com/tutorial' });
  assert.equal(video.tip.videoUrl, 'https://example.com/tutorial');
  const unchanged = await request(owner, 'PATCH', '/tips/' + tip.id, { title: 'Título revisto' });
  assert.equal(unchanged.tip.videoUrl, video.tip.videoUrl);
  for (const videoUrl of ['javascript:alert(1)', 'ftp://example.com/video', 'https://', 42, {}, 'https://example.com/' + 'x'.repeat(2048)]) {
    await request(owner, 'PATCH', '/tips/' + tip.id, { videoUrl }, 400);
  }
  const cleared = await request(owner, 'PATCH', '/tips/' + tip.id, { videoUrl: '' });
  assert.equal(cleared.tip.videoUrl, null);
  const filtered = await request(member, 'GET', '/tips?objectId=' + object.id);
  assert.equal(filtered.total, 1);
  assert.equal(filtered.tips[0].objectId, object.id);
  await request(outsider, 'GET', '/tips?objectId=' + object.id, undefined, 404);
  await request(outsider, 'POST', '/tips', tipBody, 404);
  await request(owner, 'GET', '/tips?categoryId=' + category, undefined, 400);
  await request(owner, 'POST', '/tips', { title: 'Antiga', text: 'Texto', categoryId: category }, 400);
  const { object: disposable } = await request(member, 'POST', '/objects', { name: 'Objeto temporário', categoryId: category }, 201);
  const disposableTip = await request(owner, 'POST', '/tips', { ...tipBody, objectId: disposable.id }, 201);
  await request(member, 'DELETE', '/objects/' + disposable.id, undefined, 204);
  await request(owner, 'GET', '/tips/' + disposableTip.tip.id, undefined, 404);
  assert.equal(await database.collection('tips').countDocuments({ objectId: new ObjectId(disposable.id) }), 0);
  // O bloqueio por cuidados também se aplica ao membro e conserva as dicas.
  await request(member, 'DELETE', objectPath, undefined, 409);
  await request(owner, 'GET', '/tips/' + tip.id);
  await request(owner, 'DELETE', '/tips/' + tip.id, undefined, 204);

  const { object: racingTipObject } = await request(owner, 'POST', '/objects', {
    name: 'Objeto para testar dicas', categoryId: category
  }, 201);
  const racingTip = await Promise.all([
    fetch(base + '/tips', {
      method: 'POST', headers: { Authorization: 'Bearer ' + owner.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tipBody, objectId: racingTipObject.id })
    }),
    request(member, 'DELETE', '/objects/' + racingTipObject.id, undefined, 204)
  ]);
  assert.ok([201, 404].includes(racingTip[0].status));
  assert.equal(await database.collection('tips').countDocuments({
    objectId: new ObjectId(racingTipObject.id)
  }), 0);

  const outsiderInvite = await request(outsider, 'POST', '/house/invite');
  await request(owner, 'POST', '/house/join', { code: outsiderInvite.code }, 409);
  await request(member, 'POST', '/house/leave');
  assert.equal((await request(member, 'GET', '/house')).role, 'owner');
  await request(member, 'GET', objectPath, undefined, 404);
  await request(owner, 'DELETE', '/house/members/' + manager.user.id, undefined, 204);
  assert.equal((await request(manager, 'GET', '/house')).role, 'owner');
  await request(manager, 'GET', taskPath, undefined, 404);
  await request(extra, 'POST', '/house/join', { code: outsiderInvite.code });
  await request(outsider, 'PATCH', '/house/members/' + extra.user.id, { role: 'manager' });
  await request(extra, 'POST', '/house/leave');
  assert.equal((await request(extra, 'GET', '/house')).members.length, 1);

  // Uma entrada e uma criação simultâneas nunca deixam objetos numa casa apagada.
  const race = await Promise.all([
    request(racer, 'POST', '/objects', { name: 'Objeto concorrente', categoryId: category }, [201, 403]),
    fetch(base + '/house/join', {
      method: 'POST', headers: { Authorization: 'Bearer ' + racer.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: outsiderInvite.code })
    })
  ]);
  assert.ok([200, 403, 409].includes(race[1].status));
  for (const object of await database.collection('objects').find().toArray()) {
    assert.ok(await database.collection('houses').findOne({ _id: object.houseId }));
  }
  if (race[0].object) {
    const raceObject = await database.collection('objects').findOne({ _id: new ObjectId(race[0].object.id) });
    assert.ok(raceObject);
  }
  const invalidRole = await request(owner, 'PATCH', '/house/members/' + outsider.user.id, { role: 'manager' }, 404);
  assert.ok(invalidRole.error);
  console.log('Casas verificadas: papéis, convites, isolamento, fotografias, cuidados, dicas, notificações e concorrência.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (database?.databaseName === databaseName && /^kw_houses_[a-f0-9]{8}$/.test(databaseName)) {
    await database.dropDatabase();
  }
  await closeDatabase();
  const expectedParent = resolve(tmpdir());
  if (resolve(photoDirectory).startsWith(expectedParent + '\\') || resolve(photoDirectory).startsWith(expectedParent + '/')) {
    await rm(photoDirectory, { recursive: true, force: true });
  }
  console.log('Base e fotografias temporárias removidas.');
}
