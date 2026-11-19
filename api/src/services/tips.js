import { lockHouseActor } from './house-access.js';
import { ObjectId } from 'mongodb';
import { getDatabase, withDatabaseTransaction } from '../database.js';
import { toPublicTip } from '../models/tip.js';
import { parseObjectId } from '../models/object.js';
import { parseCategorySearch } from './categories.js';
import { parseTaskPagination } from './tasks.js';

function parseTipId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de dica inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

function parseVideoUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const url = value.trim();
    if (!url) return null;
    if (url.length <= 2048 && /^https?:\/\//i.test(url) && !/\s/u.test(url)) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname && !parsed.username && !parsed.password) return parsed.href;
      } catch { /* A mensagem abaixo cobre URLs malformados. */ }
    }
  }
  throw Object.assign(new Error('O vídeo deve ter um link HTTP ou HTTPS válido, até 2048 caracteres.'), { status: 400 });
}

function tipFields(body, partial = false) {
  const fields = ['title', 'text', 'objectId', 'videoUrl'];
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
    throw Object.assign(new Error('Envia title, text, objectId e/ou videoUrl.'), { status: 400 });
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
  if (!partial || Object.hasOwn(body, 'objectId')) changes.objectId = parseObjectId(body.objectId);
  if (!partial || Object.hasOwn(body, 'videoUrl')) changes.videoUrl = parseVideoUrl(body.videoUrl);
  return changes;
}

async function confirmObject(database, session, objectId, houseId) {
  // Coordena a criação/mudança da dica com a eliminação do objeto.
  const result = await database.collection('objects').updateOne(
    { _id: objectId, houseId }, { $inc: { referenceVersion: 1 } }, { session }
  );
  if (!result.matchedCount) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
}

export async function listTips({ objectId, search, ...pagination }, scope) {
  const { page, pageSize } = parseTaskPagination(pagination);
  const filter = { ...scope, objectId: { $type: 'objectId' } };
  if (objectId !== undefined) {
    filter.objectId = parseObjectId(objectId);
    const object = await getDatabase().collection('objects').findOne(
      { _id: filter.objectId, ...scope }, { projection: { _id: 1 } }
    );
    if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  }
  const { name } = parseCategorySearch({ search });
  if (name) filter.title = name;
  const collection = getDatabase().collection('tips');
  const [tips, total] = await Promise.all([
    collection.find(filter).sort({ title: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(filter)
  ]);
  return { tips: tips.map(toPublicTip), page, pageSize, total };
}

export async function getTip(id, scope) {
  const tip = await getDatabase().collection('tips').findOne({
    _id: parseTipId(id), ...scope, objectId: { $type: 'objectId' }
  });
  if (!tip) throw Object.assign(new Error('Dica não encontrada.'), { status: 404 });
  return toPublicTip(tip);
}

export async function createTip(body, actor) {
  const fields = tipFields(body);
  return withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor, ['owner', 'manager']);
    await confirmObject(database, session, fields.objectId, actor.houseId);
    const now = new Date();
    const tip = { ...fields, houseId: actor.houseId, createdAt: now, updatedAt: now };
    const { insertedId } = await database.collection('tips').insertOne(tip, { session });
    return toPublicTip({ ...tip, _id: insertedId });
  });
}

export async function updateTip(id, body, actor) {
  const _id = parseTipId(id);
  const changes = tipFields(body, true);
  return withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor, ['owner', 'manager']);
    const filter = { _id, houseId: actor.houseId, objectId: { $type: 'objectId' } };
    const current = await database.collection('tips').findOne(filter, { session });
    if (!current) throw Object.assign(new Error('Dica não encontrada.'), { status: 404 });
    await confirmObject(database, session, changes.objectId ?? current.objectId, actor.houseId);
    const tip = await database.collection('tips').findOneAndUpdate(
      filter, { $set: { ...changes, updatedAt: new Date() } }, { session, returnDocument: 'after' }
    );
    return toPublicTip(tip);
  });
}

export async function deleteTip(id, actor) {
  return withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor, ['owner', 'manager']);
    const result = await database.collection('tips').deleteOne({
      _id: parseTipId(id), houseId: actor.houseId, objectId: { $type: 'objectId' }
    }, { session });
    if (!result.deletedCount) throw Object.assign(new Error('Dica não encontrada.'), { status: 404 });
  });
}
