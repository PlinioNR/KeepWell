import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { buildTask, toPublicTask } from '../src/models/task.js';
import { parseTaskPagination } from '../src/services/tasks.js';
const userId = new ObjectId();
const valid = { objectId: new ObjectId().toString(), title: ' Limpar  o filtro ', dueOn: '2028-02-29' };

test('cria um cuidado pendente com dono interno, data e título normalizado', () => {
  const task = buildTask(valid, userId);
  assert.equal(task.title, 'Limpar o filtro');
  assert.equal(task.status, 'pending');
  assert.equal(task.completedAt, null);
  assert.equal(task.userId, userId);
  assert.ok(task.objectId instanceof ObjectId);
  assert.ok(task.createdAt instanceof Date);
  assert.equal(toPublicTask({ ...task, _id: new ObjectId() }).objectId, valid.objectId);
  assert.ok(!('userId' in toPublicTask({ ...task, _id: new ObjectId() })));
});

test('rejeita campos internos, datas inexistentes e dados inválidos', () => {
  for (const body of [null, [], {}, { ...valid, status: 'completed' }, { ...valid, userId: userId.toString() },
    { ...valid, completedAt: new Date() }, { ...valid, objectId: { $ne: null } },
    { ...valid, title: 'a' }, { ...valid, title: 'x'.repeat(121) }, { ...valid, dueOn: '2027-02-29' },
    { ...valid, dueOn: '2026-04-31' }, { ...valid, dueOn: '08/11/2026' }]) {
    assert.throws(() => buildTask(body, userId), { status: 400 });
  }
  assert.deepEqual(parseTaskPagination(), { page: 1, pageSize: 20 });
  for (const query of [{ page: '0' }, { pageSize: '101' }, { page: ['1','2'] }, { userId: 'externo' }]) {
    assert.throws(() => parseTaskPagination(query), { status: 400 });
  }
});

test('a conclusão só aceita observações e não permite escolher o estado ou a data', async () => {
  const { validateCompletion } = await import('../src/services/tasks.js');
  assert.equal(validateCompletion({}), '');
  assert.equal(validateCompletion({ notes: '  Limpo\nTestado  ' }), 'Limpo\nTestado');
  assert.equal(validateCompletion({ notes: 'á'.repeat(1000) }).length, 1000);
  for (const body of [null, [], { status: 'completed' }, { completedAt: new Date() },
    { notes: null }, { notes: {} }, { notes: 'x'.repeat(1001) }]) {
    assert.throws(() => validateCompletion(body), { status: 400 });
  }
});
