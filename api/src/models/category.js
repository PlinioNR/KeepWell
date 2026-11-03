// Categoria partilhada pelos objetos e, futuramente, pelas dicas.
export function buildCategory({ name } = {}) {
  if (typeof name !== 'string') throw new Error('Indica o nome da categoria.');
  // Remove espaços nas extremidades e reduz espaços repetidos a um só.
  const normalizedName = name.trim().replace(/\s+/gu, ' ');
  if ([...normalizedName].length < 2 || [...normalizedName].length > 60) {
    throw new Error('O nome da categoria deve ter entre 2 e 60 caracteres.');
  }
  const now = new Date();
  return { name: normalizedName, createdAt: now, updatedAt: now };
}

export function toPublicCategory(category) {
  return {
    id: category._id.toString(), 
    name: category.name,
    createdAt: category.createdAt, 
    updatedAt: category.updatedAt
  };
}

export async function setupCategories(database) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      required: ['name', 'createdAt', 'updatedAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        name: { bsonType: 'string', minLength: 2, maxLength: 60, pattern: '^\\S(?:[\\s\\S]*\\S)$' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  };
  const exists = await database.listCollections({ name: 'categories' }).hasNext();
  if (exists) {
    await database.command({ collMod: 'categories', validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await database.createCollection('categories', { validator, validationLevel: 'strict', validationAction: 'error' });
  }
  // Distingue acentos, mas não distingue maiúsculas de minúsculas.
  await database.collection('categories').createIndex({ name: 1 }, {
    name: 'categories_name_unique', unique: true,
    collation: { locale: 'pt', strength: 2 }
  });
}
