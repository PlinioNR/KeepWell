import { connectDatabase, closeDatabase } from '../database.js';
import { registerUser } from '../services/registration.js';
import { createCategory } from '../services/categories.js';
import { createObject } from '../services/objects.js';

// Dados de DEMONSTRAÇÃO para testar a app (contas, categorias e objetos falsos).
// Uso: npm.cmd run seed:demo
//
// Pode correr-se várias vezes: não duplica contas nem categorias, e volta a
// criar os objetos das contas de demonstração (apaga só os dessas contas).
// Usa os serviços da API, por isso aplica as mesmas validações e o mesmo
// hash das palavras-passe que o registo normal.
// Os emails acabam em .test: são falsos e nunca recebem correio.

const password = 'demo1234';

const users = [
  { name: 'Ana Demo', email: 'ana@keepwell.test', role: 'user' },
  { name: 'Bruno Demo', email: 'bruno@keepwell.test', role: 'user' },
  { name: 'Admin Demo', email: 'admin@keepwell.test', role: 'admin' }
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

  // 1. Contas: cria se não existirem e acerta o perfil (user/admin).
  const userIds = {};
  for (const { name, email, role } of users) {
    let user = await database.collection('users').findOne({ email });
    if (!user) {
      await registerUser({ name, email, password });
      user = await database.collection('users').findOne({ email });
    }
    await database.collection('users').updateOne({ _id: user._id }, { $set: { role } });
    userIds[email] = user._id;
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

  // 3. Objetos: apaga os das contas de demonstração e volta a criá-los.
  let total = 0;
  for (const [email, list] of Object.entries(objects)) {
    await database.collection('objects').deleteMany({ userId: userIds[email] });
    for (const [name, category, acquiredOn] of list) {
      await createObject({ name, categoryId: categoryIds[category], acquiredOn }, userIds[email]);
      total++;
    }
  }
  console.log(`Objetos criados: ${total}`);
  console.log(`Entrar com ana@keepwell.test, bruno@keepwell.test ou admin@keepwell.test (palavra-passe: ${password}).`);
} catch (error) {
  console.error('Não foi possível criar os dados de demonstração:', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
