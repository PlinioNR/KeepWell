# Diário técnico do KeepWell

Registo para apoiar o relatório e a apresentação. Acrescentar uma entrada quando
for encontrado um problema relevante ou quando uma validação pendente tiver
resultado. Distinguir o que foi observado daquilo que é apenas uma hipótese.
Guardar comandos e caminhos úteis sem incluir palavras-passe, tokens ou chaves.

## Problemas e soluções

### 1. A API perdeu acesso ao MongoDB Atlas após mudar de rede

- **Problema.** A API deixou de conseguir ligar ao Atlas quando o computador passou a usar a Internet partilhada pelo telemóvel.
- **Diagnóstico.** A troca de rede mudou o IP público. O acesso ao Atlas dependia da lista de IPs autorizados.
- **Solução.** Atualizar a lista de acesso no Atlas para a rede usada no teste. O código da API não precisou de mudar.
- **Validação.** O utilizador confirmou que voltou a ligar a API à base de dados.
- **Referência.** [Ligação ao Atlas](../api/README.md#ligação-ao-mongodb-atlas-edt-412).

### 2. O login falhava porque a conta de teste não existia

- **Problema.** O login devolvia “Email ou palavra-passe incorreta”. Um token anterior também devolvia sessão inválida.
- **Diagnóstico.** Uma consulta direta por email em `keepwell.users` encontrou zero documentos. A mensagem do login, por si só, não distinguia uma conta ausente de uma palavra-passe errada.
- **Solução.** Registar a conta novamente e verificar o código HTTP e o ID devolvido pelo servidor. Uma conta normal era suficiente para testar a análise de fotografias.
- **Validação.** A consulta por ID e email encontrou o novo registo no Atlas. O teste autenticado da fotografia avançou até à rota de análise.
- **Referência.** [Serviço de registo](../api/src/services/registration.js).

### 3. O tratamento de erros escondia a falha da análise de fotografias

- **Problema.** A rota devolvia um `500` genérico, apesar de o cabeçalho de limite de pedidos indicar que o pedido tinha chegado à análise.
- **Diagnóstico.** O serviço classificava a falha do Gemini como `502` e o tempo limite como `504`. O tratamento central do Express não reconhecia esses dois códigos e devolvia `500`.
- **Solução.** Preservar os códigos `502` e `504` e as mensagens previstas pelo serviço.
- **Validação.** Os 29 testes locais passaram. Ao repetir o pedido, o utilizador recebeu a mensagem específica de falha da análise. O cenário de tempo limite ainda requer validação dedicada.
- **Referências.** [Tratamento de erros](../api/src/app.js) e [serviço de análise](../api/src/services/object-photo-analysis.js).

### 4. O modelo configurado para o Gemini devolvia 404

- **Problema.** A análise continuou a falhar depois de corrigir o tratamento HTTP.
- **Diagnóstico.** Um pedido de texto ao Gemini, sem enviar a fotografia, mostrou que o valor do modelo no ambiente terminava em ponto e vírgula. Mesmo depois de remover esse carácter, `gemini-2.5-flash` devolveu `404` no pedido de geração.
- **Solução.** Testar modelos alternativos com JSON estruturado e configurar `gemini-3.1-flash-lite`, que respondeu com sucesso.
- **Validação.** O teste de texto devolveu `200`. Depois de reiniciar a API, o utilizador confirmou a análise da fotografia no PowerShell.
- **Referência.** [Configuração de exemplo](../api/.env.example).

### 5. Os acentos ficavam alterados durante os testes em PowerShell

- **Problema.** Apareceram caracteres trocados em nomes e títulos, incluindo “Eletrónica” e sugestões com “pressão” e “travões”.
- **Diagnóstico.** No teste da análise de fotografias, ler a saída do `curl.exe` diretamente pelo PowerShell produziu texto incorreto. Repetir o pedido e ler o corpo como UTF-8 mostrou os acentos corretos antes da gravação.
- **Solução.** Guardar a resposta do `curl.exe` num ficheiro temporário e lê-lo com `Get-Content -Raw -Encoding UTF8`. Ao enviar JSON com acentos, usar bytes UTF-8 e `application/json; charset=utf-8`.
- **Validação.** O utilizador confirmou a leitura correta e o teste de criação e consulta de um novo cuidado, comparando título e descrição carácter por carácter.
- **Referência.** [PowerShell e acentos](../api/README.md#powershell-e-acentos).

## Decisões e validações do projeto

- **Histórico.** O backend devolve cuidados concluídos e o evento “Objeto adicionado” usando a data de criação existente. O contrato anterior de paginação e contagem de cuidados foi preservado.
- **Descrição e observações.** `description` é a instrução editável do cuidado. `notes` regista o que aconteceu na conclusão. A próxima ocorrência herda a descrição e começa com a nota vazia.
- **Sugestões da IA.** O backend devolve nome, categoria do catálogo e sugestões de cuidados. O utilizador decide o que guardar, a data, a repetição e o lembrete.
- **Fluxo completo confirmado no PowerShell.** Analisar fotografia, criar objeto, aceitar e editar uma sugestão, concluir o cuidado com observação, consultar histórico e próxima ocorrência e confirmar que o cuidado concluído saiu dos lembretes.

## Verificações pendentes

- Validar foto inválida, indisponibilidade e tempo limite do Gemini. Em cada cenário, confirmar que a criação manual do objeto e dos cuidados continua disponível.
- Validar a integração com os ecrãs Flutter com o Plinio.

### 6. A aplicação Flutter não abriu no Chrome

- **Problema.** O comando `flutter run -d chrome` avisou que o projeto não estava configurado para Web e reportou uma falha ao apagar `app/build/flutter_assets`.
- **Diagnóstico.** O projeto tinha a pasta `app/android` e não tinha a pasta `app/web`. A causa da falha ao apagar a pasta de build ainda não foi confirmada.
- **Solução.** Adicionar suporte Web, usar localhost para aceder à API no Chrome e permitir a origem local do Flutter. A seleção e o envio de fotografias passaram a usar os bytes da imagem.
- **Validação.** A compilação Web passou e a API respondeu ao pedido CORS da origem http://localhost:8080. O utilizador confirmou que a app abriu no Chrome e mostrou os cuidados da conta. O envio de uma fotografia no navegador ainda está por testar.

### 7. O aapt falhou ao ler o APK no caminho original

- **Problema.** O Flutter reconheceu o emulador Android, mas o aapt reportou `Illegal byte sequence` ao abrir o APK no caminho que inclui `Área de Trabalho`.
- **Diagnóstico.** O aapt falhou no caminho original e conseguiu ler o manifesto de uma cópia do mesmo APK num caminho temporário sem acentos.
- **Próximo passo.** Correr o Flutter a partir de um caminho sem acentos e confirmar se a aplicação abre no emulador.

### 8. O Gradle não conseguiu limpar os recursos na unidade K:

- **Problema.** A tarefa `:app:cleanMergeDebugAssets` falhou ao apagar recursos gerados. A unidade K: ainda apontava para o projeto dentro do OneDrive.
- **Diagnóstico.** O Gradle indicou que algum processo poderia ter ficheiros abertos. O processo responsável não foi identificado.
- **Solução testada.** Copiar a aplicação para uma pasta local fora do OneDrive e gerar a build sem reutilizar `build`, `.dart_tool` nem `.gradle`.
- **Validação.** O Flutter compilou e instalou o APK no emulador, e o motor Flutter iniciou.

### 9. A falha de limpeza repetiu-se após mover para C:\dev

- **Problema.** O Gradle voltou a falhar em `:app:cleanMergeDebugAssets` no caminho local.
- **Solução.** Parar o daemon do Gradle, renomear a pasta gerada `app/build` para a preservar temporariamente e recompilar. A limpeza de `.dart_tool` ainda deu um aviso, mas a resolução de dependências prosseguiu.
- **Validação.** A build em C:\dev gerou o APK, instalou-o no emulador e iniciou o Flutter. O processo que bloqueou a limpeza inicial ainda não foi identificado.

### Login com a API local parada

- **Problema.** A app no emulador mostrou um erro de servidor ao tentar iniciar sessão.
- **Diagnóstico.** O Flutter apontava para `10.0.2.2:3000`, mas o computador recusava ligações à porta 3000.
- **Solução.** Iniciar a API com `npm run dev` na pasta `api`.
- **Validação.** A API iniciou, ligou ao MongoDB Atlas e o endpoint `/health/database` respondeu com sucesso. O login na app precisa de ser repetido.

### Validação da migração após atualizar o acesso ao Atlas

- **Problema.** A ligação do computador ao Atlas rejeitava os testes das casas.
- **Solução.** Adicionar o IP público atual do computador à lista de acesso do projeto KeepWell.
- **Validação.** As consultas à base partilhada identificaram os dados pendentes. Numa base temporária, o registo e as migrações passaram. Uma segunda execução encontrou zero registos pendentes. A base de teste foi eliminada.

### A listagem de objetos devolvia 500 na transição para casas

- **Problema.** O teste de integração da listagem falhou após a mudança para o filtro por casa.
- **Diagnóstico.** A chamada que acrescenta o próximo cuidado aos objetos ainda usava a variável do filtro antigo.
- **Solução.** Consultar o próximo cuidado pelos IDs dos objetos já autorizados, mantendo o filtro de data e estado.
- **Validação.** Passaram as verificações de objetos, fotografias e cuidados numa base temporária do Atlas, incluindo acesso entre membros da mesma casa e bloqueio entre casas.

### 19/11/2026 — migração do backend para casas

- **Implementado.** Cuidados, dicas e notificações passaram a usar houseId. Foram acrescentadas as rotas /house para consulta, nome, convites, entrada, saída e gestão de membros. As rotas de escrita de categorias e a promoção global a administrador foram retiradas.
- **Decisão técnica.** Cada escrita revalida a pertença e o papel dentro de uma transação. O contador interno referenceVersion da casa coordena essas escritas com a entrada, saída e remoção de pessoas. Se uma entrada competir com uma criação de objeto, a API repete a transação ou recusa a operação cujo contexto já mudou.
- **Validação.** O teste isolado cobriu os três papéis, convites errados, expirados e renovados, isolamento entre casas, fotos, histórico, cuidados recorrentes, notificações, dicas e concorrência. A migração e o seed foram repetidos sem duplicados. A regressão de registo, autenticação, objetos, fotos e cuidados passou numa base descartável.
- **Estado.** A base partilhada continua por migrar. A app precisa de ligar os ecrãs de casa e adaptar os botões aos papéis.

### A primeira versão do teste concorrente exigia que os dois pedidos fossem aceites

- **Problema.** O teste enviava a criação de um objeto ao mesmo tempo que a entrada noutra casa e esperava sempre 201 na criação. Recebeu 403 quando a entrada ganhou a corrida.
- **Diagnóstico.** A mudança de casa invalidou o contexto usado pelo pedido de criação. A revalidação transacional recusou esse pedido, como previsto.
- **Solução.** O teste passou a aceitar as duas ordens possíveis e a verificar que nenhum objeto aponta para uma casa apagada.
- **Validação.** A integração passou com a verificação de integridade dos objetos.

### Atualizar os testes antigos ao retirar userId e admin

- **Problema.** As verificações antigas usavam userId para procurar e limpar dados e chamavam as rotas de gestão global de categorias.
- **Solução.** Adaptar as verificações de objetos, fotos e cuidados a houseId e aos papéis da casa. O teste antigo de administração de categorias foi substituído pela verificação de categorias só de leitura no teste de casas.
- **Validação.** As verificações de regressão passaram numa base temporária. O comando test:backend executa testes locais, regras de casas e migração em bases isoladas.

### 19/11/2026 — regras novas após sincronização do repositório

- **Alteração de âmbito.** O membro passou a gerir todos os objetos e fotografias da casa. Cada dica passou a pertencer a um objeto e pode ter um link de vídeo ou tutorial.
- **Implementação.** As dicas usam objectId e videoUrl, com validação de HTTP/HTTPS. O objectId tem de apontar para um objeto da mesma casa. A eliminação de um objeto sem cuidados apaga as suas dicas na mesma transação. O bloqueio por cuidados associados conserva o objeto e as dicas.
- **Migração preparada.** As dicas antigas sem objeto são contadas no modo de consulta e eliminadas apenas com --apply, conforme a especificação atualizada. O seed cria novas dicas nos objetos de demonstração. Os campos antigos createdBy dos objetos e categoryId das dicas por objeto são removidos na migração. A base partilhada continua por migrar.

### A eliminação de objetos ainda recusava o membro após atualizar a rota

- **Problema.** O teste da nova regra recebeu 403 quando o membro tentou eliminar um objeto sem cuidados.
- **Diagnóstico.** A rota já permitia o pedido, mas o serviço ainda limitava a escrita transacional a owner e manager.
- **Solução.** Atualizar também a revalidação do serviço para permitir os três papéis na gestão de objetos.
- **Validação.** O teste de casas passou depois da correção, incluindo eliminar um objeto com dicas e bloquear a eliminação quando existem cuidados.

### 19/11/2026 — objeto e cuidados de uma conta eliminada

- **Problema.** A consulta anterior à migração encontrou o objeto “Portátil pessoal”, criado a 08/11/2026, com fotografia e dois cuidados. O userId aponta para uma conta que já não existe.
- **Diagnóstico.** A comparação das referências com a coleção users confirmou um objeto e dois cuidados sem utilizador existente. Os cuidados continuam ligados ao objeto.
- **Preparação.** O modo de consulta do script de migração passou a mostrar a contagem de objetos e cuidados sem utilizador. A aplicação da migração já recusa estas referências inválidas.
- **Pendente.** Confirmar com o Rafael o destino desses registos antes da migração partilhada. A fotografia, o objeto e os cuidados ainda estão guardados.

### Correção autorizada do portátil e dos dois cuidados antigos

- **Autorização.** O Rafael confirmou a associação à conta atual rafael@keepwell.test.
- **Solução.** Atualizar o userId do objeto “Portátil pessoal” e dos seus dois cuidados na mesma transação, depois de confirmar que a conta antiga já não existia.
- **Validação.** A comparação dos documentos antes e depois confirmou que apenas a referência ao utilizador mudou. O campo da fotografia, as datas e as observações foram preservados. A consulta de pré-migração encontrou zero objetos e zero cuidados sem utilizador.
- **Pendente.** Aplicar a migração para casas na base partilhada no momento combinado com a equipa.

### 19/11/2026 — migração aplicada à base partilhada

- **Autorização.** O Rafael confirmou a janela para parar a API e aplicar a migração, incluindo a eliminação das cinco dicas antigas sem objeto.
- **Cópia de segurança.** Guardado um snapshot EJSON local em C:\Users\rafae\.codex\backups\keepwell-bfb6b26d-0822-4d83-b817-202c73f3dec3\snapshot.ejson, fora do repositório. Inclui os documentos anteriores à migração.
- **Execução.** Preparação dos validadores e índices, migração das contas e migração dos dados. A demonstração ficou com Ana dona, Bruno membro e gestor gestor da mesma casa. As outras contas têm casas próprias. O seed criou quatro dicas associadas aos objetos.
- **Ajuste durante a execução.** O seed recriou um “Casaco de couro” de demonstração que já não estava na base. Foi removido apenas esse novo exemplo depois de confirmar que não tinha fotografia, cuidados nem dicas.
- **Validação dos dados.** Os dez objetos e doze cuidados anteriores mantêm os IDs, campos do utilizador, datas e fotografias referenciadas. As palavras-passe das cinco contas foram preservadas. Todas as casas têm um dono. As dicas apontam para objetos da mesma casa. A base ficou com cinco contas, três casas, dez objetos, doze cuidados, quatro dicas e oito categorias.
- **Validação HTTP.** A API foi iniciada e o health/database respondeu com sucesso. Os logins das três contas de demonstração passaram e devolveram os papéis esperados. As três contas viram os mesmos sete objetos e quatro dicas da casa. O Bruno recebeu 403 ao tentar criar um cuidado. As sessões de teste foram terminadas.
- **Próximo passo.** Integrar e validar os ecrãs da casa e os botões conforme o papel no Flutter.

### Comparar o snapshot BSON com os dados migrados

- **Problema.** A primeira comparação também incluía referenceVersion, um contador interno que muda ao criar uma dica. A comparação seguinte encontrou instâncias ObjectId de bibliotecas BSON diferentes.
- **Solução.** Comparar os valores em EJSON canónico, retirando da comparação os campos de pertença migrados e o contador técnico.
- **Validação.** A comparação confirmou os campos originais dos objetos, cuidados e categorias. A verificação dos totais detetou o exemplo adicional do seed, que foi retirado.

### O arranque falhou ao consultar o endereço de um servidor que não abriu a porta

- **Problema.** Ao executar npm run dev, server.address() devolveu null e a desestruturação causou TypeError.
- **Diagnóstico.** O Express 5 também executa o callback de listen quando ocorre um erro de abertura da porta. O código assumia que esse callback indicava sempre sucesso. Uma instância da API tinha sido deixada em execução após a migração.
- **Solução.** Mostrar o endereço apenas no evento listening. O listener de error trata a falha e fecha a ligação ao MongoDB.
- **Validação.** Um teste com uma porta temporária ocupada confirmou a mensagem de porta em uso e saída controlada com código 1, sem TypeError. A API na porta 3000 respondeu ao pedido de saúde.

### O Chrome bloqueou o login quando o Flutter escolheu uma porta aleatória

- **Problema.** A app mostrava “Não foi possível ligar ao servidor” apesar de a API e o MongoDB responderem.
- **Diagnóstico.** O Flutter estava a correr com flutter run -d chrome, sem a porta fixa 8080. O CORS só permitia a origem http://localhost:8080, pelo que o navegador bloqueava o pedido da outra porta.
- **Solução.** Permitir origens HTTP de localhost, 127.0.0.1 e [::1] nas portas locais escolhidas pelo Flutter. As origens externas continuam sem autorização CORS.
- **Validação.** Os 30 testes locais passaram, incluindo preflight de login e leitura da resposta em portas locais diferentes e rejeição de origens externas. O login no ecrã precisa de ser repetido após atualizar a página.

### O login ficou em carregamento após mudar para casas

- **Problema.** O servidor respondeu ao login, mas o botão da app continuou a carregar.
- **Diagnóstico.** O modelo User do Flutter ainda exigia o campo role, substituído na API por houseId e houseRole. A conversão do JSON lançava uma exceção de tipo. O ecrã tratava apenas ApiException e deixava o carregamento ativo.
- **Solução.** Atualizar User para houseId e houseRole, com os getters canManage e isOwner. Validar toda a resposta antes de guardar o token e o utilizador. Converter respostas inválidas em ApiException e repor o botão no finally do ecrã de login.
- **Validação.** Os oito testes do serviço de autenticação passaram. O novo caso confirma que uma resposta no formato antigo é rejeitada sem deixar uma sessão parcial. Depois de alinhar os testes de fotografia com XFile, flutter analyze terminou sem problemas e os 36 testes da app passaram. O Rafael confirmou que conseguiu iniciar sessão no Chrome depois de reiniciar a app com o código atualizado.
