import { getDatabase } from '../database.js';
import { toPublicUser } from '../models/user.js';

export async function updatePreferences(userId, body) {
  const fields = ['theme', 'remindersEnabled'];
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
    throw Object.assign(new Error('Envia theme e/ou remindersEnabled.'), { status: 400 });
  }

  // Atualiza cada preferência separadamente para preservar alterações simultâneas.
  const changes = { updatedAt: new Date() };
  if (Object.hasOwn(body, 'theme')) {
    if (!['system', 'light', 'dark'].includes(body.theme)) {
      throw Object.assign(new Error('O tema deve ser system, light ou dark.'), { status: 400 });
    }
    changes['preferences.theme'] = body.theme;
  }
  if (Object.hasOwn(body, 'remindersEnabled')) {
    if (typeof body.remindersEnabled !== 'boolean') {
      throw Object.assign(new Error('remindersEnabled deve ser true ou false.'), { status: 400 });
    }
    changes['preferences.remindersEnabled'] = body.remindersEnabled;
  }

  const user = await getDatabase().collection('users').findOneAndUpdate(
    { _id: userId }, { $set: changes }, { returnDocument: 'after' }
  );
  if (!user) throw Object.assign(new Error('Conta não encontrada.'), { status: 404 });
  return toPublicUser(user);
}
