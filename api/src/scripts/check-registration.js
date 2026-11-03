import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../database.js';

// Teste explícito com o Atlas: cria UMA conta temporária e elimina apenas essa conta.
const email = `keepwell-test-${randomUUID()}@example.com`;
const input = { name: 'Teste de registo', email, password: 'TesteRegisto123!' };
let server;
let users;
let createdId;
try {
  const database = await connectDatabase();
  users = database.collection('users');
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body) => fetch(`${base}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });

  let response = await post({ ...input, role: 'admin' });
  assert.equal(response.status, 400);
  response = await post({ ...input, password: 'curta' });
  assert.equal(response.status, 400);
  response = await fetch(`${base}/auth/register`, { method: 'POST', body: 'texto' });
  assert.equal(response.status, 415);
  response = await fetch(`${base}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  });
  assert.equal(response.status, 400);
  response = await post(input);
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.user.role, 'user');
  assert.ok(!('passwordHash' in body.user));
  assert.ok(!('password' in body.user));
  const saved = await users.findOne({ email });
  createdId = saved?._id;
  assert.equal(saved.name, input.name);
  assert.match(saved.passwordHash, /^scrypt\$32768\$8\$3\$/);
  assert.ok(!('password' in saved));

  response = await post({ ...input, email: email.toUpperCase() });
  assert.equal(response.status, 409);
  assert.equal(await users.countDocuments({ email }), 1);
  response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  response = await fetch(`${base}/health/database`);
  assert.equal(response.status, 200);

  // JSON malformado é rejeitado antes do limitador; seis pedidos adicionais ultrapassam dez.
  for (let i = 0; i < 6; i += 1) response = await post({ ...input, password: 'curta' });
  assert.equal(response.status, 429);
  console.log('Integração verificada: 201, 400, 409, 415, 429, hash no Atlas e saúde da API.');
} finally {
  // Procura apenas o email aleatório gerado por este teste se a resposta se perdeu.
  if (users) {
    const ownDocument = createdId ? { _id: createdId, email } : { email };
    await users.deleteOne(ownDocument);
    assert.equal(await users.countDocuments({ email }), 0);
    console.log('Conta temporária deste teste eliminada.');
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
}


