import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizePhoto, readPhotoFile, maxPhotoBytes } from '../src/storage/photo-files.js';

test('normaliza a fotografia, corrige orientação, limita dimensões e remove metadados', async () => {
  const input = await sharp({ create: { width: 2200, height: 1200, channels: 3, background: '#556677' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const normalized = await normalizePhoto(input);
  const metadata = await sharp(normalized).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.ok(metadata.width <= 1600 && metadata.height <= 1600);
  assert.ok(metadata.height > metadata.width);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
});

test('valida o conteúdo real e os limites, e impede caminhos arbitrários', async () => {
  await assert.rejects(normalizePhoto(undefined), { status: 400 });
  await assert.rejects(normalizePhoto(Buffer.alloc(maxPhotoBytes + 1)), { status: 413 });
  for (const buffer of [Buffer.from('nao e uma imagem'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')]) {
    await assert.rejects(normalizePhoto(buffer), { status: 415 });
  }
  await assert.rejects(readPhotoFile('../../.env'));
});
