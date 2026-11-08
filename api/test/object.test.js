import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { buildObject, toPublicObject } from '../src/models/object.js';
import { parseObjectPagination } from '../src/services/objects.js';
const userId = new ObjectId();
const categoryId = new ObjectId().toString();

test('o dono vem do argumento interno e não pode ser escolhido no pedido', () => {
  const object = buildObject({ name: ' Portátil  pessoal ', categoryId }, userId);
  assert.equal(object.name, 'Portátil pessoal');
  assert.equal(object.userId, userId);
  assert.equal(object.categoryId.toString(), categoryId);
  assert.throws(() => buildObject({ name: 'Teste', categoryId, userId: new ObjectId().toString() }, userId), { status: 400 });
  for (const body of [null, [], {}, { name: 'a', categoryId }, { name: 'Teste', categoryId: { $ne: null } }]) {
    assert.throws(() => buildObject(body, userId), { status: 400 });
  }
});

test('a representação pública não inclui campos internos', () => {
  const object = { ...buildObject({ name: 'Teste', categoryId }, userId), _id: new ObjectId(), secret: 'interno' };
  const result = toPublicObject(object);
  assert.equal(result.categoryId, categoryId);
  assert.ok(!('userId' in result));
  assert.ok(!('secret' in result));
});

test('limita a paginação e rejeita parâmetros com tipos incorretos', () => {
  assert.deepEqual(parseObjectPagination(), { page: 1, pageSize: 20 });
  assert.deepEqual(parseObjectPagination({ page: '2', pageSize: '100' }), { page: 2, pageSize: 100 });
  for (const query of [{ page: '0' }, { page: '-1' }, { pageSize: '101' }, { page: ['1','2'] }, { userId: 'externo' }]) {
    assert.throws(() => parseObjectPagination(query), { status: 400 });
  }
});

// Pesquisa e filtro nunca substituem a condição obrigatória do dono.
test('combina dono, categoria e pesquisa literal sem aceitar operadores do cliente', async () => {
  const { parseObjectFilters } = await import('../src/services/objects.js');
  assert.deepEqual(parseObjectFilters({}, userId), { userId });
  assert.deepEqual(parseObjectFilters({ search: '  ', categoryId: '' }, userId), { userId });
  const filter = parseObjectFilters({ search: '  Câmara   (A+B).01  ', categoryId }, userId);
  assert.equal(filter.userId, userId);
  assert.equal(filter.categoryId.toString(), categoryId);
  const regex = new RegExp(filter.name.$regex, filter.name.$options);
  assert.ok(regex.test('Câmara (A+B).01'));
  assert.ok(!regex.test('Câmara AAABx01'));
  for (const text of ['.', '*', '+', '?', '^', '$', '[', ']', '(', ')', '{', '}', '|', '\\']) {
    const literal = parseObjectFilters({ search: text }, userId).name;
    assert.ok(new RegExp(literal.$regex, literal.$options).test(text));
    assert.ok(!new RegExp(literal.$regex, literal.$options).test('texto-sem-simbolos'));
  }
  for (const query of [{ search: ['a','b'] }, { search: { $ne: null } }, { search: 'x'.repeat(101) },
    { categoryId: ['a','b'] }, { categoryId: { $ne: null } }, { categoryId: 'invalido' }]) {
    assert.throws(() => parseObjectFilters(query, userId), { status: 400 });
  }
});

test('a data de aquisição valida o calendário, aceita null e mantém a data sem fuso horário', async () => {
  const { validateAcquiredOn } = await import('../src/models/object.js');
  assert.equal(validateAcquiredOn('2024-02-29'), '2024-02-29');
  assert.equal(validateAcquiredOn(null), null);
  assert.equal(validateAcquiredOn(undefined), null);
  for (const value of ['2025-02-29', '2026-02-30', '2026-13-01', '2026-00-01', '2026-01-00', '03/11/2026', '', 20260101, {}]) {
    assert.throws(() => validateAcquiredOn(value), { status: 400 });
  }
  const object = buildObject({ name: 'Computador', categoryId, acquiredOn: '2023-07-03' }, userId);
  assert.equal(object.acquiredOn, '2023-07-03');
  assert.equal(toPublicObject({ ...object, _id: new ObjectId() }).acquiredOn, '2023-07-03');
});

test('a descrição é opcional, preserva parágrafos e rejeita tipos ou tamanhos inválidos', () => {
  const input = { name: 'Computador', categoryId };
  assert.equal(buildObject(input, userId).description, '');
  assert.equal(buildObject({ ...input, description: '  Primeira linha\nSegunda linha  ' }, userId).description, 'Primeira linha\nSegunda linha');
  assert.equal(buildObject({ ...input, description: '' }, userId).description, '');
  assert.equal(buildObject({ ...input, description: 'á'.repeat(1000) }, userId).description.length, 1000);
  for (const description of [null, 123, [], {}, 'x'.repeat(1001)]) {
    assert.throws(() => buildObject({ ...input, description }, userId), { status: 400 });
  }
  const legacy = { ...buildObject(input, userId), _id: new ObjectId() };
  delete legacy.description;
  assert.equal(toPublicObject(legacy).description, '');
});
