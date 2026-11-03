# KeepWell API

Servidor Node.js com Express e código de ligação ao MongoDB Atlas. A ligação real depende das credenciais no .env. Registo de conta implementado; login e rotas de objetos/tarefas ainda pendentes.

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
e exclusão dos dados internos nas respostas. O modelo foi implementado antes das rotas; o registo está agora documentado na secção seguinte e o login continua pendente.

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
O hash e a palavra-passe nunca aparecem na resposta. Ainda não há login ou token.

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


