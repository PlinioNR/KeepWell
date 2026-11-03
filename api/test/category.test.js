import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { buildCategory, toPublicCategory } from '../src/models/category.js';

test('normaliza os espaços no nome e aceita os limites de comprimento', () => {
  assert.equal(buildCategory({ name: '  Roupa   e\tcalçado  ' }).name, 'Roupa e calçado');
  assert.doesNotThrow(() => buildCategory({ name: 'ab' }));
  assert.doesNotThrow(() => buildCategory({ name: 'á'.repeat(60) }));
  assert.ok(buildCategory({ name: 'Eletrónica' }).createdAt instanceof Date);
});

test('rejeita nomes vazios, tipos incorretos e nomes fora dos limites', () => {
  assert.throws(() => buildCategory());
  for (const name of [null, 123, {}, [], '', '  ', 'a', 'x'.repeat(61)]) {
    assert.throws(() => buildCategory({ name }));
  }
});

test('seleciona apenas os campos permitidos no documento e na resposta', () => {
  const category = buildCategory({ name: 'Eletrónica', userId: 'externo', extra: true });
  assert.ok(!('userId' in category));
  const id = new ObjectId();
  const result = toPublicCategory({ ...category, _id: id, internal: 'oculto' });
  assert.equal(result.id, id.toString());
  assert.ok(!('internal' in result));
});
