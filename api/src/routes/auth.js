import { updateEmail, updateProfile } from '../services/profile.js';
import { updatePreferences } from '../services/preferences.js';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { registerUser } from '../services/registration.js';
import { loginUser, logoutSession } from '../services/authentication.js';
import { requireAuth } from '../middleware/require-auth.js';
import { toPublicUser } from '../models/user.js';

const router = Router();
// Respostas de autenticação não devem ficar em caches.
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const registrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiadas tentativas de registo. Tenta novamente dentro de 15 minutos.' }
});
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiadas tentativas de login. Tenta novamente dentro de 15 minutos.' }
});

router.post('/register', registrationLimit, async (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  }
  const user = await registerUser(req.body);
  return res.status(201).json({ user });
});

router.post('/login', loginLimit, async (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  }
  const result = await loginUser(req.body);
  return res.status(200).json(result);
});

router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: toPublicUser(req.auth.user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const user = await updateProfile(req.auth.user._id, req.body);
  res.status(200).json({ user });
});

const emailChangeLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiadas tentativas de alteração de email. Tenta novamente dentro de 15 minutos.' }
});

router.patch('/me/email', requireAuth, emailChangeLimit, async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  res.status(200).json({ user: await updateEmail(req.auth.user, req.body) });
});

router.patch('/me/preferences', requireAuth, async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const user = await updatePreferences(req.auth.user._id, req.body);
  res.status(200).json({ user });
});

router.post('/logout', requireAuth, async (req, res) => {
  await logoutSession(req.auth.sessionId);
  res.status(204).end();
});

export default router;



