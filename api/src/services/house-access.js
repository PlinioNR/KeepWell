import { ObjectId } from 'mongodb';

// Os filtros são construídos a partir do utilizador autenticado.
export function scopeFor(actor) {
  return actor.houseId ? { houseId: actor.houseId } : { userId: actor };
}

export function forbidden() {
  return Object.assign(new Error('Não tens permissão para esta ação.'), { status: 403 });
}

// Escreve na pessoa e na casa para coordenar mudanças de membros com outras escritas.
// As transações concorrentes são repetidas pelo driver com o estado atualizado.
export async function lockHouseActor(database, session, actor, roles = ['owner', 'manager', 'member']) {
  if (actor instanceof ObjectId) return actor;
  const current = await database.collection('users').findOneAndUpdate(
    { _id: actor._id, houseId: actor.houseId },
    { $currentDate: { updatedAt: true } },
    { session, returnDocument: 'after' }
  );
  if (!current || !roles.includes(current.houseRole)) throw forbidden();
  const house = await database.collection('houses').findOneAndUpdate(
    { _id: current.houseId }, { $inc: { referenceVersion: 1 } },
    { session, returnDocument: 'after' }
  );
  if (!house) throw Object.assign(new Error('A casa já não existe. Inicia sessão novamente.'), { status: 409 });
  return current;
}
