import test from 'node:test';
import assert from 'node:assert/strict';
import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { validateRegistration } from '../src/services/registration.js';
import { hashPassword, validatePassword } from '../src/security/password.js';

const valid = { name: ' Rafael ', email: ' RAFAEL@EXAMPLE.COM ', password: 'TesteRegisto123!' };

test('o registo normaliza os dados e preserva a palavra-passe', () => {
  assert.deepEqual(validateRegistration(valid), {
    name: 'Rafael', email: 'rafael@example.com', password: valid.password
  });
});

test('o registo rejeita perfil, hash fornecido pelo cliente, tipos e campos inválidos', () => {
  for (const body of [null, [], 'texto', {}, { ...valid, role: 'admin' },
    { ...valid, passwordHash: 'externo' }, { ...valid, email: { $ne: null } },
    { ...valid, name: 'a' }, { ...valid, password: 'curta' }]) {
    assert.throws(() => validateRegistration(body), { status: 400 });
  }

});

test('scrypt usa salt diferente e permite recalcular o resultado com a mesma palavra-passe', async () => {
  const first = await hashPassword(valid.password);
  const second = await hashPassword(valid.password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(valid.password));
  const [algorithm, n, r, p, salt, expected] = first.split('$');
  assert.equal(algorithm, 'scrypt');
  assert.equal(salt.length, 32);
  const result = await promisify(scrypt)(valid.password, Buffer.from(salt, 'hex'), 64, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024
  });
  assert.equal(result.toString('hex'), expected);
});

test('aceita os limites 6 e 20; rejeita tipos inválidos, comprimentos fora dos limites e espaços', () => {
  for (const password of ['x'.repeat(6), 'x'.repeat(20), 'Abc123!', 'á'.repeat(6)]) {
    assert.doesNotThrow(() => validatePassword(password));
  }
  for (const password of [undefined, null, 123456, [], {}, '', 'x'.repeat(5), 'x'.repeat(21),
    ' abc123', 'abc123 ', 'abc 123', 'abc\t123', 'abc\n123', 'abc\r123', 'abc\u00a0123']) {
    assert.throws(() => validatePassword(password), { status: 400 });
  }
});
