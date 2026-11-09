// Regras da coleção users. O MongoDB valida também escritas feitas fora da API.
export const userValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['name', 'email', 'passwordHash', 'role', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
      _id: { bsonType: 'objectId' },
      name: { bsonType: 'string', minLength: 2, maxLength: 100, pattern: '^\\S(?:[\\s\\S]*\\S)$' },
      email: {
        bsonType: 'string', maxLength: 254,
        pattern: '^[^\\s@A-Z]+@[^\\s@A-Z]+\\.[^\\s@A-Z]+$'
      },
      passwordHash: { bsonType: 'string', minLength: 1 },
      role: { enum: ['user', 'admin'] },
      preferences: {
        bsonType: 'object', additionalProperties: false,
        properties: {
          theme: { enum: ['system', 'light', 'dark'] },
          remindersEnabled: { bsonType: 'bool' }
        }
      },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' }
    }
  }
};

// Recebe um hash já calculado pelo serviço de registo/autenticação, não a palavra-passe.
// Apenas escolhemos os campos permitidos: nunca copiamos todo o pedido do cliente.
export function buildUser({ name, email, passwordHash } = {}) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    throw new Error('O nome deve ter entre 2 e 100 caracteres.');
  }
  if (typeof email !== 'string') throw new Error('Indica um email válido.');
  const normalizedEmail = email.trim().toLowerCase();
  // Verificação de formato básica; não confirma que a caixa de correio existe.
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Indica um email válido.');
  }
  if (typeof passwordHash !== 'string' || !passwordHash.trim()) {
    throw new Error('É necessário fornecer o hash da palavra-passe.');
  }

  const now = new Date();
  return {
    name: name.trim(), email: normalizedEmail, passwordHash,
    role: 'user', createdAt: now, updatedAt: now
  };
}

// Lista explícita dos campos que podem sair da API: exclui sempre o hash.
export function toPublicUser(user) {
  return {
    id: user._id.toString(), name: user.name, email: user.email,
    preferences: {
      theme: user.preferences?.theme ?? 'system',
      remindersEnabled: user.preferences?.remindersEnabled ?? false
    },
    role: user.role, createdAt: user.createdAt, updatedAt: user.updatedAt
  };
}

// Comando de preparação, executado separadamente do servidor.
// Repetir aplica as mesmas regras sem eliminar documentos ou coleções.
export async function setupUsers(database) {
  const exists = await database.listCollections({ name: 'users' }).hasNext();
  if (exists) {
    await database.command({
      collMod: 'users', validator: userValidator,
      validationLevel: 'strict', validationAction: 'error'
    });
  } else {
    await database.createCollection('users', {
      validator: userValidator, validationLevel: 'strict', validationAction: 'error'
    });
  }
  // A collation impede também duplicados que diferem apenas em maiúsculas.
  // O índice é a garantia contra dois registos simultâneos com o mesmo email.
  await database.collection('users').createIndex({ email: 1 }, {
    unique: true, name: 'users_email_unique',
    collation: { locale: 'en', strength: 2 }
  });
}


