import test from 'node:test';
import assert from 'node:assert/strict';
import { requireHouseRole } from '../src/middleware/require-house.js';
import { parseCategoryId, validateCategoryInput } from '../src/services/categories.js';

test('bloqueia membros e permite dono ou gestor', () => {
  for (const req of [{}, { auth: { user: { houseRole: 'member' } } }, { body: { role: 'admin' } }]) {
    let status;
    let called = false;
    const res = { status(code) { status = code; return this; }, json() {} };
    requireHouseRole('owner', 'manager')(req, res, () => { called = true; });
    assert.equal(status, 403);
    assert.equal(called, false);
  }
  let called = false;
  requireHouseRole('owner', 'manager')({ auth: { user: { houseRole: 'owner' } } }, {}, () => { called = true; });
  assert.equal(called, true);
});

test('rejeita ids malformados e campos internos enviados pelo cliente', () => {
  for (const id of ['', 'abc', { $ne: null }, 'z'.repeat(24)]) assert.throws(() => parseCategoryId(id), { status: 400 });
  for (const body of [null, [], {}, { name: 'Teste', createdAt: new Date() }, { name: { $ne: null } }]) {
    assert.throws(() => validateCategoryInput(body), { status: 400 });
  }
  assert.equal(validateCategoryInput({ name: '  Casa  ' }).name, 'Casa');
});

test('a pesquisa de categorias é literal e rejeita filtros injetados', async () => {
  const { parseCategorySearch } = await import('../src/services/categories.js');
  assert.deepEqual(parseCategorySearch({ search: '  ' }), {});
  const filter = parseCategorySearch({ search: 'Casa (A+B).' });
  const regex = new RegExp(filter.name.$regex, filter.name.$options);
  assert.ok(regex.test('Casa (A+B).'));
  assert.ok(!regex.test('Casa AAABx'));
  for (const query of [{ search: ['a','b'] }, { search: { $ne: null } }, { search: 'x'.repeat(61) }, { objectCount: 'true' }]) {
    assert.throws(() => parseCategorySearch(query), { status: 400 });
  }
  const current = { name: 'Casa', icon: 'wrench', description: 'Existente' };
  const validated = validateCategoryInput({ description: '' }, current);
  assert.equal(validated.name, current.name);
  assert.equal(validated.icon, current.icon);
  assert.equal(validated.description, '');
});
