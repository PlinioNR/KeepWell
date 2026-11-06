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
- Código limpo, simples e fácil de entender para iniciantes: nomes claros, ficheiros pequenos, sem arquiteturas avançadas (nada de BLoC/Riverpod; `setState` e classes simples chegam). Bem documentado: comentários em português a explicar o propósito de cada classe e de cada parte menos óbvia.
- Sempre que se escreve código novo, explicar passo a passo ao Plinio (o que cada parte faz e porquê), para ele perceber e conseguir explicar o código na apresentação.
- Nunca assumir que algo foi implementado, aprovado ou entregue só porque foi planeado. Distinguir concluído de planeado.
- Commits: o Plinio faz os commits e pushes à mão. Não fazer commit nem push; no fim de cada tarefa, sugerir só o título e (se necessário) a descrição do commit.

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
  - `lib/screens/`: um ficheiro por ecrã. Feito: `welcome_screen.dart` (01 Welcome; usa a logo do Plinio em vez do ícone do Figma; ENTRAR abre o Sign In), `sign_in_screen.dart` (02 Sign In) e `sign_up_screen.dart` (03 Sign Up, com caixa dos termos via setState). Ambos StatefulWidget com Form e validação, ainda sem ligação à API; trocam entre si com `pushReplacement`.
  - `lib/utils/validators.dart`: validações partilhadas (obrigatório, email, palavra-passe nova). Regra da palavra-passe decidida a 03/11: 6–20 caracteres, sem espaços, igual na app e na API.
  - `lib/services/`: ligação à API com o pacote `http`. `api_config.dart` (endereço: `http://10.0.2.2:3000` no emulador), `api_exception.dart` (erro com mensagem em PT), `auth_service.dart` (`register` feito a 04/11; recebe `http.Client` opcional para testes com MockClient). O Criar conta já chama a API (testado de ponta a ponta no emulador a 06/11); o Entrar ainda não.
  - AndroidManifest: `usesCleartextTraffic="true"` para permitir http local (retirar se a API passar a https).
  - `lib/widgets/`: widgets partilhados. `app_text_field.dart` = componente Forms/Text Field do Figma (rótulo por cima + TextFormField).
  - Navegação simples com `Navigator.push`/`pop` (sem pacotes de rotas).
  - `assets/images/logo.png`: logo (PNG 429×390 tirado de uma captura; falta versão em maior resolução ou SVG exportada do Illustrator, original em Documents\PAM\logo 5.ai). No modo escuro é pintada de creme.
  - Ícones: pacote `lucide_icons_flutter` (mesma família Lucide do Figma).
  - Fundo dos ecrãs = branco (neutral/white), como no Figma.
- `api/` — backend do Rafael (Node.js + Express + driver oficial `mongodb`, MongoDB Atlas; `.env` com segredos fora do Git). Feito a 03/11: `/health`, `/health/database`, modelo `users` (name, email único, passwordHash scrypt, role user/admin) e `POST /auth/register` (201 com `{user}`; erros JSON com campo `error`: 400/409/413/415/429/503/500). Regra da palavra-passe na API: 6–20 caracteres, sem espaços. Login/token ainda por fazer. Documentação em `api/README.md`.
- Git no ramo `main`; remoto `origin` = https://github.com/PlinioNR/KeepWell (enviado a 02/11).

## Requisitos técnicos confirmados
Flutter obrigatório; demo em Android; API REST própria via HTTP; BD modelada; documentação da API; ≥2 tipos de utilizador; CRUD de entidades; câmara (confirmada pelo docente como sensor); funcionalidade nativa; animações; layout cuidado; uso adequado de Stateful/Stateless.
Backend decidido (02/11): Node.js + Express + MongoDB (o que é dado nas aulas).
Estado 02/11: app Flutter com tema e ecrã Welcome; API e BD ainda não começadas.

## Prioridades e disponibilidade (02/11)
- Disponibilidade: ~10–12 h/semana cada um, que eles consideram apertado → planear com folga e cortar cedo se necessário.
- Ordem: 1) núcleo (login/registo → objetos com foto → tarefas → concluir → histórico, ligado à API) até à apresentação intermédia (13/12); 2) admin de categorias e dicas; 3) animações e acabamentos; 4) modo escuro; 5) lembretes (notificações locais); 6) repetição de tarefas por último (é a primeira a cortar).
- Funcionalidades adicionais: só se o núcleo estiver pronto até meados de dezembro.

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
- 06/11/2026 23h59 EDT/WBS — PDF "GP-2627-E2-G1.pdf" com lista de todas as tarefas e organização lógica (sem dicionário)
- 14/11/2026 Cronograma
- 21/11/2026 Projeto em MS Project / ProjectLibre
- 28/11/2026 Requisitos funcionais e não funcionais
- 13/12/2026 Slides apresentação intermédia
- 10/01/2027 23h59 Entrega final; 11/01/2027 apresentação (15 min + 5 discussão)
- Limite geral do PI: 16/01/2027. Datas das outras disciplinas por confirmar.
Entrega final GP: GP-2627-EN-G1.pdf (relatório ≤20 pág, modelo da escola), GP-2627-EN-G1.mpp ou .pod (sem ele: −10%), GP-2627-EN-G1-A.pdf (slides), tudo em GP-2627-EN-G1.zip.
