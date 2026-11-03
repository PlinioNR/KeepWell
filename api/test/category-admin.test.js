import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../src/middleware/require-admin.js';
import { parseCategoryId, validateCategoryInput } from '../src/services/categories.js';

test('bloqueia utilizadores comuns e pedidos sem autenticação no controlo de admin', () => {
  for (const req of [{}, { auth: { user: { role: 'user' } } }, { body: { role: 'admin' } }]) {
    let status;
    let called = false;
    const res = { status(code) { status = code; return this; }, json() {} };
    requireAdmin(req, res, () => { called = true; });
    assert.equal(status, 403);
    assert.equal(called, false);
  }
  let called = false;
  requireAdmin({ auth: { user: { role: 'admin' } } }, {}, () => { called = true; });
  assert.equal(called, true);
});

test('rejeita ids malformados e campos internos enviados pelo cliente', () => {
  for (const id of ['', 'abc', { $ne: null }, 'z'.repeat(24)]) assert.throws(() => parseCategoryId(id), { status: 400 });
  for (const body of [null, [], {}, { name: 'Teste', createdAt: new Date() }, { name: { $ne: null } }]) {
    assert.throws(() => validateCategoryInput(body), { status: 400 });
  }
  assert.equal(validateCategoryInput({ name: '  Casa  ' }).name, 'Casa');
});
