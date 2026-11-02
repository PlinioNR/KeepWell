# KeepWell — contexto do projeto

Projeto Interdisciplinar, CTeSP Design e Tecnologias para Aplicações Móveis, ESMAD, 2026/2027.
Grupo G1: Plinio Rodrigues (40250311), Rafael Pereira (40250312). Ambos iniciantes em Flutter e backend; sem responsabilidades fixas por área.
Disciplinas: Gestão de Projetos (GP), Usabilidade e UX, Prototipagem em Apl. Móveis, Sensores e Serviços Web, Desenvolvimento em Apl. Móveis II.

## Como trabalhar
- Português de Portugal, comunicação próxima e direta.
- Explicar primeiro de forma simples; aprofundar quando necessário.
- Tarefas pequenas, instruções claras; não avançar várias etapas de implementação de uma vez.
- Âmbito viável para dois iniciantes. Não acrescentar funcionalidades sem explicar necessidade e custo.
- Separar sempre: requisitos obrigatórios / decisões propostas / melhorias opcionais.
- No código: indicar ficheiro, local, razão e como verificar.
- Nunca assumir que algo foi implementado, aprovado ou entregue só porque foi planeado. Distinguir concluído de planeado.

## Conceito
App para registar objetos pessoais e gerir a sua manutenção (foco principal); dicas de conservação como apoio.
Percurso exemplo: registar bicicleta → tarefa "Lubrificar a corrente" → data prevista → concluir → ver no histórico.
Nomes antigos: "Cuida e Dura", "Cuida+".
ODS 12: meta 12.5 (principal, prevenção de resíduos), 12.2 (complementar). Impactos são potenciais, sem medições.

## Funcionalidades v1
- Conta: registo, login, logout.
- Objetos: CRUD, 1 foto pela câmara, categoria, pesquisa por nome, filtro por categoria.
- Tarefas: CRUD, associada a objeto, data prevista, concluir (guarda data de realização), histórico do objeto.
- Dicas: consulta por categoria.
- Admin: CRUD de categorias e dicas.
- Simplificações: 1 foto/objeto; sem repetição automática; tarefas concluídas = histórico (modelação técnica por definir).
- Perfis: utilizador comum (só os seus dados) e administrador (categorias e dicas). Permissões verificadas na API. Registo público cria só utilizadores comuns; criação do admin por definir.
- Decisão 02/11: entram no âmbito (porque estão nos ecrãs do Figma) repetição de tarefas, lembretes/notificações e modo escuro na app.
- Fora do âmbito: recuperar acesso (ecrã 04 vai para o Archive), várias fotos, cálculo de impacto ambiental.
- Preferência do Plinio: quanto mais simples, melhor. Propor sempre a versão mais simples que cumpra os requisitos.
- Foco atual (02/11): iniciar o desenvolvimento da app.

## Estrutura do repositório
- `app/` — app Flutter (pacote `keepwell`, org `pt.esmad`, só Android).
  - `lib/theme/`: `app_colors.dart`, `app_spacing.dart` (espaços e raios), `app_theme.dart` (claro/escuro, fonte Nunito Sans via google_fonts). Valores tirados das variáveis do Figma em 02/11.
  - Modo escuro: cores propostas no código; ainda não existem variáveis de modo escuro no Figma.
  - `main.dart` mostra um ecrã temporário `ThemePreviewScreen`.
- `api/` — backend (ainda não criado; tecnologia por escolher).
- Git no ramo `main`; remoto `origin` = https://github.com/PlinioNR/KeepWell (enviado a 02/11).

## Requisitos técnicos confirmados
Flutter obrigatório; demo em Android; API REST própria via HTTP; BD modelada; documentação da API; ≥2 tipos de utilizador; CRUD de entidades; câmara (confirmada pelo docente como sensor); funcionalidade nativa; animações; layout cuidado; uso adequado de Stateful/Stateless.
Backend/BD por escolher (nas aulas: Node.js, Express, MongoDB — não assumir como escolha fechada).
Nada de Flutter/API/BD implementado até à data deste ficheiro.

## Requisitos UX / Prototipagem
- Card sorting (agrupamento, nomes de menus, mapa de navegação); arquitetura de informação antes dos ecrãs.
- Avaliação heurística: 4 problemas com regra violada e gravidade; 3 correções aplicadas.
- 3 testes com utilizadores no Figma em telemóvel, tarefas reais, sem ajuda, registo de dificuldades.
- Protótipo interativo média/alta fidelidade; sistema de design publicado (fundações, componentes com estados, documentação quando usar/não usar; um colega deve conseguir montar um ecrã).

## Estado (relatado, não verificado no Figma)
Figma: https://www.figma.com/design/PYQKV2OlgnlrZcCt5HCspK
Feito (segundo o chat "PAM"): fundações (cor, tipografia, espaçamento), botões Primary/Secondary/Ghost/Danger com estados, Text Field, Textarea, Select, Checkbox, Radio, Switch, List Item, 20 ícones Lucide, Navigation Bar, Icon Button, Tab Bar, Card, exemplos, ecrã Settings (exercício).
Cores: azul #001D4A, creme #F4F1BB, coral #ED6A5A + Danger/Success/Info.
Regras: espaçamentos 4/8/16/24/32/48; raios 4/8/16/999; variáveis; Auto Layout; ícones 24×24 traço 2; Nav Bar 390×56 com toque 48×48; ecrã 390×844.
Preferências: Tab Bar ativo azul-marinho, inativos cinza azulado, sem fundo/traço; documentação reunida à parte (não sob cada componente); área de texto do Card branca (neutral/white).
Pendente: ajustes a botões e campos após tutorial (não confirmados).
Atualização 02/11 (verificado no Figma): páginas Cover, Foundations, Components (Icon, Button, Forms, List, Navigation, Cards, Feedback), Screens, Archive. 19 ecrãs: Access (01 Welcome, 02 Sign In, 03 Sign Up, 04 Recover Access), Objects (05 Home, 06 Objects, 07 Add Object, 08 Object Detail, 09 Object History), Care (10 Care, 11 Add Care, 12 Care Detail, 13 Notifications), Profile (14 Settings), Admin (15 Admin, 16 Manage Categories, 17 Category Form, 18 Manage Tips, 19 Tip Form). Ligações do protótipo não verificadas. Ver EDT.md para desalinhamentos com o âmbito.

Fontes lidas: linhas orientadoras do PI2 (GP inclui requisitos e UML; pesos: GP 70%, UX 40%, Prototipagem 40%, SSW 70%, DAM II 70%) e fichas de Prototipagem (higiene do ficheiro, escala tipográfica, contraste, especificação de componente, conteúdo hostil, checklist do protótipo com modo escuro e fluxos condicionais, handoff). Enunciado de GP ainda não recebido.
Não concluído (antes da atualização acima): card sorting, AI final, protótipo, publicação/documentação da biblioteca, avaliação heurística, testes.

Gestão: proposta preenchida no Excel; Termo de Abertura concluído (segundo o Plinio); aprovação do tema e submissão do TA não confirmadas.

## Prazos GP
- 30/10/2026 23h59 Termo de Abertura
- 06/11/2026 EDT/WBS
- 14/11/2026 Cronograma
- 21/11/2026 Projeto em MS Project / ProjectLibre
- 28/11/2026 Requisitos funcionais e não funcionais
- 13/12/2026 Slides apresentação intermédia
- 10/01/2027 23h59 Entrega final; 11/01/2027 apresentação (15 min + 5 discussão)
- Limite geral do PI: 16/01/2027. Datas das outras disciplinas por confirmar.
Entrega final GP: GP-2627-EN-G1.pdf (relatório ≤20 pág, modelo da escola), GP-2627-EN-G1.mpp ou .pod (sem ele: −10%), GP-2627-EN-G1-A.pdf (slides), tudo em GP-2627-EN-G1.zip.
