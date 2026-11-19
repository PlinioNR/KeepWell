# Casas, convites e papéis — especificação

Decidido a 17/11/2026, depois de falarmos com o professor. Substitui o administrador global.
Estado em 19/11/2026 — backend implementado e validado em bases temporárias do Atlas. A migração da base partilhada e a integração dos ecrãs da casa estão pendentes.

Os comandos atuais e o contrato das rotas estão no [README da API](../api/README.md).

## A ideia em 4 frases

1. Quem cria conta fica logo com uma **casa** e é o **dono** dela.
2. O dono (ou um gestor) gera um **código de convite**; quem o escrever na app entra na casa como **membro**.
3. Os objetos, os cuidados e as dicas passam a ser **da casa** (deixam de ser de um utilizador).
4. O que cada pessoa pode fazer depende do seu **papel** na casa: dono, gestor ou membro.

## Decisões

| Tema | Decisão |
|---|---|
| Papéis | 3 fixos: **dono**, **gestor**, **membro** (sem permissões à medida) |
| Convite | Só por **código** (sem emails) |
| Casas por pessoa | **Uma** de cada vez |
| Categorias | **Fixas** (criadas pelo `seed`; sem ecrãs para as gerir) |
| Dicas | Geridas pelo **dono e pelo gestor**, por casa |
| Administrador global | **Deixa de existir** |

## O que cada papel pode fazer

| Ação | Dono | Gestor | Membro |
|---|:-:|:-:|:-:|
| Ver objetos, fotos, cuidados, histórico e dicas | ✓ | ✓ | ✓ |
| Adicionar objeto (com foto e análise Gemini) | ✓ | ✓ | ✓ |
| Editar e eliminar objetos; mudar ou apagar a foto | ✓ | ✓ | ✗ |
| Criar, editar, concluir e eliminar cuidados | ✓ | ✓ | ✗ |
| Criar, editar e eliminar dicas | ✓ | ✓ | ✗ |
| Ver os membros da casa | ✓ | ✓ | ✓ |
| Gerar o código de convite; mudar o nome da casa | ✓ | ✓ | ✗ |
| Mudar o papel de alguém; remover alguém | ✓ | ✗ | ✗ |
| Sair da casa | ✗ | ✓ | ✓ |

Exceção: o membro pode enviar a foto de um objeto **que ele próprio criou** (a app cria o objeto e
só depois envia a foto). Para isso o objeto guarda quem o criou (`createdBy`).

## Regras

- **Criar conta**: cria o utilizador e uma casa "Casa de {primeiro nome}", com ele como dono
  (na mesma transação).
- **Código de convite**: 8 caracteres fáceis de ler (sem 0/O nem 1/I), um por casa, válido 7 dias.
  Gerar outro substitui o anterior. Pode ser usado por várias pessoas enquanto for válido.
  Quem entra fica **membro**.
- **Entrar numa casa com código** (uma casa de cada vez): só é possível se a casa atual da pessoa
  estiver **vazia** (só ela, sem objetos e sem dicas). Essa casa vazia é apagada.
  Se não estiver vazia, a API recusa com 409: "Para entrar noutra casa, a tua casa tem de estar vazia."
- **Sair da casa** (gestor ou membro): a pessoa sai e fica com uma casa nova e vazia, como dona.
  O dono não pode sair (simplificação).
- **Remover alguém** (só o dono): a pessoa removida fica com uma casa nova e vazia.
- **Mudar papel** (só o dono): entre gestor e membro. Não há transferência de dono (simplificação).
- **Eliminar objeto** com cuidados continua a dar 409, como hoje.
- Sem permissão → **403** "Não tens permissão para esta ação."

## Alterações à API (Rafael)

### Modelo de dados

| Coleção | Alteração |
|---|---|
| `houses` (nova) | `name`, `inviteCode` (ou null), `inviteExpiresAt` (ou null), `createdAt`, `updatedAt` |
| `users` | `role` (user/admin) sai; entram `houseId` e `houseRole` (`owner`, `manager`, `member`) |
| `objects` | `userId` passa a `houseId`; novo `createdBy` (id do utilizador) |
| `tasks` | `userId` passa a `houseId` |
| `tips` | novo `houseId` (a `categoryId` mantém-se) |
| `categories` | sem alterações; deixam de ter rotas de escrita |

Como cada pessoa só tem uma casa, a ligação fica guardada no próprio utilizador
(`houseId` + `houseRole`), sem coleção de membros à parte.

### Rotas novas

| Método e caminho | Quem | O que faz |
|---|---|---|
| `GET /house` | todos | `{ house: {id, name}, role, members: [{id, name, email, role}], invite: {code, expiresAt} }` (o `invite` só para dono e gestor) |
| `PATCH /house` | dono, gestor | Muda o nome: `{ name }` |
| `POST /house/invite` | dono, gestor | Gera um código novo: `{ code, expiresAt }` |
| `POST /house/join` | todos | Entra com `{ code }` (ver regras acima) |
| `POST /house/leave` | gestor, membro | Sai da casa |
| `PATCH /house/members/:userId` | dono | Muda o papel: `{ role: "manager" \| "member" }` |
| `DELETE /house/members/:userId` | dono | Remove a pessoa da casa |

### Rotas que mudam por dentro (os caminhos ficam iguais)

- `/objects`, `/objects/:id/photo`, `/objects/:id/history`, `/tasks`, `/tips`: filtram por
  `houseId` da pessoa em vez de `userId`, e verificam o papel antes de escrever (tabela acima).
- `POST /objects` guarda `houseId` e `createdBy`.
- `POST /auth/register` cria também a casa. `POST /auth/login` e `GET /auth/me` devolvem
  `houseRole` no utilizador (a app precisa dele para esconder botões).
- `/categories`: ficam só `GET`; saem `POST`, `PATCH` e `DELETE`.
- `require-admin.js` dá lugar a algo como `requireHouseRole('owner', 'manager')`.
- `promote-admin.js` deixa de fazer sentido.

### Migração dos dados que já existem

Um script (por exemplo `npm.cmd run migrate:houses`) que, para cada utilizador sem `houseId`:
cria a casa, põe-no como dono e passa os seus objetos e tarefas de `userId` para `houseId`
(e `createdBy` = ele). As dicas atuais (globais) passam para a casa da Ana; o `seed:demo` fica:

- `ana@keepwell.test` — dona
- `bruno@keepwell.test` — membro da casa da Ana
- `gestor@keepwell.test` (em vez de `admin@`) — gestor da casa da Ana

Atenção: a base de dados é partilhada. Correr a migração uma vez, combinada entre os dois.

### Testes a acrescentar

- Membro: vê tudo, cria objeto e foto do próprio objeto; recebe 403 a editar, eliminar, criar
  cuidado ou dica.
- Gestor: tudo menos mudar papéis e remover; 403 nesses.
- Ninguém vê objetos, cuidados ou fotos de outra casa (404, como hoje).
- Código expirado ou errado → erro; entrar com casa não vazia → 409.

## Alterações à app (Plinio)

Pouco muda no que já existe, porque os caminhos da API ficam iguais.

1. `User` passa a ter `houseRole`; getters `canManage` (dono ou gestor) e `isOwner`.
2. Esconder o que o membro não pode fazer: lápis e caixote no Detalhe, "Adicionar cuidado",
   o + e o círculo de concluir em Cuidados, gestão de dicas.
3. Ecrã **A minha casa** (a partir do Perfil): nome da casa, membros e papéis, gerar código
   (dono/gestor), mudar papel e remover (dono), sair (gestor/membro).
4. Entrar noutra casa **sem ecrã próprio**: em A minha casa, o botão "Tenho um código" abre uma
   caixa (AlertDialog) com o campo do código. Só aparece se a casa atual estiver vazia.
5. Dicas: consulta para todos; criar, editar e eliminar para dono e gestor
   (substitui os ecrãs de administração).

## Impacto no projeto

- **Sai**: administrador global, gestão de categorias, ecrãs 15–17 do Figma (Admin e categorias).
- **Muda**: ecrãs 18–19 (dicas) passam a ser da casa; Perfil ganha "A minha casa".
- **Entra**: ecrã "A minha casa" (com a caixa "Tenho um código"); código de convite; papéis.
- **Requisito "≥2 tipos de utilizador"**: passa a ser cumprido pelos papéis na casa.
  Confirmar com o professor que conta.
- **Cortes previstos** para caber no tempo: lembretes (5.4.4) e repetição (5.4.5) na app.
- **Ordem sugerida**: Rafael muda a API esta semana; entretanto a app avança no histórico (5.3.5)
  e nas dicas (5.5.1), que quase não dependem disto; os ecrãs da casa vêm depois.
