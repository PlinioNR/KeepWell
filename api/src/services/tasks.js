import { parseObjectId } from '../models/object.js';
import { getDatabase, withDatabaseTransaction } from '../database.js';
import { buildTask, parseTaskId, toPublicTask } from '../models/task.js';

export async function createTask(body, userId) {
  const task = buildTask(body, userId);
  return withDatabaseTransaction(async (database, session) => {
    // Escreve no mesmo objeto usado por deleteObject: evita tarefas órfãs.
    const object = await database.collection('objects').findOneAndUpdate(
      { _id: task.objectId, userId }, { $inc: { referenceVersion: 1 } },
      { session, returnDocument: 'after', projection: { _id: 1 } }
    );
    // Mesma mensagem para um objeto inexistente ou pertencente a outra pessoa.
    if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
    const result = await database.collection('tasks').insertOne(task, { session });
    return toPublicTask({ ...task, _id: result.insertedId });
  });
}

export function parseTaskPagination(query = {}) {
  if (Object.keys(query).some(key => !['page', 'pageSize'].includes(key))) {
    throw Object.assign(new Error('Parâmetros permitidos: page e pageSize.'), { status: 400 });
  }
  const parse = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
      throw Object.assign(new Error('Paginação inválida. Usa page positivo e pageSize entre 1 e 100.'), { status: 400 });
    }
    return Number(value);
  };
  return { page: parse(query.page, 1, 1000000), pageSize: parse(query.pageSize, 20, 100) };
}

export async function listTasks(userId, query) {
  const { page, pageSize } = parseTaskPagination(query);
  const collection = getDatabase().collection('tasks');
  const filter = { userId };
  const [tasks, total] = await Promise.all([
    collection.find(filter).sort({ dueOn: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(filter)
  ]);
  return { tasks: tasks.map(toPublicTask), page, pageSize, total };
}

export async function getTask(id, userId) {
  const task = await getDatabase().collection('tasks').findOne({ _id: parseTaskId(id), userId });
  if (!task) throw Object.assign(new Error('Cuidado não encontrado.'), { status: 404 });
  return toPublicTask(task);
}

export function validateCompletion(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => key !== 'notes')) {
    throw Object.assign(new Error('Envia apenas notes, ou um objeto JSON vazio.'), { status: 400 });
  }
  const notes = body.notes === undefined ? '' : body.notes;
  if (typeof notes !== 'string' || [...notes.trim()].length > 1000) {
    throw Object.assign(new Error('As observações devem ser texto com até 1000 caracteres.'), { status: 400 });
  }
  return notes.trim();
}

export async function completeTask(id, body, userId) {
  const _id = parseTaskId(id);
  const notes = validateCompletion(body);
  const collection = getDatabase().collection('tasks');
  const now = new Date();
  // Só a primeira conclusão altera o documento. Data e observações são guardadas juntas.
  const updated = await collection.findOneAndUpdate(
    { _id, userId, status: 'pending' },
    { $set: { status: 'completed', completedAt: now, notes, updatedAt: now } },
    { returnDocument: 'after' }
  );
  if (updated) return toPublicTask(updated);
  const current = await collection.findOne({ _id, userId });
  if (!current) throw Object.assign(new Error('Cuidado não encontrado.'), { status: 404 });
  // Repetir o pedido é seguro: não substitui a data nem as observações originais.
  return toPublicTask(current);
}

export async function listObjectHistory(id, userId, query) {
  const { page, pageSize } = parseTaskPagination(query);
  const objectId = parseObjectId(id);
  const database = getDatabase();
  const object = await database.collection('objects').findOne({ _id: objectId, userId }, { projection: { _id: 1 } });
  if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  const collection = database.collection('tasks');
  const filter = { userId, objectId, status: 'completed' };
  const [tasks, total] = await Promise.all([
    collection.find(filter).sort({ completedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(filter)
  ]);
  return { tasks: tasks.map(toPublicTask), page, pageSize, total };
}

