import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { listCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../services/categories.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth);

function requireJson(req, res, next) {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  next();
}

router.get('/', async (_req, res) => {
  res.status(200).json({ categories: await listCategories() });
});
router.get('/:id', async (req, res) => {
  res.status(200).json({ category: await getCategory(req.params.id) });
});
// As permissões são verificadas antes de validar ou executar a alteração.
router.post('/', requireAdmin, requireJson, async (req, res) => {
  const category = await createCategory(req.body);
  res.location(`/categories/${category.id}`).status(201).json({ category });
});
router.patch('/:id', requireAdmin, requireJson, async (req, res) => {
  res.status(200).json({ category: await updateCategory(req.params.id, req.body) });
});
router.delete('/:id', requireAdmin, async (req, res) => {
  await deleteCategory(req.params.id);
  res.status(204).end();
});

export default router;
