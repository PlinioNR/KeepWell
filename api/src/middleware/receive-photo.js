import multer from 'multer';
import { maxPhotoBytes } from '../storage/photo-files.js';

// Cada upload ocupa memória. O limite é aplicado antes de ler o ficheiro.
let activeUploads = 0;
export function limitPhotoConcurrency(_req, res, next) {
  if (activeUploads >= 2) return res.status(503).json({ error: 'Envio de fotografias ocupado. Tenta novamente.' });
  activeUploads += 1;
  let released = false;
  const release = () => { if (!released) { released = true; activeUploads -= 1; } };
  res.once('finish', release);
  res.once('close', release);
  next();
}

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxPhotoBytes, files: 1, fields: 0, parts: 1, fieldNameSize: 20 },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(Object.assign(new Error('Usa uma fotografia JPEG, PNG ou WebP.'), { status: 415 }));
    }
    // A validação do conteúdo real é feita depois pelo sharp, além deste MIME.
    callback(null, true);
  }
}).single('photo');

export function receivePhoto(req, res, next) {
  uploadPhoto(req, res, error => {
    const invalidMultipart = ['Multipart: Boundary not found', 'Unexpected end of form', 'Malformed part header'];
    if (error && invalidMultipart.includes(error.message)) {
      return next(Object.assign(new Error('Pedido multipart inválido ou incompleto.'), { status: 400 }));
    }
    next(error);
  });
}
