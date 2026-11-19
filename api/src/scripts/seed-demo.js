import { connectDatabase, closeDatabase } from '../database.js';
import { registerUser } from '../services/registration.js';
import { createCategory } from '../services/categories.js';
import { createObject } from '../services/objects.js';
import { completeTask, createTask, lisbonDate } from '../services/tasks.js';
import { createTip } from '../services/tips.js';
import { joinHouse, createInvite, updateMember } from '../services/houses.js';
import { ObjectId } from 'mongodb';

// Dados de demonstração. Reutiliza os objetos e registos que já existem.
// Uso: npm.cmd run seed:demo

const password = 'demo1234';

const users = [
  { name: 'Ana Demo', email: 'ana@keepwell.test', houseRole: 'owner' },
  { name: 'Bruno Demo', email: 'bruno@keepwell.test', houseRole: 'member' },
  { name: 'Gestor Demo', email: 'gestor@keepwell.test', houseRole: 'manager' }
];

const categories = [
  { name: 'Eletrodomésticos', icon: 'plug', description: 'Aparelhos da casa.' },
  { name: 'Mobiliário', icon: 'armchair', description: 'Móveis e decoração.' },
  { name: 'Veículos', icon: 'bike', description: 'Bicicletas, trotinetes e carros.' },
  { name: 'Roupa e calçado', icon: 'shirt', description: 'Peças de vestuário e sapatos.' },
  { name: 'Eletrónica', icon: 'laptop', description: 'Computadores, telemóveis e afins.' }
];

// Objetos por email: [nome, categoria, data de aquisição ou null]
const objects = {
  'ana@keepwell.test': [
    ['Máquina de café', 'Eletrodomésticos', '2022-03-14'],
    ['Sofá da sala', 'Mobiliário', '2020-09-01'],
    ['Bicicleta urbana', 'Veículos', '2023-05-20'],
    ['Aspirador robô', 'Eletrodomésticos', null],
    ['Portátil', 'Eletrónica', '2024-01-10'],
    ['Casaco de couro', 'Roupa e calçado', '2019-11-02']
  ],
  'bruno@keepwell.test': [
    ['Trotinete elétrica', 'Veículos', '2024-06-03'],
    ['Botas de caminhada', 'Roupa e calçado', null]
  ]
};

try {
  const database = await connectDatabase();

  // As contas de demonstração partilham a casa da Ana.
  const userIds = {};
  const actors = {};
  for (const { name, email } of users) {
    let user = await database.collection('users').findOne({ email });
    if (!user) {
      await registerUser({ name, email, password });
      user = await database.collection('users').findOne({ email });
    }
    if (!user.houseId) throw new Error('Migra as contas existentes antes de executar o seed.');
    actors[email] = user;
    userIds[email] = user._id;
  }
  const ana = actors['ana@keepwell.test'];
  for (const { email, houseRole } of users.slice(1)) {
    let actor = actors[email];
    if (!actor.houseId.equals(ana.houseId)) {
      const { code } = await createInvite(ana);
      await joinHouse(actor, { code });
    }
    await updateMember(ana, actor._id.toString(), { role: houseRole });
    actors[email] = await database.collection('users').findOne({ _id: actor._id });
  }
  console.log(`Contas prontas: ${users.length}`);

  // 2. Categorias: cria só as que ainda não existem (procura pelo nome).
  const categoryIds = {};
  for (const category of categories) {
    const existing = await database.collection('categories').findOne(
      { name: category.name }, { collation: { locale: 'pt', strength: 2 } }
    );
    categoryIds[category.name] = existing ? existing._id.toString() : (await createCategory(category)).id;
  }
  console.log(`Categorias prontas: ${categories.length}`);

  // Reutiliza os IDs para manter fotografias, cuidados e histórico ligados.
  const objectIds = new Map();
  for (const [email, list] of Object.entries(objects)) {
    for (const [name, category, acquiredOn] of list) {
      const categoryId = categoryIds[category];
      const existing = await database.collection('objects').findOne({
        houseId: ana.houseId, name, categoryId: new ObjectId(categoryId)
      });
      const id = existing?._id.toString() ??
        (await createObject({ name, categoryId, acquiredOn }, userIds[email], ana.houseId, actors[email])).id;
      objectIds.set(email + ':' + name, id);
    }
  }

  const today = lisbonDate(new Date());
  const dayOffset = (days) => {
    const date = new Date(today + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const examples = [
    ['ana@keepwell.test', 'Máquina de café', 'Descalcificar a máquina', 0, { reminderEnabled: true }],
    ['ana@keepwell.test', 'Bicicleta urbana', 'Lubrificar a corrente', 3, { repeatEveryDays: 30 }],
    ['ana@keepwell.test', 'Portátil', 'Limpar as entradas de ventilação', -2, {}],
    ['ana@keepwell.test', 'Sofá da sala', 'Aspirar o sofá', -5, {}, 'Limpeza concluída.'],
    ['bruno@keepwell.test', 'Trotinete elétrica', 'Verificar os travões', 5, {}]
  ];
  for (const [email, name, title, days, options, notes] of examples) {
    const userId = userIds[email];
    const objectId = objectIds.get(email + ':' + name);
    const existing = await database.collection('tasks').findOne({
      houseId: ana.houseId, objectId: new ObjectId(objectId), title
    });
    const id = existing?._id.toString() ??
      (await createTask({ objectId, title, dueOn: dayOffset(days), ...options }, ana)).id;
    if (notes && existing?.status !== 'completed') await completeTask(id, { notes }, ana);
  }

  const tips = [
    ['Máquina de café', 'Descalcificar a máquina de café', 'Segue as instruções do fabricante e enxagua o depósito depois do ciclo.'],
    ['Bicicleta urbana', 'Cuidar da corrente da bicicleta', 'Limpa a corrente antes de lubrificar e retira o excesso com um pano.'],
    ['Portátil', 'Limpar as entradas de ventilação', 'Desliga o portátil e remove o pó exterior com um pincel macio.'],
    ['Sofá da sala', 'Aspirar um sofá de tecido', 'Usa um acessório macio e verifica as instruções de limpeza na etiqueta.']
  ];
  for (const [name, title, text] of tips) {
    const objectId = objectIds.get('ana@keepwell.test:' + name);
    const existing = await database.collection('tips').findOne({ houseId: ana.houseId, objectId: new ObjectId(objectId), title });
    if (!existing) await createTip({ objectId, title, text }, ana);
  }

  console.log('Objetos, cuidados e dicas de demonstração prontos.');
  console.log(`Entrar com ana@keepwell.test, bruno@keepwell.test ou gestor@keepwell.test (palavra-passe: ${password}).`);
} catch (error) {
  console.error('Não foi possível criar os dados de demonstração:', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

