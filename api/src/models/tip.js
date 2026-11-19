export async function setupTips(database) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      // A categoria antiga só é aceite durante a migração dos dados existentes.
      anyOf: [{ required: ['categoryId'] }, { required: ['houseId', 'objectId'] }],
      required: ['title', 'text', 'createdAt', 'updatedAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        categoryId: { bsonType: 'objectId' },
        houseId: { bsonType: 'objectId' },
        objectId: { bsonType: 'objectId' },
        videoUrl: { bsonType: ['string', 'null'], maxLength: 2048, pattern: '^https?://' },
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
  await database.collection('tips').createIndex(
    { houseId: 1, objectId: 1, title: 1, _id: 1 }, { name: 'tips_house_object' }
  );
}

export function toPublicTip({ _id, objectId, title, text, videoUrl, createdAt, updatedAt }) {
  return {
    id: _id.toString(), objectId: objectId.toString(), title, text,
    videoUrl: videoUrl ?? null, createdAt, updatedAt
  };
}
