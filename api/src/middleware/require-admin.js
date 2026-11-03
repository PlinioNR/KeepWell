// Executa depois de requireAuth: o perfil vem da BD, nunca do corpo do pedido.
export function requireAdmin(req, res, next) {
  if (req.auth?.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Esta operação exige um administrador.' });
  }
  next();
}
