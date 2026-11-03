import { createHash, randomBytes } from 'node:crypto';
import { getDatabase } from '../database.js';
import { verifyPassword } from '../security/password.js';
import { toPublicUser } from '../models/user.js';

const sessionDurationMs = 24 * 60 * 60 * 1000;

// SHA-256 serve para este token aleatório, não para palavras-passe escolhidas por pessoas.
export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function readBearerToken(header) {
  if (typeof header !== 'string') return null;
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(header);
  return match ? match[1] : null;
}

export function validateLogin(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((key) => !['email', 'password'].includes(key)) ||
      typeof body.email !== 'string' || typeof body.password !== 'string' ||
      !body.password || [...body.password].length > 128) {
    throw Object.assign(new Error('Envia email e password válidos.'), { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('Envia email e password válidos.'), { status: 400 });
  }
  return { email, password: body.password };
}

export async function loginUser(body) {
  const { email, password } = validateLogin(body);
  const database = getDatabase();
  const user = await database.collection('users').findOne({ email });
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid) {
    throw Object.assign(new Error('Email ou palavra-passe incorretos.'), { status: 401 });
  }

  // O token original só é devolvido ao cliente. Na BD fica o respetivo hash.
  const token = randomBytes(32).toString('hex');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + sessionDurationMs);
  await database.collection('sessions').insertOne({
    userId: user._id, tokenHash: hashSessionToken(token), createdAt, expiresAt
  });
  return { token, tokenType: 'Bearer', expiresAt, user: toPublicUser(user) };
}

export async function findSessionUser(token) {
  const database = getDatabase();
  // TTL não elimina imediatamente: este filtro impede usar uma sessão já expirada.
  const session = await database.collection('sessions').findOne({
    tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() }
  });
  if (!session) return null;
  // Consulta o perfil atual; não confia em perfis enviados pelo cliente.
  const user = await database.collection('users').findOne({ _id: session.userId });
  return user ? { sessionId: session._id, user } : null;
}

export async function logoutSession(sessionId) {
  await getDatabase().collection('sessions').deleteOne({ _id: sessionId });
}
