import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { registerUser } from '../services/registration.js';

const router = Router();
const registrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas de registo. Tenta novamente dentro de 15 minutos.' }
});

router.post('/register', registrationLimit, async (req, res) => {
  // Este pedido transporta uma palavra-passe: não deve ser registado em logs.
  res.set('Cache-Control', 'no-store');
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  }
  const user = await registerUser(req.body);
  return res.status(201).json({ user });
});

export default router;
