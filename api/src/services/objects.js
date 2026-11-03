import { getDatabase, withDatabaseTransaction } from '../database.js';
import { buildObject, parseObjectId, toPublicObject } from '../models/object.js';

export async function createObject(body, userId) {
  const object = buildObject(body, userId);
  return withDatabaseTransaction(async (database, session) => {
    // Escrita comum à criação e eliminação da categoria: evita referências órfãs.
    // referenceVersion é um contador técnico interno, não uma contagem de objetos.
    const category = await database.collection('categories').findOneAndUpdate(
      { _id: object.categoryId }, { $inc: { referenceVersion: 1 } },
      { session, returnDocument: 'after', projection: { _id: 1 } }
    );
    if (!category) throw Object.assign(new Error('A categoria selecionada não existe.'), { status: 400 });
    const result = await database.collection('objects').insertOne(object, { session });
    return toPublicObject({ ...object, _id: result.insertedId });
  });
}

export function parseObjectPagination(query = {}) {
  if (Object.keys(query).some(key => !['page', 'pageSize'].includes(key))) {
    throw Object.assign(new Error('Parâmetros permitidos: page e pageSize.'), { status: 400 });
  }
  function number(value, fallback, max) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw Object.assign(new Error('A paginação exige números inteiros positivos.'), { status: 400 });
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > max) {
      throw Object.assign(new Error('Valor de paginação fora do limite permitido.'), { status: 400 });
    }
    return parsed;
  }
  return { page: number(query.page, 1, 1000000), pageSize: number(query.pageSize, 20, 100) };
}

export async function listObjects(userId, query) {
  const { page, pageSize } = parseObjectPagination(query);
  const collection = getDatabase().collection('objects');
  // Mesmo um administrador só consulta os seus objetos pessoais nestas rotas.
  const filter = { userId };
  const [objects, total] = await Promise.all([
    collection.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(filter)
  ]);
  return { objects: objects.map(toPublicObject), page, pageSize, total };
}

export async function getObject(id, userId) {
  const object = await getDatabase().collection('objects').findOne({ _id: parseObjectId(id), userId });
  // Mesma resposta para inexistente ou de outra pessoa: não revela os seus dados.
  if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  return toPublicObject(object);
}
