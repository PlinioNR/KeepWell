import { ObjectId } from 'mongodb';
import { getDatabase, withDatabaseTransaction } from '../database.js';
import { toPublicTip } from '../models/tip.js';
import { parseCategoryId, parseCategorySearch } from './categories.js';
import { parseTaskPagination } from './tasks.js';

function parseTipId(id) {
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de dica inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

function tipFields(body, partial = false) {
  const fields = ['title', 'text', 'categoryId'];
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
    throw Object.assign(new Error('Envia title, text e categoryId.'), { status: 400 });
  }
  const changes = {};
  for (const [key, minimum, maximum] of [['title', 2, 120], ['text', 1, 3000]]) {
    if (partial && !Object.hasOwn(body, key)) continue;
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    const length = [...value].length;
    if (length < minimum || length > maximum) {
      throw Object.assign(new Error(`O campo ${key} deve ter entre ${minimum} e ${maximum} caracteres.`), { status: 400 });
    }
    changes[key] = value;
  }
  if (!partial || Object.hasOwn(body, 'categoryId')) changes.categoryId = parseCategoryId(body.categoryId);
  return changes;
}

async function confirmCategory(database, session, categoryId) {
  // Escreve na categoria para coordenar com a transação de eliminação.
  const result = await database.collection('categories').updateOne(
    { _id: categoryId }, { $inc: { referenceVersion: 1 } }, { session }
  );
  if (!result.matchedCount) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
}

export async function listTips({ categoryId, search, ...pagination }) {
  const { page, pageSize } = parseTaskPagination(pagination);
  const filter = {};
  if (categoryId !== undefined) filter.categoryId = parseCategoryId(categoryId);
  const { name } = parseCategorySearch({ search });
  if (name) filter.title = name;
  const collection = getDatabase().collection('tips');
  const [tips, total] = await Promise.all([
    collection.find(filter).sort({ title: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(filter)
  ]);
  return { tips: tips.map(toPublicTip), page, pageSize, total };
}

export async function getTip(id) {
  const tip = await getDatabase().collection('tips').findOne({ _id: parseTipId(id) });
  if (!tip) throw Object.assign(new Error('Dica não encontrada.'), { status: 404 });
  return toPublicTip(tip);
}

export async function createTip(body) {
  const fields = tipFields(body);
  return withDatabaseTransaction(async (database, session) => {
    await confirmCategory(database, session, fields.categoryId);
    const now = new Date();
    const tip = { ...fields, createdAt: now, updatedAt: now };
    const { insertedId } = await database.collection('tips').insertOne(tip, { session });
    return toPublicTip({ ...tip, _id: insertedId });
  });
}

export async function updateTip(id, body) {
  const _id = parseTipId(id);
  const changes = tipFields(body, true);
  return withDatabaseTransaction(async (database, session) => {
    if (changes.categoryId) await confirmCategory(database, session, changes.categoryId);
    const tip = await database.collection('tips').findOneAndUpdate(
      { _id }, { $set: { ...changes, updatedAt: new Date() } }, { session, returnDocument: 'after' }
    );
    if (!tip) throw Object.assign(new Error('Dica não encontrada.'), { status: 404 });
    return toPublicTip(tip);
  });
}

export async function deleteTip(id) {
  const result = await getDatabase().collection('tips').deleteOne({ _id: parseTipId(id) });
  if (!result.deletedCount) throw Object.assign(new Error('Dica não encontrada.'), { status: 404 });
}
