import { ObjectId } from 'mongodb';
import { getDatabase, withDatabaseTransaction } from '../database.js';
import { buildCategory, toPublicCategory } from '../models/category.js';

export function parseCategoryId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de categoria inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

export function validateCategoryInput(body, current) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['name', 'icon', 'description'].includes(key)) || !Object.keys(body).length) {
    throw Object.assign(new Error('Envia name, icon e/ou description, sem campos adicionais.'), { status: 400 });
  }
  try { return buildCategory(current ? { name: current.name, icon: current.icon ?? 'package', description: current.description ?? '', ...body } : body); }
  catch (error) { throw Object.assign(new Error(error.message), { status: 400 }); }
}

function duplicateError(error) {
  if (error.code === 11000) {
    return Object.assign(new Error('Já existe uma categoria com este nome.'), { status: 409 });
  }
  return error;
}

export function parseCategorySearch(query = {}) {
  if (Object.keys(query).some(key => key !== 'search') ||
      (query.search !== undefined && typeof query.search !== 'string')) {
    throw Object.assign(new Error('Usa apenas search com um texto único.'), { status: 400 });
  }
  const search = (query.search ?? '').trim().replace(/\s+/gu, ' ');
  if ([...search].length > 60) throw Object.assign(new Error('A pesquisa deve ter até 60 caracteres.'), { status: 400 });
  return search ? { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {};
}

export async function listCategories(query = {}, isAdmin = false) {
  const database = getDatabase();
  const categories = await database.collection('categories')
    .find(parseCategorySearch(query)).collation({ locale: 'pt', strength: 2 }).sort({ name: 1 }).toArray();
  const result = categories.map(toPublicCategory);
  if (!isAdmin || !categories.length) return result;
  // Só o administrador recebe contagens globais, calculadas a partir dos objetos.
  const counts = await database.collection('objects').aggregate([
    { $match: { categoryId: { $in: categories.map(category => category._id) } } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } }
  ]).toArray();
  const byId = new Map(counts.map(item => [item._id.toString(), item.count]));
  return result.map(category => ({ ...category, objectCount: byId.get(category.id) ?? 0 }));
}
export async function getCategory(id) {
  const category = await getDatabase().collection('categories').findOne({ _id: parseCategoryId(id) });
  if (!category) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
  return toPublicCategory(category);
}

export async function createCategory(body) {
  const category = validateCategoryInput(body);
  try {
    const result = await getDatabase().collection('categories').insertOne(category);
    return toPublicCategory({ ...category, _id: result.insertedId });
  } catch (error) { throw duplicateError(error); }
}

export async function updateCategory(id, body) {
  const _id = parseCategoryId(id);
  const collection = getDatabase().collection('categories');
  const current = await collection.findOne({ _id });
  if (!current) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
  const category = validateCategoryInput(body, current);
  const changes = { updatedAt: category.updatedAt };
  for (const key of ['name', 'icon', 'description']) {
    if (Object.hasOwn(body, key)) changes[key] = category[key];
  }
  try {
    const updated = await collection.findOneAndUpdate({ _id }, { $set: changes }, { returnDocument: 'after' });
    if (!updated) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
    return toPublicCategory(updated);
  } catch (error) { throw duplicateError(error); }
}
export async function deleteCategory(id) {
  const _id = parseCategoryId(id);
  return withDatabaseTransaction(async (database, session) => {
    // Obtém uma escrita na mesma categoria usada pela criação de objetos.
    const category = await database.collection('categories').findOneAndUpdate(
      { _id }, { $inc: { referenceVersion: 1 } },
      { session, returnDocument: 'after', projection: { _id: 1 } }
    );
    if (!category) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
    // Operações da mesma transação são executadas em sequência.
    const object = await database.collection('objects').findOne({ categoryId: _id }, { session, projection: { _id: 1 } });
    const tip = await database.collection('tips').findOne({ categoryId: _id }, { session, projection: { _id: 1 } });
    if (object || tip) {
      throw Object.assign(new Error('A categoria está associada a objetos ou dicas e não pode ser eliminada.'), { status: 409 });
    }
    await database.collection('categories').deleteOne({ _id }, { session });
  });
}

