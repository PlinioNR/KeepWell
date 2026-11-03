import { ObjectId } from 'mongodb';
import { getDatabase } from '../database.js';
import { buildCategory, toPublicCategory } from '../models/category.js';

export function parseCategoryId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de categoria inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

export function validateCategoryInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => key !== 'name')) {
    throw Object.assign(new Error('Envia apenas o campo name.'), { status: 400 });
  }
  try { return buildCategory(body); }
  catch (error) { throw Object.assign(new Error(error.message), { status: 400 }); }
}

function duplicateError(error) {
  if (error.code === 11000) {
    return Object.assign(new Error('Já existe uma categoria com este nome.'), { status: 409 });
  }
  return error;
}

export async function listCategories() {
  const categories = await getDatabase().collection('categories')
    .find({}).collation({ locale: 'pt', strength: 2 }).sort({ name: 1 }).toArray();
  return categories.map(toPublicCategory);
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
  const category = validateCategoryInput(body);
  try {
    // Altera apenas nome e data de alteração; preserva id e createdAt.
    const updated = await getDatabase().collection('categories').findOneAndUpdate(
      { _id }, { $set: { name: category.name, updatedAt: category.updatedAt } },
      { returnDocument: 'after' }
    );
    if (!updated) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
    return toPublicCategory(updated);
  } catch (error) { throw duplicateError(error); }
}

export async function deleteCategory(id) {
  const _id = parseCategoryId(id);
  const database = getDatabase();
  if (!await database.collection('categories').findOne({ _id }, { projection: { _id: 1 } })) {
    throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
  }
  // Convenção para os futuros modelos: categoryId será um ObjectId.
  const [object, tip] = await Promise.all([
    database.collection('objects').findOne({ categoryId: _id }, { projection: { _id: 1 } }),
    database.collection('tips').findOne({ categoryId: _id }, { projection: { _id: 1 } })
  ]);
  if (object || tip) {
    throw Object.assign(new Error('A categoria está associada a objetos ou dicas e não pode ser eliminada.'), { status: 409 });
  }
  const result = await database.collection('categories').deleteOne({ _id });
  if (!result.deletedCount) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
}
