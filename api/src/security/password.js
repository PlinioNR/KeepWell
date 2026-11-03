import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
// Uma das configurações scrypt recomendadas pela OWASP: cerca de 32 MiB por cálculo.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
let activeHashes = 0;

export function validatePassword(password) {
  // Valida o formato pedido sem remover caracteres ou alterar a palavra-passe.
  if (typeof password !== 'string' || [...password].length < 6 || [...password].length > 20 || /\s/u.test(password)) {
    throw Object.assign(new Error('A palavra-passe deve ter entre 6 e 20 caracteres e não pode conter espaços.'), { status: 400 });
  }
}

export async function hashPassword(password) {
  validatePassword(password);
  // Evita acumular cálculos e memória em caso de muitos pedidos simultâneos.
  if (activeHashes >= 4) {
    throw Object.assign(new Error('Servidor ocupado. Tenta novamente dentro de momentos.'), { status: 503 });
  }
  activeHashes += 1;
  try {
    const salt = randomBytes(16);
    const hash = await scryptAsync(password, salt, 64, options);
    // Guardamos algoritmo, custo, salt e resultado para permitir a futura verificação.
    return `scrypt$${options.N}$${options.r}$${options.p}$${salt.toString('hex')}$${hash.toString('hex')}`;
  } finally {
    activeHashes -= 1;
  }
}

