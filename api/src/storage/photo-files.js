import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

// Caminho fixo relativo ao projeto, independente da pasta do terminal.
export const photoDirectory = fileURLToPath(new URL('../../storage/object-photos/', import.meta.url));
export const maxPhotoBytes = 5 * 1024 * 1024;

function photoPath(key) {
  // O nome é gerado no servidor; nunca usamos o nome/caminho enviado pelo cliente.
  if (typeof key !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$/.test(key)) {
    throw new Error('Referência de fotografia inválida.');
  }
  return join(photoDirectory, key);
}

export async function normalizePhoto(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw Object.assign(new Error('Envia uma fotografia no campo photo.'), { status: 400 });
  }
  if (buffer.length > maxPhotoBytes) {
    throw Object.assign(new Error('A fotografia deve ter no máximo 5 MiB.'), { status: 413 });
  }
  try {
    const image = sharp(buffer, { failOn: 'warning', limitInputPixels: 25000000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
      throw new Error('Formato não permitido.');
    }
    // Corrige a orientação, limita as dimensões e remove metadados por defeito.
    return await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw Object.assign(new Error('Imagem inválida. Usa JPEG, PNG ou WebP estático com até 25 megapíxeis.'), { status: 415 });
  }
}

export async function writePhotoFile(buffer) {
  await mkdir(photoDirectory, { recursive: true });
  const key = `${randomUUID()}.jpg`;
  await writeFile(photoPath(key), buffer, { flag: 'wx' });
  return key;
}

export async function readPhotoFile(key) {
  try { return await readFile(photoPath(key)); }
  catch (error) {
    if (error.code === 'ENOENT') throw Object.assign(new Error('Fotografia não encontrada.'), { status: 404 });
    throw error;
  }
}

export async function removePhotoFile(key) {
  if (!key) return;
  try { await unlink(photoPath(key)); }
  catch (error) {
    // Não falha uma alteração já confirmada na BD por uma falha de limpeza no disco.
    if (error.code !== 'ENOENT') console.error('Não foi possível limpar um ficheiro de fotografia.');
  }
}
