import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../database.js';
import { hashSessionToken } from '../services/authentication.js';

// Usa uma conta exclusiva deste teste; não altera contas reais.
const email = `keepwell-login-test-${randomUUID()}@example.com`;
const password = 'TesteLogin123!';
let server;
let database;
let userId;
try {
  database = await connectDatabase();
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  let response = await post('/auth/register', { name: 'Teste Login', email, password });
  assert.equal(response.status, 201);
  const savedUser = await database.collection('users').findOne({ email });
  userId = savedUser._id;

  response = await post('/auth/login', { email, password: 'Errada123!' });
  assert.equal(response.status, 401);
  const incorrect = await response.json();
  response = await post('/auth/login', { email: `missing-${email}`, password });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), incorrect);
  response = await post('/auth/login', { email, password: { $ne: null } });
  assert.equal(response.status, 400);
  assert.equal(await database.collection('sessions').countDocuments({ userId }), 0);

  response = await post('/auth/login', { email: email.toUpperCase(), password });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const login = await response.json();
  assert.match(login.token, /^[a-f0-9]{64}$/);
  assert.equal(login.tokenType, 'Bearer');
  assert.ok(!('passwordHash' in login.user));
  const session = await database.collection('sessions').findOne({ userId });
  assert.equal(session.tokenHash, hashSessionToken(login.token));
  assert.ok(!('token' in session));
  assert.equal(session.expiresAt.getTime() - session.createdAt.getTime(), 24 * 60 * 60 * 1000);
  const authorized = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
  response = await fetch(`${base}/auth/me`);
  assert.equal(response.status, 401);
  response = await fetch(`${base}/auth/me`, authorized('b'.repeat(64)));
  assert.equal(response.status, 401);
  response = await fetch(`${base}/auth/me`, authorized(login.token));
  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.equal(profile.user.id, userId.toString());
  assert.ok(!('passwordHash' in profile.user));

  // Expira só a sessão deste teste: o filtro da API bloqueia-a antes da limpeza TTL.
  await database.collection('sessions').updateOne({ _id: session._id, userId }, {
    $set: { expiresAt: new Date(Date.now() - 1000) }
  });
  response = await fetch(`${base}/auth/me`, authorized(login.token));
  assert.equal(response.status, 401);
  response = await post('/auth/login', { email, password });
  assert.equal(response.status, 200);
  const second = await response.json();
  assert.notEqual(second.token, login.token);
  response = await fetch(`${base}/auth/logout`, { method: 'POST', ...authorized(second.token) });
  assert.equal(response.status, 204);
  response = await fetch(`${base}/auth/me`, authorized(second.token));
  assert.equal(response.status, 401);
  assert.equal(await database.collection('sessions').countDocuments({ tokenHash: hashSessionToken(second.token) }), 0);

  // Os pedidos inválidos contam para o limite, sem gerar mais hashes ou sessões.
  for (let i = 0; i < 21; i += 1) response = await post('/auth/login', {});
  assert.equal(response.status, 429);
  console.log('Login verificado: credenciais, privacidade, sessão, expiração, logout e limite de tentativas.');
} finally {
  if (database) {
    const ownUser = userId ? { _id: userId, email } : { email };
    const user = await database.collection('users').findOne(ownUser);
    if (user) {
      await database.collection('sessions').deleteMany({ userId: user._id });
      await database.collection('users').deleteOne({ _id: user._id, email });
    }
    assert.equal(await database.collection('users').countDocuments({ email }), 0);
    if (userId) assert.equal(await database.collection('sessions').countDocuments({ userId }), 0);
    console.log('Conta e sessões temporárias deste teste eliminadas.');
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
}
