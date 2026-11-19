import { lockHouseActor } from './house-access.js';
import { getDatabase, withDatabaseTransaction } from '../database.js';
import { parseObjectId, toPublicObject } from '../models/object.js';
import { normalizePhoto, writePhotoFile, readPhotoFile, removePhotoFile } from '../storage/photo-files.js';

export async function requirePhotoUploadAccess(req, res, next) {
  const scope = req.objectScope;
  const object = await getDatabase().collection('objects').findOne(
    { _id: parseObjectId(req.params.id), ...scope }, { projection: { _id: 1 } }
  );
  if (!object) return res.status(404).json({ error: 'Objeto não encontrado.' });

  next();
}

export async function saveObjectPhoto(id, buffer, actor) {
  const _id = parseObjectId(id);
  const normalized = await normalizePhoto(buffer);
  const key = await writePhotoFile(normalized);
  const objects = getDatabase().collection('objects');
  const updatedAt = new Date();
  let previous;
  try {
    // Atualização atómica: a resposta anterior identifica apenas o ficheiro substituído.
    previous = await withDatabaseTransaction(async (database, session) => {
      await lockHouseActor(database, session, actor);
      const filter = { _id, houseId: actor.houseId };
      const found = await database.collection('objects').findOneAndUpdate(
        filter, { $set: { photoKey: key, updatedAt } }, { session, returnDocument: 'before' }
      );
      if (!found) {
        throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
      }
      return found;
    });
  } catch (error) {
    // Se houve falha na resposta da BD, confirma antes de apagar o novo ficheiro.
    try {
      const linked = await objects.findOne({ photoKey: key }, { projection: { _id: 1 } });
      if (!linked) await removePhotoFile(key);
    } catch { console.error('Limpeza de fotografia pendente após falha de ligação.'); }
    throw error;
  }
  await removePhotoFile(previous.photoKey);
  return toPublicObject({ ...previous, photoKey: key, updatedAt });
}

export async function getObjectPhoto(id, scope) {
  const object = await getDatabase().collection('objects').findOne({ _id: parseObjectId(id), ...scope });
  if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  if (!object.photoKey) throw Object.assign(new Error('Fotografia não encontrada.'), { status: 404 });
  return readPhotoFile(object.photoKey);
}

export async function deleteObjectPhoto(id, scope, actor) {
  const object = await withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor);
    return database.collection('objects').findOneAndUpdate(
      { _id: parseObjectId(id), ...scope }, { $set: { photoKey: null, updatedAt: new Date() } }, { session, returnDocument: 'before' }
    );
  });
  if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  await removePhotoFile(object.photoKey);
}
