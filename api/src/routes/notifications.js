import { Router } from 'express';
import { requireHouse } from '../middleware/require-house.js';
import { requireAuth } from '../middleware/require-auth.js';
import { listNotifications } from '../services/notifications.js';

const router = Router();
router.get('/', requireAuth, requireHouse, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await listNotifications(req.auth.user));
});

export default router;
