import { analyzeObjectPhoto } from '../services/object-photo-analysis.js';
import { listObjectHistory } from '../services/tasks.js';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requirePhotoOwner, saveObjectPhoto, getObjectPhoto, deleteObjectPhoto } from '../services/object-photos.js';
import { receivePhoto, limitPhotoConcurrency } from '../middleware/receive-photo.js';
import { requireAuth } from '../middleware/require-auth.js';
import { createObject, listObjects, getObject, updateObject, deleteObject } from '../services/objects.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth);
router.post('/', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const object = await createObject(req.body, req.auth.user._id);
  res.location(`/objects/${object.id}`).status(201).json({ object });
});
router.get('/', async (req, res) => {
  res.status(200).json(await listObjects(req.auth.user._id, req.query));
});
router.get('/:id', async (req, res) => {
  res.status(200).json({ object: await getObject(req.params.id, req.auth.user._id) });
});
router.patch('/:id', async (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'Usa Content-Type: application/json.' });
  const object = await updateObject(req.params.id, req.body, req.auth.user._id);
  res.status(200).json({ object });
});
router.delete('/:id', async (req, res) => {
  await deleteObject(req.params.id, req.auth.user._id);
  res.status(204).end();
});
const photoRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiados envios de fotografias. Tenta novamente dentro de 15 minutos.' }
});
const photoAnalysisRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: req => req.auth.user._id.toString(),
  message: { error: 'Demasiados pedidos de analise. Tenta novamente dentro de 15 minutos.' }
});
router.post('/photo-analysis', photoAnalysisRateLimit, limitPhotoConcurrency, (req, res, next) => {
  if (!req.is('multipart/form-data')) return res.status(415).json({ error: 'Envia a fotografia como multipart/form-data.' });
  next();
}, receivePhoto, async (req, res) => {
  res.json(await analyzeObjectPhoto(req.file?.buffer));
});
router.put('/:id/photo', photoRateLimit, requirePhotoOwner, limitPhotoConcurrency, (req, res, next) => {
  if (!req.is('multipart/form-data')) return res.status(415).json({ error: 'Envia a fotografia como multipart/form-data.' });
  next();
}, receivePhoto, async (req, res) => {
  const object = await saveObjectPhoto(req.params.id, req.auth.user._id, req.file?.buffer);
  res.status(200).json({ object });
});
router.get('/:id/photo', async (req, res) => {
  const image = await getObjectPhoto(req.params.id, req.auth.user._id);
  res.set('X-Content-Type-Options', 'nosniff');
  res.type('image/jpeg').status(200).send(image);
});
router.delete('/:id/photo', async (req, res) => {
  await deleteObjectPhoto(req.params.id, req.auth.user._id);
  res.status(204).end();
});
router.get('/:id/history', async (req, res) => {
  res.status(200).json(await listObjectHistory(req.params.id, req.auth.user._id, req.query));
});
export default router;



