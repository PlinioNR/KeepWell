export function requireHouse(req, res, next) {
  const user = req.auth.user;
  if (!user.houseId || !['owner', 'manager', 'member'].includes(user.houseRole)) {
    return res.status(503).json({ error: 'Esta conta aguarda a migração para casas.' });
  }
  next();
}

export function requireHouseRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth?.user?.houseRole)) {
      return res.status(403).json({ error: 'Não tens permissão para esta ação.' });
    }
    next();
  };
}
