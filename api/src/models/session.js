// Sessões são dados técnicos de autenticação, separados do perfil do utilizador.
export async function setupSessions(database) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      required: ['userId', 'tokenHash', 'createdAt', 'expiresAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        tokenHash: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },
        createdAt: { bsonType: 'date' },
        expiresAt: { bsonType: 'date' }
      }
    }
  };
  const exists = await database.listCollections({ name: 'sessions' }).hasNext();
  if (exists) {
    await database.command({ collMod: 'sessions', validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await database.createCollection('sessions', { validator, validationLevel: 'strict', validationAction: 'error' });
  }
  const sessions = database.collection('sessions');
  await sessions.createIndex({ tokenHash: 1 }, { unique: true, name: 'sessions_token_unique' });
  // TTL limpa documentos expirados em segundo plano. A API também verifica a data.
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_expiry' });
}
