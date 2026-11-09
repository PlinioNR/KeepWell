import { ObjectId } from 'mongodb';

export function parseTaskId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de cuidado inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

export function validateTaskDate(dueOn) {
  if (typeof dueOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) {
    throw Object.assign(new Error('A data prevista deve usar AAAA-MM-DD.'), { status: 400 });
  }
  const date = new Date(`${dueOn}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dueOn) {
    throw Object.assign(new Error('A data prevista não existe no calendário.'), { status: 400 });
  }
  return dueOn;
}

export function buildTask(body, userId) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['objectId', 'title', 'dueOn'].includes(key))) {
    throw Object.assign(new Error('Envia apenas objectId, title e dueOn.'), { status: 400 });
  }
  if (typeof body.objectId !== 'string' || !/^[a-f0-9]{24}$/i.test(body.objectId)) {
    throw Object.assign(new Error('Seleciona um objeto válido.'), { status: 400 });
  }
  if (typeof body.title !== 'string') {
    throw Object.assign(new Error('Indica o título do cuidado.'), { status: 400 });
  }
  const title = body.title.trim().replace(/\s+/gu, ' ');
  if ([...title].length < 2 || [...title].length > 120) {
    throw Object.assign(new Error('O título deve ter entre 2 e 120 caracteres.'), { status: 400 });
  }
  const dueOn = validateTaskDate(body.dueOn);
  if (!(userId instanceof ObjectId)) throw new Error('Utilizador autenticado inválido.');
  const now = new Date();
  // Estado e datas internas são definidos pelo servidor, não pelo cliente.
  return { objectId: new ObjectId(body.objectId), userId, title, dueOn,
    status: 'pending', completedAt: null, notes: '', createdAt: now, updatedAt: now };
}

export function toPublicTask(task) {
  return { id: task._id.toString(), objectId: task.objectId.toString(), title: task.title,
    dueOn: task.dueOn, status: task.status, completedAt: task.completedAt, notes: task.notes ?? '',
    createdAt: task.createdAt, updatedAt: task.updatedAt };
}

export async function setupTasks(database) {
  const validator = {
    $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      required: ['objectId', 'userId', 'title', 'dueOn', 'status', 'completedAt', 'createdAt', 'updatedAt'],
      properties: {
        _id: { bsonType: 'objectId' }, objectId: { bsonType: 'objectId' }, userId: { bsonType: 'objectId' },
        title: { bsonType: 'string', minLength: 2, maxLength: 120, pattern: '^\\S(?:[\\s\\S]*\\S)$' },
        dueOn: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        notes: { bsonType: 'string', maxLength: 1000 },
        status: { enum: ['pending', 'completed'] }, completedAt: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' }, updatedAt: { bsonType: 'date' }
      },
      // Uma tarefa pendente não tem data de realização; uma concluída tem de a ter.
      oneOf: [
        { properties: { status: { enum: ['pending'] }, completedAt: { bsonType: 'null' } } },
        { properties: { status: { enum: ['completed'] }, completedAt: { bsonType: 'date' } } }
      ]
    }
  };
  const exists = await database.listCollections({ name: 'tasks' }).hasNext();
  if (exists) {
    await database.command({ collMod: 'tasks', validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await database.createCollection('tasks', { validator, validationLevel: 'strict', validationAction: 'error' });
  }
  await database.collection('tasks').createIndex({ userId: 1, dueOn: 1, _id: 1 }, { name: 'tasks_owner_date' });
  await database.collection('tasks').createIndex({ objectId: 1 }, { name: 'tasks_object' });
  await database.collection('tasks').createIndex({ userId: 1, objectId: 1, status: 1, completedAt: -1, _id: -1 }, { name: 'tasks_object_history' });
}


