# KeepWell API

Servidor Node.js com Express e código de ligação ao MongoDB Atlas. A ligação real depende das credenciais no .env. Registo, login, sessões, categorias e criação/consulta de objetos implementados; edição/eliminação de objetos e tarefas ainda pendentes.

## Requisitos

Node.js 24 ou superior e npm.

## Executar

Preenche primeiro o .env conforme a secção de ligação abaixo. Depois abre um terminal nesta pasta e executa:

```powershell
npm.cmd install
npm.cmd run dev
```

O modo dev reinicia o servidor quando um ficheiro JavaScript muda.
Para executar sem reinício automático: `npm.cmd start`.
Para parar: Ctrl+C.

## Verificar

Abra http://localhost:3000/health no navegador. Resposta esperada:

```json
{"status":"ok","service":"keepwell-api"}
```

Esta resposta confirma que o servidor funciona; não confirma acesso à base de dados.
Uma rota inexistente devolve HTTP 404 com uma mensagem em JSON.

## Ficheiros

- `package.json`: nome do projeto, comandos e dependências.
- `package-lock.json`: versões exatas instaladas, para instalações reproduzíveis.
- `src/server.js`: configuração do Express, rota de estado e arranque HTTP.
- `.gitignore`: exclui dependências e ficheiros locais com segredos.

## Próxima etapa

Validar a ligação real com as credenciais locais e definir os modelos de dados (EDT 4.2).
Não colocar palavras-passe no código nem no Git.

## Ligação ao MongoDB Atlas (EDT 4.1.2)

A API usa o driver oficial `mongodb`. O Node.js lê o `.env` através de
`--env-file=.env`, sem precisar do pacote dotenv.

1. Abre `.env` nesta pasta. Se não existir, copia `.env.example` para `.env`.
2. Em `MONGODB_URI`, coloca a URI de Connect > Drivers no Atlas e substitui
   o marcador da palavra-passe pela palavra-passe do utilizador da base de dados.
   Não é a palavra-passe da tua conta do site Atlas.
3. Se não a guardaste, define uma nova em Security > Database Access > Edit.
   Se outros programas usarem esse utilizador, atualiza também as respetivas ligações.
4. Codifica caracteres especiais da palavra-passe para URL (por exemplo, @ como %40,
   # como %23 e % como %25). Codifica apenas a palavra-passe, não a URI inteira.
5. Mantém `MONGODB_DB=keepwell` e autoriza o teu IP atual no Network Access do Atlas.
6. Executa `npm.cmd run dev`. Depois de editar o `.env`, para e volta a executar o comando.

O arranque só continua depois de a ligação e um comando ping terem sucesso.
O driver reutiliza uma única instância de MongoClient em toda a API.
`src/database.js` concentra a ligação e disponibiliza `getDatabase()` para as
futuras operações sobre dados.

- `/health` confirma o processo HTTP.
- `/health/database` faz um ping ao MongoDB: HTTP 200 se disponível, HTTP 503 se falhar.

Selecionar o nome keepwell e executar ping não cria uma base persistente no Atlas.
Ela aparecerá quando criarmos a primeira coleção ou guardarmos dados numa etapa seguinte.
Não são criadas coleções ou dados de exemplo nesta etapa.

O `.env` contém segredos e está excluído do Git. O `.env.example` tem apenas marcadores.
Nunca partilhes a URI preenchida, nem capturas do `.env`.

Referências: https://www.mongodb.com/docs/drivers/node/current/connect/ e
https://nodejs.org/api/cli.html#--env-filefile


## Modelo Utilizador — EDT 4.2.1

Coleção: `users`. Campos: `_id` (ObjectId gerado pelo MongoDB), `name` (2–100
caracteres), `email` (normalizado para minúsculas, até 254 caracteres e único),
`passwordHash` (hash calculado no servidor), `role` (user/admin), `createdAt` e
`updatedAt` (datas). Os limites são decisões de implementação, ajustáveis.

`src/models/user.js` define validação da coleção e funções para construir o documento
e selecionar os campos públicos. `buildUser` recebe um hash já calculado internamente;
nunca deve receber diretamente o corpo inteiro de um pedido HTTP. A validação do
MongoDB verifica o tipo do hash, não prova que foi produzido por um algoritmo seguro.
O processamento e a validação da palavra-passe estão implementados no serviço de registo/autenticação.
O perfil de criação normal é sempre user. O perfil admin pode ser atribuído pelo comando local documentado na secção de administração.

Executa `npm.cmd run db:setup` para criar a coleção e o índice único. O comando pode
ser repetido; não apaga dados. Ao atualizar uma coleção existente, não corrige documentos
antigos, e o índice pode falhar se já existirem emails repetidos. Consulta os dados
antes de aplicar a bases já preenchidas. Esta etapa parte de uma coleção nova.

Executa `npm.cmd test` para verificar normalização, validação, proteção do perfil
e exclusão dos dados internos nas respostas. O modelo foi implementado antes das rotas; o registo está agora documentado na secção seguinte e o login está documentado na secção de sessões.

## Registo de conta — EDT 4.3.1 (parte do registo)

`POST /auth/register` com `Content-Type: application/json`:

```json
{
  "name": "Rafael",
  "email": "rafael@example.com",
  "password": "Exemplo123!"
}
```

Nome: 2–100 caracteres. Email: formato básico válido, normalizado para minúsculas.
Palavra-passe: 6–20 caracteres, sem espaços, tabulações ou quebras de linha. Esta regra foi definida pelo utilizador. Palavras-passe inválidas são rejeitadas, sem remoção silenciosa de caracteres.
Só estes três campos são aceites. Não é permitido enviar role ou passwordHash.

Resposta HTTP 201: `{ "user": { "id": "...", "name": "Rafael", "email": "rafael@example.com",
"role": "user", "createdAt": "...", "updatedAt": "..." } }`.
O hash e a palavra-passe nunca aparecem na resposta. O registo não inicia sessão; o token é obtido através do login.

Erros em JSON com campo `error`: 400 para dados/JSON inválidos; 409 para email já
registado; 413 para corpo demasiado grande; 415 para tipo de conteúdo incorreto;
429 após 10 tentativas por IP em 15 minutos; 503 se já houver quatro hashes em curso;
500 para falha interna. A resposta 409 permite deduzir a existência de um email.

Hash: scrypt assíncrono do Node.js, N=32768, r=8, p=3, salt aleatório de 16 bytes e
resultado de 64 bytes. Formato guardado: `scrypt$N$r$p$saltHex$hashHex`.
Salt e parâmetros são públicos; o formato permite futura verificação no login.
Referência: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

Organização: `src/app.js` configura o Express; `src/server.js` liga à BD e arranca;
`src/routes/auth.js` define HTTP e limite; `src/services/registration.js` valida e
guarda; `src/security/password.js` processa a palavra-passe.

`npm.cmd test` executa os testes sem ligação à BD. `npm.cmd run test:integration`
usa o Atlas configurado no .env, cria uma conta com email aleatório @example.com,
verifica o registo e remove apenas essa conta no fim. Não usa a porta 3000.

O limite de pedidos fica na memória e reinicia com o processo. Serve para uma
instância local; antes de publicar com várias instâncias/proxy, configurar um
armazenamento partilhado e trust proxy de acordo com o alojamento. Usar HTTPS
fora de localhost. Não registar corpos dos pedidos, palavras-passe ou hashes em logs.



## Login e sessões — EDT 4.3.1

### Entrar

`POST /auth/login`, Content-Type application/json:

```json
{"email":"rafael@example.com","password":"Exemplo123!"}
```

HTTP 200 devolve `{ "token": "...", "tokenType": "Bearer", "expiresAt": "...",
"user": { "id": "...", "name": "...", "email": "...", "role": "user",
"createdAt": "...", "updatedAt": "..." } }`.

Credenciais incorretas devolvem HTTP 401 e a mesma mensagem para email inexistente
e palavra-passe errada. Tipos/campos inválidos devolvem 400, tipo de conteúdo errado
415 e mais de 20 tentativas por IP em 15 minutos devolvem 429. O limite de hashes
simultâneos é partilhado com o registo (503 quando está ocupado).

A verificação recalcula o scrypt com o salt guardado e compara usando timingSafeEqual.
Não tenta desencriptar o hash. Faz também um cálculo para emails inexistentes,
reduzindo diferenças de tempo. O login preserva a palavra-passe exata e aceita até
128 caracteres para contas anteriores à regra atual de criação; novas contas
continuam limitadas a 6–20 caracteres sem espaços.

### Usar a sessão

Nas rotas protegidas, envia o cabeçalho `Authorization: Bearer TOKEN_RECEBIDO`.
O token tem 32 bytes aleatórios, representados por 64 caracteres hexadecimais.
Deve ser tratado como uma credencial: não o enviar em URLs ou logs.

- `GET /auth/me`: HTTP 200 com `{ "user": { ... } }`, sem hash nem token.
- `POST /auth/logout`: HTTP 204 sem corpo, elimina apenas a sessão usada no pedido.
- Token ausente, malformado, desconhecido ou expirado: HTTP 401.

Cada login cria uma sessão independente, válida 24 horas a partir da criação.
Não existe renovação automática ou refresh token nesta versão. Logout numa sessão
não termina as outras. A API consulta o utilizador atual a cada pedido autenticado.
Permissões de administrador e acesso aos objetos serão implementados nas rotas próprias.

A coleção técnica `sessions` guarda userId (ObjectId), tokenHash (SHA-256), createdAt
e expiresAt. O token original nunca fica na BD. SHA-256 é adequado para este token
aleatório; palavras-passe continuam a usar scrypt. `npm.cmd run db:setup` prepara
esta coleção e os seus índices único e TTL, além de preparar users.
O TTL limpa sessões expiradas em segundo plano; como essa limpeza não é imediata,
a API verifica expiresAt antes de autorizar qualquer pedido.

`src/services/authentication.js` trata login e sessões;
`src/middleware/require-auth.js` verifica a sessão antes de uma rota protegida;
`src/models/session.js` define a coleção técnica. Não foi adicionada dependência.

`npm.cmd test` inclui agora verificação de palavra-passe, formato do token e dados
do login. `npm.cmd run test:auth` testa o percurso HTTP/Atlas completo com uma conta
aleatória @example.com, removendo apenas essa conta e as suas sessões no final.
As verificações locais não substituem a configuração HTTPS e armazenamento seguro
do token no dispositivo quando ligarmos o Flutter.

Referências:
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://www.mongodb.com/docs/manual/core/index-ttl/


## Categorias — EDT 4.2.2 e consulta de 4.4.4

São categorias dos objetos, partilhadas por todos os utilizadores. As dicas também
serão associadas a categorias. A coleção `categories` tem `_id` (ObjectId), `name`,
`createdAt` e `updatedAt`. Não tem userId, porque não pertence a uma pessoa específica.
Objetos têm categoria e dono separados. O modelo Objeto está documentado na secção de objetos pessoais.

O nome é normalizado removendo espaços nas extremidades e reduzindo espaços repetidos.
O limite 2–60 caracteres é uma decisão de implementação. O índice único usa collation
portuguesa com strength 2: ignora maiúsculas/minúsculas e distingue acentos.
`npm.cmd run db:setup` prepara a coleção, sem inserir categorias oficiais.

`GET /categories` exige `Authorization: Bearer TOKEN`. Devolve HTTP 200:

```json
{"categories":[]}
```

Com dados, cada elemento tem id (string), name, createdAt e updatedAt. A lista vem
ordenada por nome segundo a collation portuguesa. Sem sessão válida, devolve 401.
As rotas POST, PATCH e DELETE para categorias estão agora implementadas
com proteção de administrador. A lista oficial de categorias ainda está por definir.
Os nomes usados na explicação e nos testes não são dados iniciais aprovados.

Modelo em `src/models/category.js`, consulta em `src/services/categories.js` e rota
em `src/routes/categories.js`. `npm.cmd test` inclui validação e normalização do modelo.

## Administração de categorias — EDT 4.3.2 e 4.4.4

| Método e rota | Perfil | Resposta de sucesso |
|---|---|---|
| GET /categories | user ou admin | 200, categories |
| GET /categories/:id | user ou admin | 200, category |
| POST /categories | admin | 201, category e Location |
| PATCH /categories/:id | admin | 200, category |
| DELETE /categories/:id | admin | 204 sem corpo |

POST e PATCH recebem apenas `{"name":"Eletrónica"}` com Content-Type application/json.
O PATCH preserva id e createdAt. Nome normalizado de 2–60 caracteres, único sem
distinguir maiúsculas/minúsculas. Não há categorias iniciais inseridas automaticamente.

Erros: 400 para id/dados inválidos; 401 sem sessão; 403 sem perfil admin; 404 para
categoria inexistente; 409 para nome repetido ou categoria associada a objetos/dicas;
415 para tipo de conteúdo errado. O perfil é consultado na BD a cada pedido, pelo
requireAuth; requireAdmin verifica-o antes da alteração. O cliente não escolhe o perfil.

Decisão de eliminação: recusar categorias usadas. A verificação consulta categoryId
como ObjectId em objects e tips. O modelo objects já está implementado; o modelo tips continua pendente. Quando
forem adicionadas escritas concorrentes nesses recursos, coordenar criação/alteração
de referências e eliminação de categoria para evitar uma corrida entre as operações.
Não existe chave estrangeira automática no MongoDB.

### Preparar a primeira conta admin

Cria primeiro uma conta pelo registo. Depois, no terminal local da pasta api, executa:

```powershell
npm.cmd run admin:promote -- email-da-conta
```

Este comando altera explicitamente o perfil dessa conta para admin. Não existe uma
rota HTTP pública de promoção. Quem possui acesso às credenciais locais da BD pode
executá-lo. Nenhuma conta real é promovida automaticamente. Podes confirmar o perfil
através de GET /auth/me; não é necessário voltar a entrar, pois a API consulta o perfil atual.

O script está em src/scripts/promote-admin.js; o middleware em
src/middleware/require-admin.js. O CRUD está em services/categories.js e routes/categories.js.

`npm.cmd run test:categories` executa o teste HTTP/Atlas com conta e categorias
aleatórias, promove apenas essa conta temporária durante o teste e remove os dados
criados no final. `npm.cmd test` inclui os testes locais de permissões e validação.


## Objetos pessoais — EDT 4.2.3 e primeira parte de 4.4.1

Campos da coleção objects: _id, name (2–100 caracteres, espaços normalizados),
userId e categoryId (ObjectId), createdAt e updatedAt. Nome e categoria são obrigatórios.
Não é exigido nome único: uma pessoa pode ter dois objetos com o mesmo nome.
Fotografia, edição, eliminação, pesquisa e filtro por categoria entram em etapas seguintes.

| Método e rota | Resultado |
|---|---|
| POST /objects | 201 com object e Location |
| GET /objects | 200 com objects, page, pageSize e total |
| GET /objects/:id | 200 com object |

Todas exigem Bearer. POST recebe apenas `{"name":"Portátil pessoal","categoryId":"ID_DO_SELECT"}`.
O categoryId tem de identificar uma categoria existente. O userId vem exclusivamente
da sessão. Campos internos ou desconhecidos são rejeitados com 400.
A resposta contém id, name, categoryId, createdAt e updatedAt. O Flutter pode obter o
nome da categoria através da lista GET /categories.

GET /objects aceita page e pageSize (inteiros positivos). Por defeito, page=1 e
pageSize=20; máximo pageSize=100 e page=1000000. Ordena dos mais recentes para os mais
antigos, com id como desempate. O total e a lista podem refletir instantes ligeiramente
diferentes se houver criação simultânea. Outros parâmetros são rejeitados nesta etapa.

Consulta individual e listagem filtram SEMPRE pelo userId da sessão, incluindo admins.
Um objeto inexistente ou pertencente a outra pessoa devolve a mesma resposta 404.
Id malformado: 400; sem sessão: 401; tipo de conteúdo errado no POST: 415.

Preparação: npm.cmd run db:setup cria a coleção e índices por dono/data e categoria.
Criação e eliminação de categorias usam transações: ambas escrevem na categoria, num
contador interno opcional referenceVersion, para coordenar alterações concorrentes.
Este campo não é uma contagem de objetos e não sai na API. Objetos e categoria são
confirmados em conjunto, com repetição automática de conflitos pelo driver.
Ao implementar dicas e alterações de categoria dos objetos, reutilizar este protocolo.
Acesso direto à BD fora da API não é abrangido por estas regras.

Ficheiros: src/models/object.js, src/services/objects.js e src/routes/objects.js.
A função withDatabaseTransaction em database.js concentra a abertura/fecho da transação.
Referência: https://www.mongodb.com/docs/drivers/node/current/crud/transactions/

npm.cmd test inclui validação do modelo e paginação. npm.cmd run test:objects verifica
HTTP/Atlas com duas contas temporárias, isolamento por dono, categorias e transações;
apaga apenas os dados exclusivos desse teste no fim.

### PowerShell e acentos

Para enviar JSON com acentos de forma consistente, usa bytes UTF-8:

```powershell
$dados = @{ name = "Portátil pessoal"; categoryId = "ID_REAL_DA_CATEGORIA" } | ConvertTo-Json
$corpoUtf8 = [System.Text.Encoding]::UTF8.GetBytes($dados)
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/objects" -Headers $cabecalhos -ContentType "application/json; charset=utf-8" -Body $corpoUtf8
```

