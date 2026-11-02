# KeepWell — EDT

Estado: níveis 1 e 2 validados pelo Plinio (02/11/2026). Nível 3 completo proposto, por validar.
Entrega: PDF "GP-2627-E2-G1.pdf" até 06/11/2026 23h59. O enunciado pede: lista de todas as tarefas e organização lógica das tarefas (sem dicionário da EDT).
Legenda: ✅ concluído · ◐ iniciado · sem marca = planeado.

## 1. Gestão do projeto
- 1.1 Termo de Abertura ✅
- 1.2 Estrutura de Decomposição do Trabalho (EDT) ◐
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
  - 2.2.2 Regras do histórico e da repetição de tarefas
  - 2.2.3 Lista inicial de categorias
  - 2.2.4 Criação da conta de administrador
- 2.3 Diagramas UML
  - 2.3.1 Diagrama de casos de uso
  - 2.3.2 Diagrama de classes / modelo de dados
- 2.4 Decisões técnicas
  - 2.4.1 Escolha de backend e base de dados ✅ (Node.js, Express, MongoDB)
  - 2.4.2 Armazenamento das fotografias
  - 2.4.3 Ambiente de execução da API (testes e demonstração)

## 3. Design e usabilidade
- 3.1 Card sorting
  - 3.1.1 Preparação (cartões e participantes)
  - 3.1.2 Sessões
  - 3.1.3 Análise de resultados
- 3.2 Arquitetura de informação e navegação
  - 3.2.1 Mapa de navegação
  - 3.2.2 Fluxos principais
- 3.3 Sistema de design ◐
  - 3.3.1 Fundações: cor, tipografia, espaçamento e grelha ✅
  - 3.3.2 Componentes base com estados ◐
  - 3.3.3 Componentes específicos do KeepWell ◐
  - 3.3.4 Fichas de especificação e teste do conteúdo hostil
  - 3.3.5 Modo escuro por variáveis e verificação de contraste
  - 3.3.6 Publicação da biblioteca
- 3.4 Protótipo interativo
  - 3.4.1 Ecrãs do utilizador comum ◐
  - 3.4.2 Ecrãs do administrador ◐
  - 3.4.3 Ajustes ao âmbito (arquivar Recuperar acesso) e ecrãs em falta
  - 3.4.4 Ligações, transições e overlays
  - 3.4.5 Handoff e revisão cruzada
- 3.5 Avaliação heurística
  - 3.5.1 Relatório de avaliação (4 problemas, regra violada, gravidade)
  - 3.5.2 Três correções aplicadas no protótipo
- 3.6 Testes com utilizadores
  - 3.6.1 Guião e tarefas
  - 3.6.2 Recrutamento de 3 participantes
  - 3.6.3 Sessões em telemóvel
  - 3.6.4 Registo e análise de resultados

## 4. Backend e base de dados
- 4.1 Projeto base da API
  - 4.1.1 Projeto Node.js/Express e estrutura de pastas
  - 4.1.2 Ligação à base de dados MongoDB
  - 4.1.3 Dados iniciais (categorias, administrador, exemplos)
- 4.2 Modelos de dados
  - 4.2.1 Utilizador
  - 4.2.2 Categoria
  - 4.2.3 Objeto
  - 4.2.4 Tarefa de manutenção
  - 4.2.5 Dica
- 4.3 Autenticação e permissões
  - 4.3.1 Registo e início de sessão
  - 4.3.2 Proteção das rotas por perfil (utilizador/administrador)
- 4.4 Endpoints da API
  - 4.4.1 Objetos (CRUD, pesquisa e filtro)
  - 4.4.2 Tarefas (CRUD, concluir e histórico)
  - 4.4.3 Repetição de tarefas
  - 4.4.4 Categorias (CRUD do administrador)
  - 4.4.5 Dicas (consulta e CRUD do administrador)
- 4.5 Fotografias
  - 4.5.1 Envio e armazenamento
  - 4.5.2 Disponibilização das imagens à app
- 4.6 Documentação da API
  - 4.6.1 Recursos, URIs e métodos HTTP
  - 4.6.2 Exemplos de pedidos e respostas

## 5. Aplicação Flutter
- 5.1 Base da aplicação
  - 5.1.1 Projeto e tema (claro/escuro) ✅
  - 5.1.2 Navegação entre ecrãs e barra de separadores
  - 5.1.3 Serviço de ligação à API
- 5.2 Conta
  - 5.2.1 Ecrã de boas-vindas ✅
  - 5.2.2 Entrar
  - 5.2.3 Criar conta
  - 5.2.4 Terminar sessão
- 5.3 Objetos
  - 5.3.1 Início
  - 5.3.2 Lista com pesquisa e filtro por categoria
  - 5.3.3 Adicionar e editar objeto com fotografia (câmara)
  - 5.3.4 Detalhe e eliminação do objeto
  - 5.3.5 Histórico do objeto
- 5.4 Cuidados
  - 5.4.1 Lista com filtros por estado
  - 5.4.2 Adicionar e editar cuidado
  - 5.4.3 Detalhe, conclusão e eliminação
  - 5.4.4 Lembretes (notificações locais)
  - 5.4.5 Repetição de tarefas
- 5.5 Dicas
  - 5.5.1 Consulta de dicas por categoria
- 5.6 Perfil
  - 5.6.1 Definições e modo escuro
- 5.7 Administração
  - 5.7.1 Painel de administração
  - 5.7.2 Gestão de categorias
  - 5.7.3 Gestão de dicas
- 5.8 Acabamentos
  - 5.8.1 Estados de carregamento, erro e lista vazia
  - 5.8.2 Validação de formulários
  - 5.8.3 Animações
  - 5.8.4 Revisão de Stateful/Stateless

## 6. Integração e testes
- 6.1 Testes de integração app/API
  - 6.1.1 Percurso principal (objeto → tarefa → conclusão → histórico)
  - 6.1.2 Persistência dos dados
- 6.2 Testes de permissões e erros
  - 6.2.1 Acesso por perfil
  - 6.2.2 Formulários inválidos e eliminações
  - 6.2.3 Falhas de ligação
  - 6.2.4 Câmara e notificações sem permissão
- 6.3 Testes em Android real
- 6.4 Correção de erros

## 7. Entrega e apresentação
- 7.1 Apresentação intermédia
  - 7.1.1 Slides
  - 7.1.2 Ensaio
- 7.2 Documentação final
  - 7.2.1 Requisitos e UML atualizados
  - 7.2.2 Documentação da API final
  - 7.2.3 Documentação do sistema de design
- 7.3 Relatório de GP
- 7.4 Apresentação final
  - 7.4.1 Slides
  - 7.4.2 Dados e cenário de demonstração
  - 7.4.3 Ensaio
- 7.5 Submissões
  - 7.5.1 Pacote de GP (relatório, MPP/POD e slides em zip)
  - 7.5.2 Entregas das restantes disciplinas
