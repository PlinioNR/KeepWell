import { getDatabase } from '../database.js';
import { normalizeUserName, toPublicUser } from '../models/user.js';

export async function updateProfile(userId, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !Object.hasOwn(body, 'name')) {
    throw Object.assign(new Error('Envia apenas name.'), { status: 400 });
  }
  let name;
  try {
    name = normalizeUserName(body.name);
  } catch (error) {
    throw Object.assign(error, { status: 400 });
  }
  const user = await getDatabase().collection('users').findOneAndUpdate(
    { _id: userId }, { $set: { name, updatedAt: new Date() } }, { returnDocument: 'after' }
  );
  if (!user) throw Object.assign(new Error('Conta não encontrada.'), { status: 404 });
  return toPublicUser(user);
}
