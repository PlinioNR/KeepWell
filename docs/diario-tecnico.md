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
- **Próximo passo.** Executar num dispositivo Android. Se a falha da pasta de build também ocorrer nesse destino, parar a execução do Flutter, limpar a build e repetir.
- **Validação.** A abertura da aplicação ainda está por confirmar.

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
