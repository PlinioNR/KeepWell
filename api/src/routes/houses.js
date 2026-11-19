import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middleware/require-auth.js';
import { requireHouse, requireHouseRole } from '../middleware/require-house.js';
import { getHouse, renameHouse, createInvite, joinHouse, leaveHouse, updateMember, removeMember } from '../services/houses.js';

const router = Router();
router.use(requireAuth, requireHouse);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

function requireJson(req, res, next) {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  next();
}

const inviteLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20,
  keyGenerator: req => req.auth.user._id.toString(),
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiadas tentativas de convite. Tenta novamente mais tarde.' }
});

router.get('/', async (req, res) => res.json(await getHouse(req.auth.user)));
router.patch('/', requireHouseRole('owner', 'manager'), requireJson, async (req, res) => {
  res.json(await renameHouse(req.auth.user, req.body));
});
router.post('/invite', requireHouseRole('owner', 'manager'), inviteLimit, async (req, res) => {
  res.json(await createInvite(req.auth.user));
});
router.post('/join', inviteLimit, requireJson, async (req, res) => res.json(await joinHouse(req.auth.user, req.body)));
router.post('/leave', requireHouseRole('manager', 'member'), async (req, res) => res.json(await leaveHouse(req.auth.user)));
router.patch('/members/:userId', requireHouseRole('owner'), requireJson, async (req, res) => {
  res.json(await updateMember(req.auth.user, req.params.userId, req.body));
});
router.delete('/members/:userId', requireHouseRole('owner'), async (req, res) => {
  await removeMember(req.auth.user, req.params.userId);
  res.status(204).end();
});
export default router;
