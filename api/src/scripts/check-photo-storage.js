import { readdir } from 'node:fs/promises';
import { connectDatabase, closeDatabase } from '../database.js';
import { photoDirectory } from '../storage/photo-files.js';

// Considera apenas nomes gerados pela API.
const photoName = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$/;

try {
  const database = await connectDatabase();
  const objects = await database.collection('objects')
    .find({ photoKey: { $type: 'string' } }, { projection: { photoKey: 1 } }).toArray();
  const entries = await readdir(photoDirectory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  const files = new Set(entries.filter(entry => entry.isFile() && photoName.test(entry.name)).map(entry => entry.name));
  const referenced = new Set(objects.map(object => object.photoKey));
  const missing = objects.filter(object => !files.has(object.photoKey));
  const unreferenced = [...files].filter(file => !referenced.has(file));

  console.log('Objetos com referência a fotografia:', objects.length);
  console.log('Ficheiros gerados pela API:', files.size);
  console.log('Referências sem ficheiro:', missing.length);
  for (const object of missing) console.log('  Objeto', object._id.toString(), '→', object.photoKey);
  console.log('Ficheiros sem referência:', unreferenced.length);
  for (const file of unreferenced) console.log(' ', file);
  if (missing.length || unreferenced.length) process.exitCode = 1;
} catch (error) {
  console.error('Não foi possível verificar as fotografias:', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
