import { MongoClient } from 'mongodb';

let client;
let database;

// Mantém uma única ligação partilhada por toda a API.
export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  const databaseName = process.env.MONGODB_DB?.trim();

  if (!uri || /<[^>]+>/.test(uri)) {
    throw new Error('Preenche MONGODB_URI no ficheiro .env com a ligação e a palavra-passe do Atlas.');
  }
  if (!databaseName) {
    throw new Error('Define MONGODB_DB no ficheiro .env.');
  }

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    database = client.db(databaseName);
    // O ping confirma que o MongoDB recebe e responde a comandos.
    await database.command({ ping: 1 });
    console.log(`MongoDB ligado à base de dados ${databaseName}.`);
    return database;
  } catch {
    await closeDatabase();
    // Não mostramos o erro original, pois pode conter informações da ligação.
    throw new Error('Não foi possível ligar ao MongoDB. Verifica a URI, a palavra-passe e o IP autorizado no Atlas.');
  }
}

// Os futuros ficheiros de dados podem reutilizar a ligação, sem criar outra.
export function getDatabase() {
  if (!database) throw new Error('A ligação ao MongoDB ainda não foi iniciada.');
  return database;
}

export async function pingDatabase() {
  await getDatabase().command({ ping: 1 });
}

// Liberta os recursos quando paramos o servidor ou o arranque falha.
export async function closeDatabase() {
  database = undefined;
  if (client) {
    const currentClient = client;
    client = undefined;
    await currentClient.close();
  }
}

// Agrupa operações que têm de ser confirmadas em conjunto (por exemplo categoria + objeto).
export async function withDatabaseTransaction(work) {
  if (!client || !database) throw new Error('A ligação ao MongoDB ainda não foi iniciada.');
  return client.withSession(session => session.withTransaction(
    () => work(database, session),
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
  ));
}
