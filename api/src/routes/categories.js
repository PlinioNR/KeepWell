import { Router } from 'express';
import { categoryIcons } from '../models/category.js';
import { requireAuth } from '../middleware/require-auth.js';
import { listCategories, getCategory } from '../services/categories.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth);


router.get('/', async (req, res) => {
  res.status(200).json({ categories: await listCategories(req.query) });
});
// Antes de /:id para icons não ser interpretado como identificador.
router.get('/icons', (_req, res) => res.status(200).json({ icons: categoryIcons }));
router.get('/:id', async (req, res) => {
  res.status(200).json({ category: await getCategory(req.params.id) });
});
export default router;

