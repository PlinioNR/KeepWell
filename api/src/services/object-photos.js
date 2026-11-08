import { getDatabase } from '../database.js';
import { parseObjectId, toPublicObject } from '../models/object.js';
import { normalizePhoto, writePhotoFile, readPhotoFile, removePhotoFile } from '../storage/photo-files.js';

export async function requirePhotoOwner(req, res, next) {
  const object = await getDatabase().collection('objects').findOne(
    { _id: parseObjectId(req.params.id), userId: req.auth.user._id }, { projection: { _id: 1 } }
  );
  if (!object) return res.status(404).json({ error: 'Objeto não encontrado.' });
  next();
}

export async function saveObjectPhoto(id, userId, buffer) {
  const _id = parseObjectId(id);
  const normalized = await normalizePhoto(buffer);
  const key = await writePhotoFile(normalized);
  const objects = getDatabase().collection('objects');
  const updatedAt = new Date();
  let previous;
  try {
    // Atualização atómica: a resposta anterior identifica apenas o ficheiro substituído.
    previous = await objects.findOneAndUpdate(
      { _id, userId }, { $set: { photoKey: key, updatedAt } }, { returnDocument: 'before' }
    );
  } catch (error) {
    // Se houve falha na resposta da BD, confirma antes de apagar o novo ficheiro.
    try {
      const linked = await objects.findOne({ photoKey: key }, { projection: { _id: 1 } });
      if (!linked) await removePhotoFile(key);
    } catch { console.error('Limpeza de fotografia pendente após falha de ligação.'); }
    throw error;
  }
  if (!previous) {
    await removePhotoFile(key);
    throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  }
  await removePhotoFile(previous.photoKey);
  return toPublicObject({ ...previous, photoKey: key, updatedAt });
}

export async function getObjectPhoto(id, userId) {
  const object = await getDatabase().collection('objects').findOne({ _id: parseObjectId(id), userId });
  if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  if (!object.photoKey) throw Object.assign(new Error('Fotografia não encontrada.'), { status: 404 });
  return readPhotoFile(object.photoKey);
}

export async function deleteObjectPhoto(id, userId) {
  const object = await getDatabase().collection('objects').findOneAndUpdate(
    { _id: parseObjectId(id), userId }, { $set: { photoKey: null, updatedAt: new Date() } }, { returnDocument: 'before' }
  );
  if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  await removePhotoFile(object.photoKey);
}
