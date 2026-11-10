import { parseObjectId } from '../models/object.js';
import { getDatabase, withDatabaseTransaction } from '../database.js';
import { buildTask, parseTaskId, toPublicTask, validateTaskDate } from '../models/task.js';

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

export function lisbonDate(now) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

export function buildTaskFilter(userId, { objectId, status, dueFrom, dueTo }, now = new Date()) {
  const filter = { userId };
  if (objectId !== undefined) filter.objectId = parseObjectId(objectId);
  const range = {};
  if (dueFrom !== undefined) range.$gte = validateTaskDate(dueFrom);
  if (dueTo !== undefined) range.$lte = validateTaskDate(dueTo);
  if (dueFrom !== undefined && dueTo !== undefined && dueFrom > dueTo) {
    throw Object.assign(new Error('A data inicial deve ser anterior ou igual à data final.'), { status: 400 });
  }
  if (Object.keys(range).length) filter.dueOn = range;
  if (status === undefined) return filter;
  if (!['pending', 'overdue', 'completed'].includes(status)) {
    throw Object.assign(new Error('Usa pending, overdue ou completed.'), { status: 400 });
  }
  if (status === 'completed') return { ...filter, status };

  const today = lisbonDate(now);
  filter.status = 'pending';
  if (status === 'overdue') {
    range.$lt = today;
  } else if (dueFrom === undefined || dueFrom < today) {
    range.$gte = today;
  }
  filter.dueOn = range;
  return filter;
}

async function tasksWithObjectName(tasks, userId) {
  if (!tasks.length) return [];
  // Uma consulta para os nomes de todos os objetos da página.
  const objects = await getDatabase().collection('objects').find(
    { userId, _id: { $in: tasks.map(task => task.objectId) } },
    { projection: { name: 1 } }
  ).toArray();
  const names = new Map(objects.map(object => [object._id.toString(), object.name]));
  return tasks.map(task => ({
    ...toPublicTask(task),
    objectName: names.get(task.objectId.toString()) ?? null
  }));
}

async function readTaskPage(filter, { page, pageSize }) {
  const collection = getDatabase().collection('tasks');
  const [tasks, total] = await Promise.all([
    collection.find(filter).sort({ dueOn: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(filter)
  ]);
  return { tasks: await tasksWithObjectName(tasks, filter.userId), page, pageSize, total };
}

export async function listTasks(userId, query = {}) {
  const { objectId, status, dueFrom, dueTo, ...pagination } = query;
  const page = parseTaskPagination(pagination);
  return readTaskPage(buildTaskFilter(userId, { objectId, status, dueFrom, dueTo }), page);
}

export async function listReminders(user, query) {
  const page = parseTaskPagination(query);
  if (user.preferences?.remindersEnabled !== true) {
    return { tasks: [], ...page, total: 0 };
  }

  const upcoming = buildTaskFilter(user._id, { status: 'pending' });
  return readTaskPage({ ...upcoming, reminderEnabled: true }, page);
}
export async function getTask(id, userId) {
  const task = await getDatabase().collection('tasks').findOne({ _id: parseTaskId(id), userId });
  if (!task) throw Object.assign(new Error('Cuidado não encontrado.'), { status: 404 });
  const [result] = await tasksWithObjectName([task], userId);
  return result;
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
  const now = new Date();

  return withDatabaseTransaction(async (database, session) => {
    const collection = database.collection('tasks');
    const completed = await collection.findOneAndUpdate(
      { _id, userId, status: 'pending' },
      { $set: { status: 'completed', completedAt: now, notes, updatedAt: now } },
      { session, returnDocument: 'after' }
    );
    if (!completed) {
      const current = await collection.findOne({ _id, userId }, { session });
      if (!current) throw Object.assign(new Error('Cuidado não encontrado.'), { status: 404 });
      return toPublicTask(current);
    }
    if (completed.repeatEveryDays) {
      // Soma dias à data de calendário em Lisboa sem efeitos da mudança de hora.
      const nextDate = new Date(lisbonDate(now) + 'T00:00:00.000Z');
      nextDate.setUTCDate(nextDate.getUTCDate() + completed.repeatEveryDays);
      const next = buildTask({
        objectId: completed.objectId.toString(),
        title: completed.title,
        dueOn: nextDate.toISOString().slice(0, 10),
        repeatEveryDays: completed.repeatEveryDays,
        reminderEnabled: completed.reminderEnabled
      }, userId);
      // A conclusão e o novo cuidado são confirmados juntos.
      await collection.insertOne(next, { session });
    }
    return toPublicTask(completed);
  });
}
export async function listObjectHistory(id, userId, query) {
  const { page, pageSize } = parseTaskPagination(query);
  const objectId = parseObjectId(id);
  const database = getDatabase();
  const object = await database.collection('objects').findOne({ _id: objectId, userId }, { projection: { name: 1, createdAt: 1 } });
  if (!object) throw Object.assign(new Error('Objeto não encontrado.'), { status: 404 });
  const collection = database.collection('tasks');
  const filter = { userId, objectId, status: 'completed' };
  const [tasks, total] = await Promise.all([
    collection.find(filter).sort({ completedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    collection.countDocuments(filter)
  ]);
  const completedTasks = tasks.map(task => ({ ...toPublicTask(task), objectName: object.name }));
  const events = completedTasks.map(task => ({
    type: 'care_completed',
    occurredAt: task.completedAt,
    task
  }));
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page === lastPage && object.createdAt) {
    events.push({ type: 'object_added', occurredAt: object.createdAt });
  }
  return { tasks: completedTasks, events, page, pageSize, total };
}



async function rejectPendingChange(collection, filter) {
  const existing = await collection.findOne(filter, { projection: { _id: 1 } });
  if (!existing) throw Object.assign(new Error('Cuidado não encontrado.'), { status: 404 });
  throw Object.assign(new Error('O cuidado já foi concluído.'), { status: 409 });
}

export async function updateTask(id, body, userId) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !Object.keys(body).length || Object.keys(body).some(key => !['title', 'dueOn', 'repeatEveryDays', 'reminderEnabled'].includes(key))) {
    throw Object.assign(new Error('Envia title, dueOn, repeatEveryDays e/ou reminderEnabled.'), { status: 400 });
  }
  const filter = { _id: parseTaskId(id), userId };
  const collection = getDatabase().collection('tasks');
  const current = await collection.findOne({ ...filter, status: 'pending' });
  if (!current) return rejectPendingChange(collection, filter);
  const validated = buildTask({
    objectId: current.objectId.toString(),
    title: Object.hasOwn(body, 'title') ? body.title : current.title,
    dueOn: Object.hasOwn(body, 'dueOn') ? body.dueOn : current.dueOn,
    repeatEveryDays: body.repeatEveryDays,
    reminderEnabled: body.reminderEnabled
  }, userId);
  // Grava só os campos enviados para preservar alterações simultâneas noutros campos.
  const changes = { updatedAt: validated.updatedAt };
  if (Object.hasOwn(body, 'title')) changes.title = validated.title;
  if (Object.hasOwn(body, 'dueOn')) changes.dueOn = validated.dueOn;
  if (Object.hasOwn(body, 'repeatEveryDays')) changes.repeatEveryDays = validated.repeatEveryDays;
  if (Object.hasOwn(body, 'reminderEnabled')) changes.reminderEnabled = validated.reminderEnabled;
  const updated = await collection.findOneAndUpdate(
    { ...filter, status: 'pending' }, { $set: changes }, { returnDocument: 'after' }
  );
  if (!updated) return rejectPendingChange(collection, filter);
  return toPublicTask(updated);
}

export async function deleteTask(id, userId) {
  const filter = { _id: parseTaskId(id), userId };
  const collection = getDatabase().collection('tasks');
  const result = await collection.deleteOne({ ...filter, status: 'pending' });
  if (!result.deletedCount) await rejectPendingChange(collection, filter);
}






