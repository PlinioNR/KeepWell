import { ObjectId } from 'mongodb';

export function parseObjectId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de objeto inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

// Data de calendário sem hora: evita mudar de dia por causa do fuso horário.
export function validateAcquiredOn(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error('A data de aquisição deve usar AAAA-MM-DD ou null.'), { status: 400 });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error('A data de aquisição não existe no calendário.'), { status: 400 });
  }
  return value;
}
export function buildObject(body, userId) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['name', 'categoryId', 'acquiredOn'].includes(key))) {
    throw Object.assign(new Error('Envia apenas name, categoryId e acquiredOn.'), { status: 400 });
  }
  if (typeof body.name !== 'string') {
    throw Object.assign(new Error('Indica o nome do objeto.'), { status: 400 });
  }
  const name = body.name.trim().replace(/\s+/gu, ' ');
  if ([...name].length < 2 || [...name].length > 100) {
    throw Object.assign(new Error('O nome do objeto deve ter entre 2 e 100 caracteres.'), { status: 400 });
  }
  if (typeof body.categoryId !== 'string' || !/^[a-f0-9]{24}$/i.test(body.categoryId)) {
    throw Object.assign(new Error('Seleciona uma categoria válida.'), { status: 400 });
  }
  // O dono vem da sessão, nunca de body.userId.
  if (!(userId instanceof ObjectId)) throw new Error('Utilizador autenticado inválido.');
  const now = new Date();
  return { name, userId, categoryId: new ObjectId(body.categoryId), acquiredOn: validateAcquiredOn(body.acquiredOn), createdAt: now, updatedAt: now };
}

export function toPublicObject(object) {
  return {
    id: object._id.toString(), name: object.name, categoryId: object.categoryId.toString(), acquiredOn: object.acquiredOn ?? null,
    createdAt: object.createdAt, updatedAt: object.updatedAt
  };
}

export async function setupObjects(database) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      required: ['name', 'userId', 'categoryId', 'createdAt', 'updatedAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        referenceVersion: { bsonType: ['int', 'long'], minimum: 0 },
        name: { bsonType: 'string', minLength: 2, maxLength: 100, pattern: '^\\S(?:[\\s\\S]*\\S)$' },
        acquiredOn: { bsonType: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        userId: { bsonType: 'objectId' }, categoryId: { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' }, updatedAt: { bsonType: 'date' }
      }
    }
  };
  const exists = await database.listCollections({ name: 'objects' }).hasNext();
  if (exists) {
    await database.command({ collMod: 'objects', validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await database.createCollection('objects', { validator, validationLevel: 'strict', validationAction: 'error' });
  }
  await database.collection('objects').createIndex({ userId: 1, createdAt: -1, _id: -1 }, { name: 'objects_owner_date' });
  await database.collection('objects').createIndex({ categoryId: 1 }, { name: 'objects_category' });
}


