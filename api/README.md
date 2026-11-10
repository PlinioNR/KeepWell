# KeepWell API

Servidor Node.js com Express e código de ligação ao MongoDB Atlas. A ligação real depende das credenciais no .env. Registo, login, sessões, categorias e criação/consulta de objetos implementados; CRUD, pesquisa e filtro de objetos implementados; fotografia e tarefas ainda pendentes.

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
Edição e eliminação estão implementadas na secção seguinte. Pesquisa e filtro já estão implementados na secção respetiva. A fotografia continua pendente.

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
diferentes se houver criação simultânea. Também são aceites search e categoryId, documentados na secção de pesquisa e filtro.

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


## Editar e eliminar objetos — continuação da EDT 4.4.1

PATCH /objects/:id exige sessão e recebe name e/ou categoryId, com pelo menos um
campo. Rejeita campos internos, incluindo userId, datas e referenceVersion.
Preserva id, dono e createdAt. Devolve HTTP 200 com object. Ao mudar de categoria,
confirma a existência da nova e usa a transação coordenada com deleteCategory.

DELETE /objects/:id exige sessão e devolve 204 sem corpo. Só o dono pode eliminar.
A regra proposta de preservação do histórico é bloquear a eliminação quando existe
qualquer tarefa em tasks com objectId igual ao objeto, incluindo tarefas concluídas.
Devolve 409 sem alterar o objeto. O modelo de tarefas ainda não foi implementado.

Nos dois métodos: 400 para id/dados inválidos; 404 para objeto inexistente ou alheio;
401 sem sessão; no PATCH, 415 para tipo de conteúdo incorreto. Admins também só
podem alterar os seus próprios objetos nestas rotas.

O objeto admite referenceVersion como campo técnico opcional, oculto na API.
A eliminação escreve nesse campo dentro da transação antes de consultar tarefas.
Quando implementarmos a criação de tarefas, esta terá de escrever no mesmo objeto
na sua transação para coordenar a concorrência. A eliminação não faz cascata.

npm.cmd run test:objects cobre agora edição parcial, mudança de categoria, preservação
de createdAt, bloqueio por tarefa, eliminação e proibição de alterações por outra conta.
O teste insere uma referência temporária em tasks e remove-a; isso não implementa
nem aprova o modelo de tarefas. A coleção poderá aparecer vazia no Atlas após o teste.
Pesquisa e filtro por categoria estão implementados. A fotografia continua pendente.


## Pesquisa e filtro de objetos — conclusão desta parte da EDT 4.4.1

GET /objects aceita agora search e categoryId além de page e pageSize.

- search: texto de até 100 caracteres, espaços normalizados; procura parte do nome,
  ignorando maiúsculas/minúsculas e distinguindo acentos. Texto vazio ignora a pesquisa.
- categoryId: ObjectId com 24 caracteres hexadecimais; vazio significa todas as categorias.
  Um id bem formado que não corresponde a nenhum objeto devolve lista vazia.
- Ambos podem ser combinados. O total conta os resultados filtrados antes da paginação.
- Parâmetros repetidos, tipos/formatos inválidos ou campos desconhecidos devolvem 400.
- O filtro obrigatório userId vem da sessão e aplica-se à consulta e ao total.

Exemplos: /objects?search=port, /objects?categoryId=ID_REAL e
/objects?search=port&categoryId=ID_REAL&page=1&pageSize=20.
O texto é escapado antes da expressão regular MongoDB: símbolos como +, . e * são
literais, não operadores. Não se aceitam filtros MongoDB fornecidos pelo cliente.
Pesquisa por substring não usa um índice de texto; a escala atual permite manter a
implementação simples. O índice de dono limita o conjunto relevante para cada pessoa.

No PowerShell, codifica o texto para URL:

```powershell
$pesquisa = [Uri]::EscapeDataString("port")
Invoke-RestMethod -Uri "http://localhost:3000/objects?search=$pesquisa" -Headers $cabecalhos | ConvertTo-Json -Depth 5
```

O teste de integração de objetos cobre pesquisa, símbolos literais, categoria,
combinação, paginação, resultados vazios, parâmetros inválidos e isolamento entre contas.
A fotografia continua pendente.


## Ajustes aos ecrãs do Figma (Screens, revistos a 03/11/2026)

### Categoria

POST /categories aceita name (obrigatório), icon e description.
icon usa o catálogo inicial package, plug, armchair, bike, shirt, wrench, laptop, car.
São chaves para mapear a componentes Lucide no Flutter, não SVG nem código executável.
GET /categories/icons exige sessão e devolve {icons:[...]}, para preencher o select.
O catálogo inicial é uma decisão de implementação; o protótipo não especifica as opções.

description é texto opcional, até 500 caracteres. Para limpar, enviar string vazia.
icon por defeito é package e description por defeito é string vazia. A leitura de
documentos antigos devolve esses valores sem exigir migração ou apagar categorias.
Os campos novos são opcionais na validação MongoDB para preservar dados anteriores.

PATCH /categories/:id aceita um ou mais dos três campos, preservando os omitidos,
o id e createdAt. Campos adicionais, valores inválidos e pedido vazio devolvem 400.
O perfil admin continua obrigatório para criar, editar e eliminar.

GET /categories?search=texto pesquisa parte do nome, sem distinguir maiúsculas e
minúsculas, distinguindo acentos e tratando símbolos literalmente. Até 60 caracteres;
parâmetros desconhecidos/repetidos ou tipos inválidos devolvem 400. Vazio lista tudo.

A listagem para admin acrescenta objectCount por categoria: quantidade GLOBAL de
objetos nessa categoria, de todos os utilizadores. Esta é a interpretação implementada
para a contagem no ecrã administrativo, não um acesso aos documentos dos objetos.
A contagem é calculada por agregação, não guardada no documento nem baseada em
referenceVersion. Utilizadores comuns não recebem objectCount. Seleção do perfil
usa apenas a sessão, nunca parâmetros do cliente.

### Data de aquisição do objeto

POST e PATCH /objects aceitam acquiredOn opcional. Formato de transporte: AAAA-MM-DD,
por exemplo 2023-07-03. A aplicação apresenta dd/mm/aaaa. É uma data sem hora, guardada
como string para evitar alterações por fuso horário, com validação de calendário na API.
Datas como 2025-02-29 são rejeitadas com 400. Não há restrição adicional por data futura.
Campo omitido no POST e objetos antigos são apresentados com acquiredOn:null.
No PATCH, omitir preserva o valor; null limpa-o. As datas createdAt/updatedAt são
instantes de registo/alteração e não substituem a data de aquisição.

Exemplo de objeto: {"name":"Portátil","categoryId":"ID_REAL","acquiredOn":"2023-07-03"}.
Exemplo de categoria: {"name":"Eletrónica","icon":"laptop","description":"Equipamento eletrónico"}.
Usar bytes UTF-8 e Content-Type application/json; charset=utf-8 no PowerShell.

Ainda pendentes do design: fotografia; descrição do objeto (aparece no detalhe mas
não no formulário, precisa de decisão); próximo cuidado e histórico (dependem de tarefas).
Não foi alterado o design no Figma ou a interface Flutter nesta etapa.

## Descrição opcional dos objetos — decisão de 08/11/2026

POST /objects e PATCH /objects/:id aceitam description, texto opcional até 1000
caracteres após trim. As quebras de linha internas são preservadas. Omitir no POST
usa string vazia; omitir no PATCH preserva o valor; enviar string vazia limpa o campo.
Null, números, listas e objetos são rejeitados com HTTP 400.

O campo é opcional na validação MongoDB para manter documentos antigos válidos.
As respostas de criação, detalhe, listagem e edição incluem description, usando
string vazia quando não existe no documento antigo. O controlo de dono mantém-se.

No futuro formulário Flutter de adicionar/editar objeto, incluir um campo multilinha
"Descrição (opcional)", até 1000 caracteres, depois da categoria. O ecrã de detalhe
mostra o texto quando estiver preenchido. Os formulários de objetos ainda não existem
no Flutter desta revisão; a interface e o Figma não foram alterados nesta etapa.

Esta decisão resolve a descrição visível no detalhe do protótipo. A fotografia
continua pendente. Os testes locais e de integração de objetos cobrem os novos casos.

## Fotografias dos objetos — EDT 4.5

Uma fotografia por objeto, privada. Primeiro cria o objeto por POST /objects e depois
usa PUT /objects/:id/photo. Todas as rotas exigem Authorization Bearer e o dono do
objeto. Uma conta admin também não pode consultar fotografias de objetos alheios.

| Método e rota | Pedido/resposta |
|---|---|
| PUT /objects/:id/photo | multipart/form-data, um ficheiro no campo photo; 200 com object |
| GET /objects/:id/photo | 200 image/jpeg, Cache-Control no-store |
| DELETE /objects/:id/photo | 204; repetição sem foto também devolve 204 |

A resposta pública do objeto inclui photoUrl relativo (/objects/ID/photo), ou null.
O caminho do disco e photoKey não são expostos. O Flutter deve fazer o pedido da imagem
com o mesmo cabeçalho Authorization; uma URL sem o token não dá acesso à fotografia.
Ao substituir uma imagem, a referência anterior é removida e o seu ficheiro é limpo.
Ao eliminar um objeto, o ficheiro só é removido depois do commit da eliminação; se houver
tarefas e a eliminação for bloqueada, a fotografia mantém-se.

Formatos de entrada: JPEG, PNG e WebP estáticos. Até 5 MiB (5*1024*1024 bytes) e
25 megapíxeis. O MIME declarado não é suficiente: sharp verifica e descodifica o
conteúdo. A saída é JPEG, qualidade 85, até 1600x1600 mantendo proporções, sem ampliar,
com fundo branco para transparências. Corrige orientação EXIF e remove metadados,
incluindo EXIF/GPS. HEIC, SVG, GIF e formatos animados não são aceites nesta versão.

Multer recebe um único ficheiro, sem outros campos. Limite de 30 envios por IP em
15 minutos e dois uploads em simultâneo por processo. 400 para campo ausente/errado
ou multipart com campos extra; 401 sem sessão; 404 para objeto inexistente/alheio ou
fotografia ausente; 413 acima do limite; 415 para formato/conteúdo inválido; 429 para
limite de tentativas; 503 para limite de concorrência. Erros internos devolvem 500.

### Armazenamento e consistência

Ficheiros em api/storage/object-photos/, com nome UUID gerado no servidor. A pasta
/storage/ está excluída do Git; o código em src/storage/ NÃO está excluído. O MongoDB
guarda apenas photoKey opcional. Objetos anteriores continuam sem fotografia.
Não existe express.static para esta pasta: o acesso passa pela verificação do dono.

É armazenamento local de desenvolvimento/demonstração. É necessário copiar/preservar
esta pasta juntamente com a base de dados para manter as imagens. Ao alojar a API,
configurar disco persistente ou migrar para armazenamento de objetos; não usar disco
efémero. Múltiplas instâncias precisariam de armazenamento partilhado.

Disco e MongoDB não partilham uma transação: o código remove uploads novos se a
associação falha, limpa imagens substituídas e evita apagar se a confirmação da BD é
incerta. Uma queda do processo entre passos pode deixar ficheiros órfãos, cuja limpeza
operacional fica para a fase de alojamento. Não há garantia atómica entre disco e BD.

Ficheiros: src/storage/photo-files.js (imagem/disco), src/services/object-photos.js
(associação/acesso), src/middleware/receive-photo.js (multipart e limites).
Dependências: multer e sharp. Referências:
https://expressjs.com/en/resources/middleware/multer/
https://sharp.pixelplumbing.com/api-output/

### Testar no PowerShell (compatível com Windows PowerShell)

Usa curl.exe para enviar multipart; não defines manualmente o Content-Type porque o
curl acrescenta a fronteira necessária. Mantém a variável login no mesmo terminal.

```powershell
$idObjeto = "ID_REAL_DO_TEU_OBJETO"
$caminhoFoto = "C:\caminho\fotografia.jpg"
curl.exe --request PUT "http://localhost:3000/objects/$idObjeto/photo" --header "Authorization: Bearer $($login.token)" --form "photo=@$caminhoFoto"
```

Consulta os dados do objeto por GET /objects/:id para confirmar photoUrl.
Para remover só a fotografia:

```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/objects/$idObjeto/photo" -Headers $cabecalhos
```

npm.cmd test valida limites, conteúdo, orientação, dimensões, metadados e caminhos.
npm.cmd run test:photos usa duas contas temporárias e imagens geradas para verificar
upload, acesso por dono, substituição, remoção e limpeza ao eliminar o objeto. Remove
os dados e ficheiros do teste no final. A captura pela câmara/galeria e a apresentação
da fotografia no Flutter ainda não foram implementadas nesta etapa.

## Análise de fotografias com Gemini

`POST /objects/photo-analysis` requer um token Bearer e recebe um único ficheiro
`photo` em `multipart/form-data` (JPEG, PNG ou WebP estático, até 5 MiB).
Pode ser usado antes de criar o objeto. O backend valida e normaliza a imagem
em memória, remove metadados e envia a imagem e o catálogo de categorias ao Gemini.
A rota não grava a imagem, o objeto ou os cuidados.

Configura estas variáveis no `api/.env` local e reinicia a API.

```dotenv
GEMINI_API_KEY="cola_a_tua_chave_aqui"
GEMINI_MODEL=gemini-3.1-flash-lite
```

A chave é criada no [Google AI Studio](https://aistudio.google.com/apikey)
e fica apenas no ambiente do backend. Mantém o `.env` fora do Git.

Com a API a correr e um `$token` válido, testa no PowerShell.

```powershell
$caminhoFoto = "C:\Users\rafae\Downloads\foto.jpg"
curl.exe -i "http://localhost:3000/objects/photo-analysis" -H "Authorization: Bearer $token" -F "photo=@$caminhoFoto"
```

O `200 OK` devolve o nome, o ID de uma categoria do catálogo e até quatro
sugestões com título e descrição. Exemplo de resposta.

```json
{
  "object": { "name": "Bicicleta", "categoryId": "507f1f77bcf86cd799439011" },
  "suggestedTasks": [
    { "title": "Lubrificar a corrente", "description": "Limpar e lubrificar a corrente." }
  ]
}
```

O nome e a categoria podem vir como `null`, e as sugestões podem vir vazias.
No Flutter, a categoria sugerida pode ser pré-selecionada pelo ID se ainda
estiver no catálogo e o utilizador não tiver escolhido outra. A interface deve
informar que a foto será processada pelo Google, preservar edições manuais e
ignorar respostas de fotografias que já foram trocadas.

Ao aceitar um cuidado, o utilizador pode rever a sugestão e escolher a data,
o lembrete e a repetição antes de enviar `POST /tasks`. Essa rota aceita
`dueOn`, `reminderEnabled` e `repeatEveryDays`. Envia a descrição revista em `description` (opcional, até 1000 caracteres).
O campo `notes` fica reservado às observações da conclusão.

A rota limita a 10 pedidos por utilizador a cada 15 minutos (`429`).
Uma falha na chamada ou resposta do Gemini devolve `502`. Configuração em
falta devolve `503`. Exceder os 15 segundos da chamada ao Gemini devolve
`504`. O formulário deve permitir continuar manualmente.

## Cuidados/tarefas — EDT 4.2.4 e primeira etapa de 4.4.2

Uma tarefa pertence a um objeto e ao seu dono. Coleção tasks com _id, objectId e
userId (ObjectId), title (2–120 caracteres, espaços normalizados), dueOn (AAAA-MM-DD),
status, completedAt, createdAt e updatedAt. A criação usa sempre status=pending e
completedAt=null. O cliente não controla estado, dono ou datas internas.
A data prevista é obrigatória, sem hora, validada contra o calendário. Pode ser
passada, permitindo registar cuidados já em atraso. Não se guarda um estado overdue:
o atraso dependerá da data e do estado, nos filtros que serão implementados depois.

POST /tasks recebe apenas {"objectId":"ID_REAL","title":"Limpar o filtro","dueOn":"2026-11-15"}.
Exige Bearer e Content-Type application/json. Resposta 201 com task e Location.
O objeto tem de existir e pertencer à conta. Objeto alheio e inexistente devolvem 404.
Dados/identificadores inválidos: 400. Sem sessão: 401. Tipo de conteúdo errado: 415.

GET /tasks lista apenas tarefas do dono, ordenadas por dueOn ascendente, com id como
desempate. Paginação page=1 e pageSize=20 por defeito, máximo pageSize=100 e page=1000000.
Resposta {tasks:[...],page,pageSize,total}. O total e lista podem refletir momentos
ligeiramente diferentes se houver alterações simultâneas. GET /tasks/:id devolve task
ou 404 para inexistente/alheia. A resposta não expõe userId. Admins também só consultam
as suas tarefas pessoais nestas rotas.

A criação escreve em objects.referenceVersion dentro da mesma transação que insere
a tarefa. É o protocolo partilhado com deleteObject para impedir tarefas órfãs.
Eliminar um objeto com tarefas continua bloqueado com 409.

setupTasks configura validação estrita, índice por dono/data e por objeto. O schema
prepara dois estados coerentes: pending com completedAt null ou completed com uma data.
A conclusão tem uma rota própria documentada na secção seguinte; o cliente não altera diretamente estes campos.

Ficheiros: models/task.js, services/tasks.js, routes/tasks.js.
Comandos: npm.cmd run db:setup, npm.cmd test e npm.cmd run test:tasks.
O teste de integração usa duas contas temporárias e remove apenas os seus dados.
Os fixtures de objetos/fotografias foram atualizados para o modelo real de tarefas.

Conclusão e histórico estão implementados na secção seguinte. Ainda pendentes: edição/eliminação da tarefa e filtro por estado ou
objeto, repetição, lembretes e associação a dicas. Esta etapa não implementa nem agenda
notificações. O Flutter ainda precisa do formulário e serviço de cuidados.

A criação e a edição de cuidados pendentes aceitam `description`, um texto
opcional até 1000 caracteres. Envia `""` para limpar. Cuidados antigos sem o
campo devolvem `""`. A próxima ocorrência de um cuidado recorrente herda a
descrição e começa com as observações de conclusão vazias.

## Concluir cuidados e consultar histórico — EDT 4.4.2

POST /tasks/:id/complete exige Bearer e Content-Type application/json.
Recebe {} ou {"notes":"Filtro lavado e testado."}. As observações são opcionais,
até 1000 caracteres após trim, preservando parágrafos. Outros campos são rejeitados.
A data de realização não é escolhida pelo cliente: é definida pela API.

Resposta HTTP 200 com task. Uma tarefa pendente passa a completed, com completedAt
e updatedAt iguais ao instante do servidor e notes guardadas. Preserva createdAt,
objectId, title e dueOn. Concluir antes da data prevista é permitido.
A alteração usa uma única escrita atómica com filtro por id, dono e estado pending.
Pedidos repetidos, incluindo simultâneos, devolvem a conclusão existente sem alterar
data, observações ou criar outro registo. Novas observações enviadas depois da primeira
conclusão não substituem as originais. Reabertura/edição de concluídos não existe nesta etapa.

GET /objects/:id/history exige o dono do objeto. A resposta inclui
`{ tasks, events, page, pageSize, total }`. A lista `tasks` mantém os cuidados
concluídos, do mais recente ao mais antigo, com desempate pelo ID. A paginação
usa `page=1` e `pageSize=20` por defeito, com máximo de 100 por página.
O campo `total` conta apenas os cuidados concluídos.

- `care_completed` traz `occurredAt` (data de conclusão) e `task`, com título e observações.
- `object_added` traz `occurredAt` (data de criação do objeto). Aparece uma vez na
  última página de cuidados, ou na primeira quando não há cuidados concluídos.
  É um evento adicional e pode fazer com que a última página de `events` tenha
  mais uma entrada do que `pageSize`.

A linha do tempo é montada com os cuidados concluídos e a data de criação
guardada no objeto. A consulta e a contagem podem refletir momentos ligeiramente
diferentes durante alterações concorrentes.

Erros: 400 para dados/identificadores/paginação inválidos; 401 sem sessão; 404 para
cuidado/objeto inexistente ou alheio; 415 para conclusão sem tipo JSON. Histórico vazio
num objeto próprio devolve 200 e tasks:[], total:0. Mesmo com tarefas concluídas,
a eliminação do objeto continua bloqueada para preservar os registos.

notes é opcional na validação da coleção para compatibilidade com tarefas anteriores;
a resposta usa string vazia quando não existe. O índice tasks_object_history suporta
a consulta por dono, objeto, estado e data de realização.

Ficheiros: models/task.js, services/tasks.js, routes/tasks.js e routes/objects.js.
npm.cmd test e npm.cmd run test:tasks cobrem validação, conclusão, repetição,
concorrência, histórico, paginação e isolamento. O teste Atlas remove os seus dados.

Exemplo PowerShell, usando o mesmo terminal do login:

```powershell
$idCuidado = "ID_REAL_DO_CUIDADO"
$dados = @{ notes = "Filtro lavado e testado." } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/tasks/$idCuidado/complete" -Headers $cabecalhos -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($dados))
Invoke-RestMethod -Uri "http://localhost:3000/objects/$idObjeto/history" -Headers $cabecalhos | ConvertTo-Json -Depth 5
```

Pendentes: editar/eliminar tarefas, filtros por objeto/estado, repetição, lembretes,
dicas e integração dos cuidados com o Flutter. Nenhum lembrete é agendado por esta operação.


### Edição, eliminação e filtros de cuidados

- PATCH /tasks/:id recebe title, dueOn ou ambos e devolve 200 com task.
- DELETE /tasks/:id elimina o cuidado e devolve 204.
- As duas alterações exigem uma sessão do dono e estado pending. Um cuidado concluído
  devolve 409 para preservar o histórico. Inexistente ou alheio devolve 404.
- GET /tasks aceita objectId e status em conjunto com page e pageSize.
  pending inclui cuidados previstos para hoje ou depois, overdue inclui pendentes
  com data anterior a hoje, completed inclui concluídos. Hoje segue Europe/Lisbon.
  Omitir status lista todos. Atraso é calculado na consulta, sem alterar o estado guardado.

### Dicas de conservação

GET /tips aceita categoryId, search (parte literal do título), page e pageSize.
Devolve tips, page, pageSize e total. GET /tips/:id devolve tip.
Ambas as consultas exigem sessão.

POST /tips recebe title (2–120 caracteres), text (1–3000 caracteres) e categoryId.
PATCH /tips/:id aceita alterações parciais a esses campos. DELETE /tips/:id devolve
204. As três operações exigem administrador. A categoria tem de existir e a sua
eliminação devolve 409 enquanto houver dicas associadas.

Executa npm.cmd run db:setup para preparar a coleção tips.

GET /tasks aceita dueFrom e dueTo em AAAA-MM-DD. Cada limite é opcional e inclusivo.
Os limites combinam com status, objectId e paginação. O total conta os cuidados que
correspondem a todos os filtros antes da paginação. Datas inválidas ou invertidas
devolvem 400. Para os próximos cuidados da semana, usa status=pending e dueTo com
a data de domingo.

GET /objects e GET /objects/:id devolvem nextCare em cada objeto. Contém id, title
e dueOn do primeiro cuidado pendente com data de hoje ou posterior, ou null se
não houver nenhum. A seleção usa o calendário de Lisboa e desempata por id.

POST /tasks e PATCH /tasks/:id aceitam repeatEveryDays. Usa um inteiro de 1 a 365
para repetir ou null para desativar. Omitir no PATCH preserva a configuração.
Ao concluir, a API cria o próximo cuidado a partir do dia da conclusão em Lisboa,
mantendo objeto, título e intervalo. A conclusão e a criação são atómicas. Repetir
o pedido de conclusão não cria outro cuidado. Executa db:setup antes de usar.

PATCH /auth/me/preferences aceita theme (system, light ou dark) e/ou
remindersEnabled (booleano), exige sessão e devolve user. GET /auth/me e o
login incluem user.preferences. Os valores por defeito são system e false.
A preferência de lembretes pode ser lida pela app para configurar notificações.
Executa npm.cmd run db:setup para atualizar a validação no Atlas.

POST /tasks e PATCH /tasks/:id aceitam reminderEnabled (true ou false).
O valor por defeito é false. Omitir o campo no PATCH preserva a escolha.
A próxima ocorrência de um cuidado recorrente herda a preferência.
O Flutter pode agendar um lembrete local quando user.preferences.remindersEnabled
e task.reminderEnabled forem true e o cuidado estiver pendente.
Executa npm.cmd run db:setup para atualizar a validação.

PATCH /auth/me recebe apenas name e devolve user. Exige sessão da própria conta
e aplica a mesma regra do registo: 2 a 100 caracteres após remover espaços das
extremidades. GET /auth/me devolve o nome atualizado.

PATCH /auth/me/email recebe email (novo endereço) e password (palavra-passe atual).
Exige sessão, normaliza o endereço como no login e devolve 200 com user.
Uma palavra-passe errada devolve 401, dados inválidos devolvem 400 e um email
ocupado devolve 409. O índice único também protege contra alterações simultâneas.
Há um limite de 10 pedidos por IP em 15 minutos. As sessões são ligadas ao ID
da conta e continuam válidas. O próximo login usa o endereço novo.

Decisão da primeira versão: basta a palavra-passe atual. Reavaliar a confirmação
da posse do novo endereço por email numa versão futura.

GET /tasks/reminders exige sessão e aceita page e pageSize. Devolve tasks,
page, pageSize e total. Inclui apenas cuidados da conta com reminderEnabled
ativo, pendentes e previstos para hoje ou depois no calendário de Lisboa.
Quando a preferência geral de lembretes está desligada, a lista vem vazia.
O cliente pode usar esta consulta como entrada para o agendamento local.

GET /notifications exige sessão e devolve dueToday, overdue e recent com até
20 itens por grupo. Os dois primeiros usam cuidados pendentes e a data de Lisboa.
recent junta conclusões e objetos adicionados, ordenados por occurredAt desc.
Cada item inclui type, id e objectId, e itens de cuidado incluem taskId e dueOn.
A lista é calculada na leitura a partir de tasks e objects. As preferências de
lembrete continuam a ser usadas pela rota de agendamento GET /tasks/reminders.

O comando npm.cmd run seed:demo prepara contas, categorias, objetos, cuidados
e dicas de demonstração. Reutiliza os registos encontrados pelo dono, nome e
categoria ou objeto correspondente, preservando os IDs dos objetos. Na primeira
execução cria exemplos para hoje, em atraso, futuros, recorrentes e concluídos.
As datas dos exemplos já existentes seguem o percurso normal dos cuidados.

Para usar uma pasta persistente fora do código, define PHOTO_DIRECTORY no .env
com um caminho absoluto, por exemplo C:/KeepWell/dados/fotografias. Sem esta
variável, a API usa api/storage/object-photos/. Ao mudar de pasta, copia os
ficheiros existentes mantendo os nomes antes de reiniciar a API. As referências
guardadas no MongoDB continuam a usar as mesmas chaves. Usa uma pasta privada
com permissão de leitura e escrita para o processo da API.

GET /health/storage exige uma sessão de administrador. A API escreve, lê e
remove um ficheiro temporário na pasta de fotografias. Devolve 200 com storage
available quando o teste passa, ou 503 com storage unavailable se falhar.
A resposta não expõe o caminho da pasta.

HOST no .env permite escolher onde a API escuta. 127.0.0.1 limita ao PC.
0.0.0.0 permite escutar nas interfaces IPv4. Num telemóvel na mesma rede,
usa o IP local do PC com a porta configurada, por exemplo
http://192.168.1.10:3000. Se HOST for omitido, o Node usa a escuta padrão.
O endereço de escuta e a porta aparecem no terminal ao arrancar.

Na pasta api, npm.cmd run test:backend executa os testes locais e as seis
suites de integração existentes, incluindo categorias e dicas na mesma suite.
Mostra um resumo no fim e termina com código diferente de zero se alguma falhar.
As integrações usam o Atlas configurado no .env e removem os seus dados de teste.
O seed de demonstração é executado separadamente.

npm.cmd run check:photos compara as chaves de fotografia no MongoDB com os
ficheiros na pasta configurada. Lista referências sem ficheiro e ficheiros
gerados pela API sem referência. O comando é apenas de leitura e termina com
código 1 se encontrar diferenças. Executa-o sem uploads ou eliminações em curso
para evitar diferenças transitórias.

GET /tasks, GET /tasks/:id, GET /tasks/reminders e GET /objects/:id/history
incluem objectName em cada cuidado. O nome é obtido do objeto atual, sem o
duplicar no documento da tarefa. Se a referência não puder ser resolvida na
conta autenticada, a listagem e o detalhe devolvem objectName: null.
