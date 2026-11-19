# KeepWell API

API REST em Node.js 24, Express e driver oficial MongoDB. Os objetos, cuidados e
dicas pertencem a uma casa. Cada utilizador tem uma casa e um papel owner,
manager ou member. As regras do produto estão em [casas.md](../docs/casas.md).

## Arranque local

Instala as dependências na pasta api e copia .env.example para .env.
Preenche MONGODB_URI e MONGODB_DB localmente. Para uma base nova, prepara
as coleções e os índices antes de iniciar o servidor.

```powershell
npm.cmd install
npm.cmd run db:setup
npm.cmd run seed:demo
npm.cmd run dev
```

O servidor usa a porta 3000 por defeito. HOST permite escolher o endereço
de escuta. A app Android no emulador usa http://10.0.2.2:3000. O Chrome usa
http://localhost:3000, com a app em http://localhost:8080. O CORS permite
essa origem local, os métodos das rotas e os cabeçalhos Authorization e
Content-Type.

```powershell
cd ..\app
flutter run -d chrome --web-hostname localhost --web-port 8080
```

O .env fica fora do Git. PHOTO_DIRECTORY é opcional e aceita um caminho
absoluto para uma pasta privada e persistente. O caminho por defeito é
api/storage/object-photos, independente da pasta usada pelo terminal.

## Contas e sessão

| Método e rota | Pedido ou resultado |
|---|---|
| POST /auth/register | name, email, password. Devolve 201 com user e cria a casa na mesma transação. |
| POST /auth/login | email, password. Devolve token, tokenType, expiresAt e user. |
| GET /auth/me | Devolve user, incluindo houseId e houseRole. |
| PATCH /auth/me | Altera name. |
| PATCH /auth/me/email | Altera email com a password atual. |
| PATCH /auth/me/preferences | Aceita theme e/ou remindersEnabled. |
| POST /auth/logout | Revoga a sessão atual e devolve 204. |

A palavra-passe exige 6 a 20 caracteres e ausência de espaços. O registo usa
scrypt com salt aleatório. O email é normalizado e tem um índice único.
As sessões duram 24 horas e guardam o hash do token. O cliente envia
Authorization Bearer TOKEN. A API consulta o utilizador atual em cada pedido,
por isso uma alteração de casa ou de papel aplica-se à sessão existente.

theme aceita system, light ou dark. remindersEnabled é booleano. O novo
email é validado com a palavra-passe atual. A confirmação de posse do email
fica pendente de uma decisão futura.

## Casa e membros

| Método e rota | Permissão e comportamento |
|---|---|
| GET /house | Todos consultam a casa, o papel e os membros. |
| PATCH /house | Dono e gestor alteram o nome com { "name": "Casa da família" }. |
| POST /house/invite | Dono e gestor recebem code e expiresAt. |
| POST /house/join | Recebe { "code": "ABCDEFGH" } e devolve a nova casa. |
| POST /house/leave | Gestor ou membro sai e recebe uma casa nova como dono. |
| PATCH /house/members/:userId | Dono envia { "role": "manager" } ou { "role": "member" }. |
| DELETE /house/members/:userId | Dono remove a pessoa, que recebe uma casa nova. Devolve 204. |

GET /house devolve house com id e name, role e members com id, name, email
e role. O campo invite, com code e expiresAt, é devolvido ao dono e gestor.

O código tem oito caracteres e validade de sete dias. O alfabeto exclui
0/O e 1/I. Um novo código substitui o anterior. O mesmo convite pode ser
usado por várias pessoas. O código recebido é normalizado para maiúsculas.
Há um limite de 20 tentativas de gerar ou usar convites por pessoa em 15 minutos.

A entrada exige uma casa atual com uma única pessoa, sem objetos nem dicas.
Caso contrário, a API responde 409. A casa vazia é apagada na mesma transação
que muda a pessoa para membro da casa de destino. O dono só pode entrar
noutra casa quando a sua casa cumpre a regra de estar vazia. A saída e a
remoção nunca transferem os objetos ou os cuidados da casa antiga.

O dono pode alterar ou remover gestores e membros. A mudança do papel de
dono e a saída do dono devolvem 403. As escritas revalidam a pertença e o
papel dentro da transação e atualizam um contador interno na casa para
coordenar alterações simultâneas de membros e dados.

## Objetos e fotografias

| Método e rota | Permissão |
|---|---|
| POST /objects | Todos na casa. name e categoryId obrigatórios, acquiredOn e description opcionais. |
| GET /objects | Todos. page, pageSize, search e categoryId. |
| GET /objects/:id | Todos. |
| PATCH /objects/:id | Dono e gestor. name, categoryId, acquiredOn e description. |
| DELETE /objects/:id | Dono e gestor. 409 se houver cuidados associados. |
| PUT /objects/:id/photo | Dono e gestor. Membro pode enviar a primeira foto de um objeto que criou. |
| GET /objects/:id/photo | Todos na casa. |
| DELETE /objects/:id/photo | Dono e gestor. |
| GET /objects/:id/history | Todos na casa. page e pageSize. |

Os objetos guardam houseId e createdBy. O cliente não escolhe a casa nem
o autor. description é opcional até 1000 caracteres. acquiredOn usa
AAAA-MM-DD ou null. A pesquisa é literal, ignora maiúsculas e distingue
acentos. A listagem e o detalhe incluem nextCare, com o próximo cuidado,
ou null. A paginação usa page 1 e pageSize 20, com máximo 100.

O upload recebe um ficheiro no campo photo em multipart/form-data.
Aceita JPEG, PNG e WebP estáticos até 5 MiB e 25 megapíxeis. O sharp valida
o conteúdo, corrige a orientação, limita a imagem a 1600 × 1600 e remove
metadados. O ficheiro é guardado como JPEG com um nome UUID privado.
A resposta pública inclui photoUrl ou null. A leitura exige Bearer e
usa Cache-Control no-store. No Flutter Web, o ficheiro escolhido é enviado
pelos seus bytes. O backend valida o conteúdo real.

O histórico mantém tasks, page, pageSize e total, onde total conta apenas
cuidados concluídos. events traz care_completed com occurredAt e task.
A última página inclui object_added com a data de criação do objeto.
Um objeto sem cuidados tem esse evento na primeira página.

## Cuidados

| Método e rota | Permissão e resultado |
|---|---|
| POST /tasks | Dono e gestor criam o cuidado. |
| GET /tasks | Todos na casa consultam a lista. |
| GET /tasks/:id | Todos na casa consultam o detalhe. |
| PATCH /tasks/:id | Dono e gestor editam um cuidado pendente. |
| DELETE /tasks/:id | Dono e gestor eliminam um cuidado pendente. |
| POST /tasks/:id/complete | Dono e gestor concluem o cuidado com notes opcional. |
| GET /tasks/reminders | Todos consultam os lembretes da casa, respeitando a preferência individual. |

POST /tasks recebe objectId, title, dueOn e, opcionalmente, description,
repeatEveryDays e reminderEnabled. A edição aceita os mesmos campos
editáveis, com o objeto fixo. description é texto opcional até 1000 caracteres.
notes é a observação da conclusão, também até 1000 caracteres. title tem
2 a 120 caracteres e dueOn usa AAAA-MM-DD.

A listagem aceita objectId, status, dueFrom, dueTo, page e pageSize.
status aceita pending, overdue e completed. pending seleciona hoje e
dias futuros, e overdue seleciona os pendentes anteriores a hoje.
O calendário usa Europe/Lisbon. A listagem e o detalhe incluem objectName.

repeatEveryDays aceita null ou um inteiro de 1 a 365. Ao concluir um cuidado
recorrente, a API cria a próxima ocorrência na mesma transação, a partir
da data da conclusão em Lisboa. A descrição e o lembrete passam para
a próxima ocorrência. As observações começam vazias. Repetir a conclusão
devolve a conclusão existente e gera uma única próxima ocorrência.

reminderEnabled é booleano e começa como false. GET /tasks/reminders exige
também preferences.remindersEnabled true para a pessoa autenticada.
Inclui apenas pendentes de hoje em diante. O plano da app deixa lembretes
e repetição fora da prioridade atual.

## Categorias e dicas

As categorias são fixas e preparadas pelo seed. As rotas de escrita
de categorias foram retiradas.

| Método e rota | Permissão |
|---|---|
| GET /categories | Todos autenticados. Aceita search. |
| GET /categories/icons | Todos autenticados. Catálogo de ícones. |
| GET /categories/:id | Todos autenticados. |
| GET /tips | Todos na casa. Aceita categoryId, search, page e pageSize. |
| GET /tips/:id | Todos na casa. |
| POST /tips | Dono e gestor enviam title, text e categoryId. |
| PATCH /tips/:id | Dono e gestor alteram title, text e/ou categoryId. |
| DELETE /tips/:id | Dono e gestor eliminam a dica. |

title tem 2 a 120 caracteres e text tem 1 a 3000. As dicas são isoladas por
houseId. A pesquisa procura no título e o filtro usa a categoria do catálogo.

## Análise de fotografias

POST /objects/photo-analysis exige sessão e casa, recebe o mesmo campo photo
do upload e devolve object com name e categoryId, e suggestedTasks com
até quatro pares title e description. O nome tem a primeira letra maiúscula.
Uma informação incerta pode vir como null e as sugestões podem vir vazias.

O backend envia a imagem normalizada e o catálogo de categorias ao Gemini.
Confirma a categoria e valida a resposta antes de a devolver. O formulário
deve informar a pessoa de que a fotografia será processada pelo Google,
preservar as alterações manuais e ignorar respostas de fotografias já trocadas.

A análise devolve sugestões para confirmação. A criação do objeto e dos
cuidados é feita pelas respetivas rotas depois da escolha do utilizador.
Configura no .env local e reinicia a API.

```dotenv
GEMINI_API_KEY="a_tua_chave"
GEMINI_MODEL=gemini-3.1-flash-lite
```

O limite é 10 análises por pessoa em 15 minutos. A chamada tem um tempo
máximo de 15 segundos. Uma falha de análise deve permitir continuar
a preencher o formulário manualmente.

## Notificações e saúde

GET /notifications devolve dueToday, overdue e recent apenas com dados da
casa. recent inclui conclusões e objetos adicionados. Cada grupo tem até
20 entradas. A resposta é calculada a pedido.

GET /health confirma o servidor e GET /health/database verifica o MongoDB.
GET /health/storage exige sessão de dono e testa o armazenamento de fotos.

## Erros

| Código | Situação |
|---|---|
| 400 | Pedido ou identificador inválido, convite errado ou expirado. |
| 401 | Sessão inválida ou expirada. |
| 403 | Papel sem permissão para a ação. |
| 404 | Recurso inexistente ou de outra casa. Rotas de escrita de categorias retiradas. |
| 409 | Conflito, casa ocupada, objeto com cuidados ou edição de cuidado concluído. |
| 413 | Pedido ou ficheiro demasiado grande. |
| 415 | Tipo de conteúdo ou imagem inválidos. |
| 429 | Limite de pedidos atingido. |
| 502 | Chamada ou resposta do Gemini falhou. |
| 503 | Configuração do Gemini em falta ou conta à espera de migração. |
| 504 | Tempo limite do Gemini. |

As respostas de erro usam o campo error. Os detalhes internos e os segredos
ficam fora da resposta ao cliente. Para recursos existentes da própria casa,
a tentativa de escrita de um membro pode devolver 403 antes de validar o corpo.

## Migração da base existente

A execução na base partilhada deve ser combinada com a equipa. Com a API
parada, guarda uma cópia de segurança e confirma no .env qual é a base alvo.

```powershell
npm.cmd run db:setup
npm.cmd run migrate:house-memberships
npm.cmd run migrate:house-memberships -- --apply
npm.cmd run migrate:house-data
npm.cmd run migrate:house-data -- --apply
npm.cmd run dev
```

Os comandos sem --apply só consultam contagens. A primeira migração cria
a casa de cada conta antiga. A segunda associa objetos, cuidados e dicas,
preserva os IDs, fotografias e datas e remove os campos antigos role e userId.
As dicas globais passam para a casa da Ana. As contas de demonstração Bruno
e gestor ficam nessa casa com os papéis member e manager. A conta antiga
admin@keepwell.test passa a gestor@keepwell.test. Se já existirem as duas
contas, o script pede a resolução dessa duplicação.

Os scripts podem ser repetidos depois de uma interrupção. Há transações por
conta para os objetos e cuidados, e por pessoa na junção da demonstração.
Uma execução parcial exige repetir a migração completa antes de arrancar
a API. Os validadores aceitam os campos antigos durante esta transição.
Uma conta sem casa recebe 503 nas rotas que dependem da casa.

seed:demo cria dados apenas quando faltam e preserva a palavra-passe de uma
conta existente. Para contas novas, a palavra-passe de demonstração é demo1234.
Pode ser repetido para completar os exemplos.

## Testes

```powershell
npm.cmd test
npm.cmd run test:houses
npm.cmd run test:migration
npm.cmd run test:backend
```

test:houses e test:migration criam bases aleatórias e descartáveis no Atlas,
usando apenas a ligação configurada no ambiente. Os testes apagam as bases
temporárias no fim. test:houses também usa uma pasta temporária de imagens.

O teste de casas verifica papéis, convite expirado, renovação, isolamento
entre casas, fotos, cuidados, histórico, dicas, notificações e concorrência.
O teste de migração verifica os IDs e observações existentes, os papéis de
demonstração e a repetição de migração e seed sem duplicados. test:backend
agrupa os testes locais e estes dois testes isolados.

As verificações test:integration, test:auth, test:objects, test:photos e
test:tasks continuam disponíveis para uma base de desenvolvimento preparada.

## PowerShell e acentos

Ao enviar JSON com acentos no Windows PowerShell, usa bytes UTF-8.

```powershell
$json = @{ title = "Verificar a pressão dos pneus" } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
# Envia $bytes em -Body com Content-Type application/json; charset=utf-8.
```

Para respostas do curl.exe, grava o corpo num ficheiro temporário e lê-o com
Get-Content -Raw -Encoding UTF8 antes de executar ConvertFrom-Json. Este
procedimento evita a corrupção de acentos já observada nos testes.

O histórico de problemas e validações está no [diário técnico](../docs/diario-tecnico.md).
