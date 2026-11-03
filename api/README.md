# KeepWell API

Servidor Node.js com Express e código de ligação ao MongoDB Atlas. A ligação real depende das credenciais no .env. Ainda sem autenticação ou rotas de dados.

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
O algoritmo e a validação da palavra-passe serão implementados na autenticação.
O perfil de criação normal é sempre user. Ainda não existe criação de administrador.

Executa `npm.cmd run db:setup` para criar a coleção e o índice único. O comando pode
ser repetido; não apaga dados. Ao atualizar uma coleção existente, não corrige documentos
antigos, e o índice pode falhar se já existirem emails repetidos. Consulta os dados
antes de aplicar a bases já preenchidas. Esta etapa parte de uma coleção nova.

Executa `npm.cmd test` para verificar normalização, validação, proteção do perfil
e exclusão dos dados internos nas respostas. Ainda não há rotas de registo ou login.
