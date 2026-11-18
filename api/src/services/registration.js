import { withDatabaseTransaction } from '../database.js';
import { buildHouse } from '../models/house.js';
import { buildUser, toPublicUser } from '../models/user.js';
import { hashPassword, validatePassword } from '../security/password.js';

// Faz apenas validação e normalização. Não calcula o hash nem escreve na BD.
export function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Envia um objeto JSON com name, email e password.'), { status: 400 });
  }
  const allowedFields = ['name', 'email', 'password'];
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    throw Object.assign(new Error('O registo aceita apenas name, email e password.'), { status: 400 });
  }
  validatePassword(body.password);
  let normalized;
  try {
    // Reutiliza as regras do modelo antes de gastar recursos no hash real.
    normalized = buildUser({ name: body.name, email: body.email, passwordHash: 'validation-only' });
  } catch (error) {
    throw Object.assign(new Error(error.message), { status: 400 });
  }
  return { name: normalized.name, email: normalized.email, password: body.password };
}

export async function registerUser(body) {
  const { name, email, password } = validateRegistration(body);
  const passwordHash = await hashPassword(password);
  const user = buildUser({ name, email, passwordHash });
  try {
    // O índice único impede duplicados mesmo quando os pedidos chegam ao mesmo tempo.
    return await withDatabaseTransaction(async (database, session) => {
      const { insertedId: houseId } = await database.collection('houses').insertOne(buildHouse(user.name), { session });
      const owner = { ...user, houseId, houseRole: 'owner' };
      const { insertedId: userId } = await database.collection('users').insertOne(owner, { session });
      return toPublicUser({ ...owner, _id: userId });
    });
  } catch (error) {
    if (error.code === 11000) {
      throw Object.assign(new Error('Já existe uma conta com este email.'), { status: 409 });
    }
    throw error;
  }
}
