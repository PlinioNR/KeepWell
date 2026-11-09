export async function setupTips(database) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      required: ['categoryId', 'title', 'text', 'createdAt', 'updatedAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        categoryId: { bsonType: 'objectId' },
        title: { bsonType: 'string', minLength: 2, maxLength: 120 },
        text: { bsonType: 'string', minLength: 1, maxLength: 3000 },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  };
  if (await database.listCollections({ name: 'tips' }).hasNext()) {
    await database.command({ collMod: 'tips', validator, validationAction: 'error', validationLevel: 'strict' });
  } else {
    await database.createCollection('tips', { validator });
  }
  await database.collection('tips').createIndex({ categoryId: 1, title: 1, _id: 1 });
}

export function toPublicTip({ _id, categoryId, title, text, createdAt, updatedAt }) {
  return { id: _id.toString(), categoryId: categoryId.toString(), title, text, createdAt, updatedAt };
}
