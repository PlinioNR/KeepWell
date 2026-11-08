import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { createTask, listTasks, getTask, completeTask } from '../services/tasks.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth);
router.post('/', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const task = await createTask(req.body, req.auth.user._id);
  res.location(`/tasks/${task.id}`).status(201).json({ task });
});
router.get('/', async (req, res) => {
  res.status(200).json(await listTasks(req.auth.user._id, req.query));
});
router.get('/:id', async (req, res) => {
  res.status(200).json({ task: await getTask(req.params.id, req.auth.user._id) });
});
router.post('/:id/complete', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  res.status(200).json({ task: await completeTask(req.params.id, req.body, req.auth.user._id) });
});
export default router;

