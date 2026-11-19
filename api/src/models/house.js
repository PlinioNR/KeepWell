export function buildHouse(ownerName) {
  const firstName = ownerName.trim().split(/\s+/u, 1)[0];
  const now = new Date();
  return {
    name: `Casa de ${firstName}`,
    inviteCode: null,
    inviteExpiresAt: null,
    createdAt: now,
    updatedAt: now
  };
}

export async function setupHouses(database) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      additionalProperties: false,
      required: ['name', 'inviteCode', 'inviteExpiresAt', 'createdAt', 'updatedAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        referenceVersion: { bsonType: ['int', 'long', 'double'] },
        name: { bsonType: 'string', minLength: 2, maxLength: 108 },
        inviteCode: { bsonType: ['string', 'null'], pattern: '^[A-HJ-NP-Z2-9]{8}$' },
        inviteExpiresAt: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  };
  const exists = await database.listCollections({ name: 'houses' }).hasNext();
  if (exists) {
    await database.command({ collMod: 'houses', validator });
  } else {
    await database.createCollection('houses', { validator });
  }
  await database.collection('houses').createIndex({ inviteCode: 1 }, {
    name: 'houses_invite_code_unique',
    unique: true,
    partialFilterExpression: { inviteCode: { $type: 'string' } }
  });
}
