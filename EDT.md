# KeepWell — EDT (rascunho de trabalho)

Estado: níveis 1 e 2 validados pelo Plinio (02/11/2026). Nível 3 dos ramos 1–3 proposto, por validar. Ramos 4–7 ainda sem nível 3.
Legenda: ✅ concluído (confirmado pelo Plinio) · ◐ iniciado · sem marca = planeado.

## 1. Gestão do projeto
- 1.1 Termo de Abertura ✅ (submissão por confirmar)
- 1.2 EDT
  - 1.2.1 Estrutura da EDT (diagrama em árvore)
  - 1.2.2 Dicionário da EDT (se exigido pelo enunciado)
- 1.3 Cronograma
  - 1.3.1 Lista de atividades e dependências
  - 1.3.2 Disponibilidade da equipa
  - 1.3.3 Estimativas de duração
  - 1.3.4 Diagrama de Gantt
- 1.4 Planeamento editável
  - 1.4.1 Ficheiro ProjectLibre/MS Project
  - 1.4.2 Linha de base
- 1.5 Acompanhamento e controlo
  - 1.5.1 Atas de reuniões da equipa
  - 1.5.2 Registo de riscos atualizado
  - 1.5.3 Atualização do progresso no planeamento

## 2. Análise e requisitos
- 2.1 Requisitos
  - 2.1.1 Requisitos funcionais
  - 2.1.2 Requisitos não funcionais
  - 2.1.3 Critérios de verificação
- 2.2 Regras de negócio
  - 2.2.1 Regras de eliminação
  - 2.2.2 Regras do histórico
  - 2.2.3 Lista inicial de categorias
  - 2.2.4 Criação da conta de administrador
- 2.3 Diagramas UML (tipos exigidos por confirmar)
  - 2.3.1 Diagrama de casos de uso
  - 2.3.2 Diagrama de classes / modelo de dados
- 2.4 Decisões técnicas
  - 2.4.1 Escolha de backend e BD
  - 2.4.2 Armazenamento das fotografias
  - 2.4.3 Ambiente de execução da API (testes e demo)

## 3. Design e usabilidade
- 3.1 Card sorting
  - 3.1.1 Preparação (cartões e participantes)
  - 3.1.2 Sessões
  - 3.1.3 Análise de resultados
- 3.2 Arquitetura de informação e navegação
  - 3.2.1 Mapa de navegação
  - 3.2.2 Fluxos principais
- 3.3 Sistema de design ◐
  - 3.3.1 Revisão dos componentes existentes ◐ (páginas Icon, Button, Forms, List, Navigation, Cards, Feedback existem; ajustes por confirmar)
  - 3.3.2 Componentes específicos do KeepWell ◐ (Object Card, Category Chip, Timeline Item, Care Item, Status Badge, Tip Card, Photo Upload, Date Field já usados nos ecrãs)
  - 3.3.3 Fichas de especificação por componente (Ficha 3) e teste do conteúdo hostil (Ficha 4)
  - 3.3.4 Modo escuro por variáveis e contraste verificado nos dois modos (Ficha 5)
  - 3.3.5 Publicação da biblioteca
- 3.4 Protótipo interativo
  - 3.4.1 Ecrãs do utilizador comum ◐ (14 ecrãs em 4 secções, verificado 02/11; ver desalinhamentos com o âmbito)
  - 3.4.2 Ecrãs do administrador ◐ (5 ecrãs, verificado 02/11)
  - 3.4.3 Ecrãs em falta (consultar dicas, editar objeto, estados vazio/erro — por confirmar)
  - 3.4.4 Ligações, transições e overlays (checklist da Ficha 5: 2 fluxos condicionais, ≥1 overlay, 150–300 ms)
  - 3.4.5 Handoff e revisão cruzada (Ficha 6)

Decisão final (Plinio, 02/11): manter os ecrãs, exceto 04 Recover Access (vai para o Archive; o botão "Recuperar acesso" sai do 02 Sign In). Entram no âmbito: repetição de tarefas, lembretes/notificações e modo escuro (também na app Flutter). Alteração no Figma: por fazer.

Desalinhamentos encontrados nos ecrãs (02/11):
- 04 Recover Access: recuperação de palavra-passe não está no âmbito (exige envio de email no backend).
- 11 Add Care / 12 Care Detail: campo "Repeat" (repetição automática está fora do âmbito).
- 11 Add Care, 13 Notifications, 14 Settings: lembretes/notificações estão fora do âmbito.
- Card sorting e AI deviam vir antes dos ecrãs (requisito de UX): ainda não feitos.
- 3.5 Avaliação heurística e correções
  - 3.5.1 Relatório de avaliação (4 problemas, regra, gravidade)
  - 3.5.2 Três correções aplicadas
- 3.6 Testes com utilizadores
  - 3.6.1 Guião e tarefas
  - 3.6.2 Recrutamento de 3 participantes
  - 3.6.3 Sessões em telemóvel
  - 3.6.4 Registo e análise de resultados

## 4. Backend e base de dados
- 4.1 Base de dados
- 4.2 Autenticação e permissões
- 4.3 Endpoints da API
- 4.4 Armazenamento de fotografias
- 4.5 Documentação da API

## 5. Aplicação Flutter
- 5.1 Projeto base e ligação à API
- 5.2 Conta
- 5.3 Objetos e câmara
- 5.4 Tarefas e histórico
- 5.5 Dicas
- 5.6 Administração
- 5.7 Acabamentos (estados, animações, Stateful/Stateless)

## 6. Integração e testes
- 6.1 Testes Flutter/API
- 6.2 Testes de permissões e erros
- 6.3 Testes em Android real
- 6.4 Correções

## 7. Entrega e apresentação
- 7.1 Apresentação intermédia
- 7.2 Documentação final atualizada
- 7.3 Relatório GP
- 7.4 Apresentação final e demo
- 7.5 Pacote de submissão (zip)
