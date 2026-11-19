import { Router } from 'express';
import { requireHouse, requireHouseRole } from '../middleware/require-house.js';
import { requireAuth } from '../middleware/require-auth.js';
import { createTask, listTasks, listReminders, getTask, completeTask, updateTask, deleteTask } from '../services/tasks.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth, requireHouse);
router.post('/', requireHouseRole('owner', 'manager'), async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const task = await createTask(req.body, req.auth.user);
  res.location(`/tasks/${task.id}`).status(201).json({ task });
});
router.get('/', async (req, res) => {
  res.status(200).json(await listTasks(req.auth.user, req.query));
});
router.get('/reminders', async (req, res) => {
  res.status(200).json(await listReminders(req.auth.user, req.query));
});
router.get('/:id', async (req, res) => {
  res.status(200).json({ task: await getTask(req.params.id, req.auth.user) });
});
router.post('/:id/complete', requireHouseRole('owner', 'manager'), async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  res.status(200).json({ task: await completeTask(req.params.id, req.body, req.auth.user) });
});
router.patch('/:id', requireHouseRole('owner', 'manager'), async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  res.status(200).json({ task: await updateTask(req.params.id, req.body, req.auth.user) });
});
router.delete('/:id', requireHouseRole('owner', 'manager'), async (req, res) => {
  await deleteTask(req.params.id, req.auth.user);
  res.status(204).end();
});
export default router;

