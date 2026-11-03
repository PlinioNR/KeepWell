import { findSessionUser, readBearerToken } from '../services/authentication.js';

// Middleware: verifica a sessão antes de deixar executar a rota protegida.
export async function requireAuth(req, res, next) {
  const token = readBearerToken(req.get('Authorization'));
  const authentication = token ? await findSessionUser(token) : null;
  if (!authentication) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Inicia sessão novamente.' });
  }
  req.auth = authentication;
  next();
}
