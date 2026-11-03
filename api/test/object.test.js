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
