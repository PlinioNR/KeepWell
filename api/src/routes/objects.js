import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { createObject, listObjects, getObject, updateObject, deleteObject } from '../services/objects.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth);
router.post('/', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const object = await createObject(req.body, req.auth.user._id);
  res.location(`/objects/${object.id}`).status(201).json({ object });
});
router.get('/', async (req, res) => {
  res.status(200).json(await listObjects(req.auth.user._id, req.query));
});
router.get('/:id', async (req, res) => {
  res.status(200).json({ object: await getObject(req.params.id, req.auth.user._id) });
});
router.patch('/:id', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const object = await updateObject(req.params.id, req.body, req.auth.user._id);
  res.status(200).json({ object });
});
router.delete('/:id', async (req, res) => {
  await deleteObject(req.params.id, req.auth.user._id);
  res.status(204).end();
});
export default router;

