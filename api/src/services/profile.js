import { validateLogin } from './authentication.js';
import { verifyPassword } from '../security/password.js';
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


export async function updateEmail(user, body) {
  const { email, password } = validateLogin(body);
  if (!await verifyPassword(password, user.passwordHash)) {
    throw Object.assign(new Error('Palavra-passe atual incorreta.'), { status: 401 });
  }

  try {
    // Confirma que as credenciais verificadas ainda são as da conta no momento da escrita.
    const updated = await getDatabase().collection('users').findOneAndUpdate(
      { _id: user._id, passwordHash: user.passwordHash, email: user.email },
      { $set: { email, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      throw Object.assign(new Error('A conta foi alterada entretanto. Tenta novamente.'), { status: 409 });
    }
    return toPublicUser(updated);
  } catch (error) {
    if (error.code === 11000) {
      throw Object.assign(new Error('Este email já está em uso.'), { status: 409 });
    }
    throw error;
  }
}
