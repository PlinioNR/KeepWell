import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
// Uma das configurações scrypt recomendadas pela OWASP: cerca de 32 MiB por cálculo.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
let activeHashes = 0;

export function validatePassword(password) {
  // Regra para criar palavras-passe: não removemos caracteres silenciosamente.
  if (typeof password !== 'string' || [...password].length < 6 || [...password].length > 20 || /\s/u.test(password)) {
    throw Object.assign(new Error('A palavra-passe deve ter entre 6 e 20 caracteres e não pode conter espaços.'), { status: 400 });
  }
}

// Partilha o limite de trabalho entre o registo e a verificação no login.
async function derivePassword(password, salt) {
  if (activeHashes >= 4) {
    throw Object.assign(new Error('Servidor ocupado. Tenta novamente dentro de momentos.'), { status: 503 });
  }
  activeHashes += 1;
  try {
    return await scryptAsync(password, salt, 64, options);
  } finally {
    activeHashes -= 1;
  }
}

export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  const hash = await derivePassword(password, salt);
  return `scrypt$${options.N}$${options.r}$${options.p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  // O login não reaplica regras novas a contas antigas; compara o texto exato.
  if (typeof password !== 'string' || password.length === 0 || [...password].length > 128) return false;

  // Aceita apenas o formato/custo que esta API gera; não executa parâmetros arbitrários.
  const match = typeof storedHash === 'string'
    ? /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(storedHash)
    : null;
  // Mesmo sem conta/hash válido, faz um cálculo para reduzir diferenças de tempo.
  const salt = match ? Buffer.from(match[1], 'hex') : Buffer.alloc(16);
  const expected = match ? Buffer.from(match[2], 'hex') : Buffer.alloc(64);
  const actual = await derivePassword(password, salt);
  const equal = timingSafeEqual(actual, expected);
  return match !== null && equal;
}
