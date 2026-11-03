import test from 'node:test';
import assert from 'node:assert/strict';
import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { hashPassword, verifyPassword } from '../src/security/password.js';
import { validateLogin, readBearerToken, hashSessionToken } from '../src/services/authentication.js';

test('verifica a palavra-passe e rejeita palavras erradas, hashes corrompidos e custos inesperados', async () => {
  const hash = await hashPassword('Teste123!');
  assert.equal(await verifyPassword('Teste123!', hash), true);
  assert.equal(await verifyPassword('Errada123!', hash), false);
  assert.equal(await verifyPassword('Teste123!', undefined), false);
  assert.equal(await verifyPassword('Teste123!', hash.replace('$32768$', '$999999999$')), false);
  assert.equal(await verifyPassword('Teste123!', hash + 'ff'), false);
});

test('permite verificar contas anteriores sem modificar a palavra-passe original', async () => {
  const password = 'Uma palavra passe anterior';
  const salt = Buffer.alloc(16, 1);
  const result = await promisify(scrypt)(password, salt, 64, {
    N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024
  });
  const stored = `scrypt$32768$8$3$${salt.toString('hex')}$${result.toString('hex')}`;
  assert.equal(await verifyPassword(password, stored), true);
  assert.equal(await verifyPassword(password.replaceAll(' ', ''), stored), false);
});

test('o login valida tipos/campos e normaliza apenas o email', () => {
  assert.deepEqual(validateLogin({ email: ' RAFAEL@EXAMPLE.COM ', password: 'Teste123!' }), {
    email: 'rafael@example.com', password: 'Teste123!'
  });
  for (const body of [null, [], {}, { email: { $ne: null }, password: 'Teste123!' },
    { email: 'a@example.com', password: 123456 }, { email: 'a@example.com', password: '' },
    { email: 'a@example.com', password: 'x'.repeat(129) },
    { email: 'a@example.com', password: 'Teste123!', role: 'admin' }]) {
    assert.throws(() => validateLogin(body), { status: 400 });
  }
});

test('o token só é aceite no formato Bearer e o seu hash tem tamanho fixo', () => {
  const token = 'a'.repeat(64);
  assert.equal(readBearerToken(`Bearer ${token}`), token);
  for (const header of [undefined, '', token, `Basic ${token}`, `Bearer ${token} extra`, 'Bearer abc']) {
    assert.equal(readBearerToken(header), null);
  }
  const hash = hashSessionToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hashSessionToken(token), hash);
});
