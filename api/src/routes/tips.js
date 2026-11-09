import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { listTips, getTip, createTip, updateTip, deleteTip } from '../services/tips.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth);

function requireJson(req, res, next) {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  next();
}

router.get('/', async (req, res) => res.json(await listTips(req.query)));
router.get('/:id', async (req, res) => res.json({ tip: await getTip(req.params.id) }));
router.post('/', requireAdmin, requireJson, async (req, res) => {
  const tip = await createTip(req.body);
  res.location(`/tips/${tip.id}`).status(201).json({ tip });
});
router.patch('/:id', requireAdmin, requireJson, async (req, res) => {
  res.json({ tip: await updateTip(req.params.id, req.body) });
});
router.delete('/:id', requireAdmin, async (req, res) => {
  await deleteTip(req.params.id);
  res.status(204).end();
});

export default router;
