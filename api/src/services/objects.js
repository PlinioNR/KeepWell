import { ObjectId } from 'mongodb';
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
  if (Object.keys(query).some(key => !['page', 'pageSize', 'search', 'categoryId'].includes(key))) {
    throw Object.assign(new Error('Parâmetros permitidos: page, pageSize, search e categoryId.'), { status: 400 });
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

// Constrói o filtro a partir de valores simples; não copia operadores enviados pelo cliente.
export function parseObjectFilters(query = {}, userId) {
  const filter = { userId };
  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      throw Object.assign(new Error('A pesquisa deve ser um texto único.'), { status: 400 });
    }
    const search = query.search.trim().replace(/\s+/gu, ' ');
    if ([...search].length > 100) {
      throw Object.assign(new Error('A pesquisa deve ter no máximo 100 caracteres.'), { status: 400 });
    }
    if (search) {
      // Escapa os símbolos de expressões regulares para procurar texto literal.
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }
  }
  if (query.categoryId !== undefined) {
    if (typeof query.categoryId !== 'string') {
      throw Object.assign(new Error('Seleciona uma categoria válida.'), { status: 400 });
    }
    const categoryId = query.categoryId.trim();
    // Valor vazio significa Todas as categorias no select.
    if (categoryId) {
      if (!/^[a-f0-9]{24}$/i.test(categoryId)) {
        throw Object.assign(new Error('Seleciona uma categoria válida.'), { status: 400 });
      }
      filter.categoryId = new ObjectId(categoryId);
    }
  }
  return filter;
}

export async function listObjects(userId, query = {}) {
  const { page, pageSize } = parseObjectPagination(query);
  const collection = getDatabase().collection('objects');
  // Mesmo um administrador só consulta os seus objetos pessoais nestas rotas.
  const filter = parseObjectFilters(query, userId);
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

export async function updateObject(id, body, userId) {
  const _id = parseObjectId(id);
  return withDatabaseTransaction(async (database, session) => {
    const objects = database.collection('objects');
    const current = await objects.findOne({ _id, userId }, { session });
    if (!current) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
    // PATCH aceita os campos editáveis; um pedido vazio não altera datas.
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length ||
        Object.keys(body).some(key => !['name', 'categoryId', 'acquiredOn', 'description'].includes(key))) {
      throw Object.assign(new Error('Envia name, categoryId, acquiredOn e/ou description.'), { status: 400 });
    }
    const validated = buildObject({
      name: Object.hasOwn(body, 'name') ? body.name : current.name,
      categoryId: Object.hasOwn(body, 'categoryId') ? body.categoryId : current.categoryId.toString(),
      acquiredOn: Object.hasOwn(body, 'acquiredOn') ? body.acquiredOn : current.acquiredOn,
      description: Object.hasOwn(body, 'description') ? body.description : current.description
    }, userId);
    if (!validated.categoryId.equals(current.categoryId)) {
      // Usa o mesmo protocolo da criação para coordenar com deleteCategory.
      const category = await database.collection('categories').findOneAndUpdate(
        { _id: validated.categoryId }, { $inc: { referenceVersion: 1 } },
        { session, returnDocument: 'after', projection: { _id: 1 } }
      );
      if (!category) throw Object.assign(new Error('A categoria selecionada não existe.'), { status: 400 });
    }
    const updated = await objects.findOneAndUpdate(
      { _id, userId },
      { $set: { name: validated.name, description: validated.description, categoryId: validated.categoryId, acquiredOn: validated.acquiredOn, updatedAt: validated.updatedAt } },
      { session, returnDocument: 'after' }
    );
    if (!updated) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
    return toPublicObject(updated);
  });
}

export async function deleteObject(id, userId) {
  const _id = parseObjectId(id);
  return withDatabaseTransaction(async (database, session) => {
    // Escrita no objeto para coordenar com futuras criações de tarefas.
    const object = await database.collection('objects').findOneAndUpdate(
      { _id, userId }, { $inc: { referenceVersion: 1 } },
      { session, returnDocument: 'after', projection: { _id: 1 } }
    );
    if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
    const task = await database.collection('tasks').findOne({ objectId: _id }, { session, projection: { _id: 1 } });
    if (task) {
      throw Object.assign(new Error('O objeto tem tarefas associadas e não pode ser eliminado.'), { status: 409 });
    }
    await database.collection('objects').deleteOne({ _id, userId }, { session });
  });
}



