import { randomInt } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { withDatabaseTransaction } from '../database.js';
import { buildHouse } from '../models/house.js';
import { lockHouseActor, forbidden } from './house-access.js';

const managers = ['owner', 'manager'];
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function fields(body, field) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !Object.hasOwn(body, field)) {
    throw Object.assign(new Error('Envia apenas ' + field + '.'), { status: 400 });
  }
  return body[field];
}

function memberId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) {
    throw Object.assign(new Error('Identificador de membro inválido.'), { status: 400 });
  }
  return new ObjectId(id);
}

export async function getHouse(actor) {
  return withDatabaseTransaction(async (database, session) => {
    const user = await database.collection('users').findOne({ _id: actor._id }, { session });
    if (!user?.houseId) throw Object.assign(new Error('Casa não encontrada.'), { status: 404 });
    const house = await database.collection('houses').findOne({ _id: user.houseId }, { session });
    if (!house) throw Object.assign(new Error('Casa não encontrada.'), { status: 404 });
    const members = await database.collection('users').find(
      { houseId: user.houseId }, { session, projection: { name: 1, email: 1, houseRole: 1 } }
    ).sort({ name: 1, _id: 1 }).toArray();
    return {
      house: { id: house._id.toString(), name: house.name },
      role: user.houseRole,
      members: members.map(member => ({
        id: member._id.toString(), name: member.name, email: member.email, role: member.houseRole
      })),
      ...(managers.includes(user.houseRole) && {
        invite: { code: house.inviteCode, expiresAt: house.inviteExpiresAt }
      })
    };
  });
}

export async function renameHouse(actor, body) {
  const value = fields(body, 'name');
  const name = typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
  if ([...name].length < 2 || [...name].length > 108) {
    throw Object.assign(new Error('O nome da casa deve ter entre 2 e 108 caracteres.'), { status: 400 });
  }
  await withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor, managers);
    await database.collection('houses').updateOne(
      { _id: actor.houseId }, { $set: { name, updatedAt: new Date() } }, { session }
    );
  });
  return getHouse(actor);
}

export async function createInvite(actor) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      await withDatabaseTransaction(async (database, session) => {
        await lockHouseActor(database, session, actor, managers);
        await database.collection('houses').updateOne(
          { _id: actor.houseId },
          { $set: { inviteCode: code, inviteExpiresAt: expiresAt, updatedAt: new Date() } },
          { session }
        );
      });
      return { code, expiresAt };
    } catch (error) {
      // O índice único pode detetar uma colisão aleatória de códigos.
      if (error.code !== 11000) throw error;
    }
  }
  throw Object.assign(new Error('Não foi possível gerar o convite. Tenta novamente.'), { status: 503 });
}

export async function joinHouse(actor, body) {
  const value = fields(body, 'code');
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
    throw Object.assign(new Error('Código de convite inválido ou expirado.'), { status: 400 });
  }
  await withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor);
    const target = await database.collection('houses').findOneAndUpdate(
      { inviteCode: code, inviteExpiresAt: { $gt: new Date() } },
      { $inc: { referenceVersion: 1 } }, { session, returnDocument: 'after' }
    );
    if (!target) throw Object.assign(new Error('Código de convite inválido ou expirado.'), { status: 400 });
    if (target._id.equals(actor.houseId)) {
      throw Object.assign(new Error('Já pertences a esta casa.'), { status: 409 });
    }
    const members = await database.collection('users').countDocuments({ houseId: actor.houseId }, { session });
    const object = await database.collection('objects').findOne({ houseId: actor.houseId }, { session });
    const tip = await database.collection('tips').findOne({ houseId: actor.houseId }, { session });
    if (members !== 1 || object || tip) {
      throw Object.assign(new Error('Para entrar noutra casa, a tua casa tem de estar vazia.'), { status: 409 });
    }
    await database.collection('users').updateOne(
      { _id: actor._id, houseId: actor.houseId },
      { $set: { houseId: target._id, houseRole: 'member', updatedAt: new Date() } }, { session }
    );
    await database.collection('houses').deleteOne({ _id: actor.houseId }, { session });
  });
  return getHouse(actor);
}

async function newHome(database, session, user) {
  const house = buildHouse(user.name);
  const { insertedId } = await database.collection('houses').insertOne(house, { session });
  await database.collection('users').updateOne(
    { _id: user._id, houseId: user.houseId },
    { $set: { houseId: insertedId, houseRole: 'owner', updatedAt: house.updatedAt } }, { session }
  );
}

export async function leaveHouse(actor) {
  await withDatabaseTransaction(async (database, session) => {
    const user = await lockHouseActor(database, session, actor, ['manager', 'member']);
    await newHome(database, session, user);
  });
  return getHouse(actor);
}

export async function updateMember(actor, id, body) {
  const role = fields(body, 'role');
  if (!['manager', 'member'].includes(role)) {
    throw Object.assign(new Error('Escolhe manager ou member.'), { status: 400 });
  }
  const _id = memberId(id);
  await withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor, ['owner']);
    const member = await database.collection('users').findOne({ _id, houseId: actor.houseId }, { session });
    if (!member) throw Object.assign(new Error('Membro não encontrado.'), { status: 404 });
    if (member.houseRole === 'owner') throw forbidden();
    await database.collection('users').updateOne(
      { _id, houseId: actor.houseId }, { $set: { houseRole: role, updatedAt: new Date() } }, { session }
    );
  });
  return getHouse(actor);
}

export async function removeMember(actor, id) {
  const _id = memberId(id);
  await withDatabaseTransaction(async (database, session) => {
    await lockHouseActor(database, session, actor, ['owner']);
    const member = await database.collection('users').findOne({ _id, houseId: actor.houseId }, { session });
    if (!member) throw Object.assign(new Error('Membro não encontrado.'), { status: 404 });
    if (member.houseRole === 'owner') throw forbidden();
    await newHome(database, session, member);
  });
}
