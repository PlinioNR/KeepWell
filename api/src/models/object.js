import { ObjectId } from 'mongodb';

export function parseObjectId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de objeto inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

export function buildObject(body, userId) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['name', 'categoryId'].includes(key))) {
    throw Object.assign(new Error('Envia apenas name e categoryId.'), { status: 400 });
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
  return { name, userId, categoryId: new ObjectId(body.categoryId), createdAt: now, updatedAt: now };
}

export function toPublicObject(object) {
  return {
    id: object._id.toString(), name: object.name, categoryId: object.categoryId.toString(),
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
        name: { bsonType: 'string', minLength: 2, maxLength: 100, pattern: '^\\S(?:[\\s\\S]*\\S)$' },
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
