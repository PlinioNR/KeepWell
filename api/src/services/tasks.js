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
