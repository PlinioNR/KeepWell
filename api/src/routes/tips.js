import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { requireHouse, requireHouseRole } from '../middleware/require-house.js';
import { listTips, getTip, createTip, updateTip, deleteTip } from '../services/tips.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth, requireHouse);

function requireJson(req, res, next) {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  next();
}

router.get('/', async (req, res) => res.json(await listTips(req.query, { houseId: req.auth.user.houseId })));
router.get('/:id', async (req, res) => res.json({ tip: await getTip(req.params.id, { houseId: req.auth.user.houseId }) }));
router.post('/', requireHouseRole('owner', 'manager'), requireJson, async (req, res) => {
  const tip = await createTip(req.body, req.auth.user);
  res.location(`/tips/${tip.id}`).status(201).json({ tip });
});
router.patch('/:id', requireHouseRole('owner', 'manager'), requireJson, async (req, res) => {
  res.json({ tip: await updateTip(req.params.id, req.body, req.auth.user) });
});
router.delete('/:id', requireHouseRole('owner', 'manager'), async (req, res) => {
  await deleteTip(req.params.id, req.auth.user);
  res.status(204).end();
});

export default router;
