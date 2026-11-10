import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { listNotifications } from '../services/notifications.js';

const router = Router();
router.get('/', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await listNotifications(req.auth.user._id));
});

export default router;
