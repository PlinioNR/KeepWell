import { getDatabase } from '../database.js';
import { buildTaskFilter, lisbonDate } from './tasks.js';

const limit = 20;

export async function listNotifications(userId, now = new Date()) {
  const db = getDatabase();
  const tasks = db.collection('tasks');
  const objects = db.collection('objects');
  const today = lisbonDate(now);

  const [dueToday, overdue, completed, added] = await Promise.all([
    tasks.find({ userId, status: 'pending', dueOn: today }).sort({ _id: 1 }).limit(limit).toArray(),
    tasks.find(buildTaskFilter(userId, { status: 'overdue' }, now))
      .sort({ dueOn: -1, _id: -1 }).limit(limit).toArray(),
    tasks.find({ userId, status: 'completed' }).sort({ completedAt: -1, _id: -1 }).limit(limit).toArray(),
    objects.find({ userId }, { projection: { name: 1, createdAt: 1 } })
      .sort({ createdAt: -1, _id: -1 }).limit(limit).toArray()
  ]);

  // Obtém os nomes numa consulta e mantém a verificação do dono.
  const objectIds = [...dueToday, ...overdue, ...completed].map(task => task.objectId);
  const names = await objects.find({ userId, _id: { $in: objectIds } }, { projection: { name: 1 } }).toArray();
  const nameById = new Map(names.map(object => [object._id.toString(), object.name]));
  const taskItem = (task, type) => ({
    id: type + ':' + task._id,
    type,
    taskId: task._id.toString(),
    objectId: task.objectId.toString(),
    objectName: nameById.get(task.objectId.toString()) ?? null,
    title: task.title,
    dueOn: task.dueOn
  });

  const recent = [
    ...completed.map(task => ({ ...taskItem(task, 'taskCompleted'), occurredAt: task.completedAt })),
    ...added.map(object => ({
      id: 'objectAdded:' + object._id,
      type: 'objectAdded',
      objectId: object._id.toString(),
      objectName: object.name,
      title: object.name,
      occurredAt: object.createdAt
    }))
  ].sort((a, b) => b.occurredAt - a.occurredAt || b.id.localeCompare(a.id)).slice(0, limit);

  return {
    dueToday: dueToday.map(task => taskItem(task, 'dueToday')),
    overdue: overdue.map(task => taskItem(task, 'overdue')),
    recent
  };
}
