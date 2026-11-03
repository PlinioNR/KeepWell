import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { buildUser, toPublicUser } from '../src/models/user.js';

const valid = { name: ' Rafael ', email: ' RAFAEL@EXAMPLE.COM ', passwordHash: 'hash-apenas-para-teste' };

test('normaliza nome/email e impede que o cliente escolha admin ou campos extra', () => {
  const user = buildUser({ ...valid, role: 'admin', password: 'nao-guardar', extra: true });
  assert.equal(user.name, 'Rafael');
  assert.equal(user.email, 'rafael@example.com');
  assert.equal(user.role, 'user');
  assert.ok(user.createdAt instanceof Date);
  assert.ok(user.updatedAt instanceof Date);
  assert.ok(!('password' in user));
  assert.ok(!('extra' in user));
});

test('rejeita campos ausentes, nomes inválidos, emails inválidos e hash vazio', () => {
  assert.throws(() => buildUser());
  for (const name of ['', 'a', 42, 'x'.repeat(101)]) {
    assert.throws(() => buildUser({ ...valid, name }));
  }
  for (const email of ['', 'sem-arroba', 'a@b', 'a b@example.com', { $ne: null }]) {
    assert.throws(() => buildUser({ ...valid, email }));
  }
  assert.throws(() => buildUser({ ...valid, passwordHash: ' ' }));
});

test('a representação pública nunca expõe o hash ou outros campos internos', () => {
  const user = { ...buildUser(valid), _id: new ObjectId(), internalSecret: 'segredo' };
  const publicUser = toPublicUser(user);
  assert.equal(publicUser.id, user._id.toString());
  assert.ok(!('passwordHash' in publicUser));
  assert.ok(!('internalSecret' in publicUser));
});
