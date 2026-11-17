# Gera o cronograma (Entrega 3 de GP) em HTML; depois imprime-se para PDF.
import html, sys

# Semanas previstas: índice -> (rótulo da carga, coluna do Gantt)
WEEKS = {1: '16–21/11', 2: '23–28/11', 3: '30/11–06/12', 4: '07–13/12', 5: '14–20/12',
         6: '21–27/12', 7: '28/12–03/01', 8: '04–10/01', 9: '11–16/01'}
GANTT_COLS = ['Out.', '02/11', '03–08', '09–12', '13–14', '16/11', '23/11', '30/11', '07/12',
              '14/12', '21/12', '28/12', '04/01', '11/01']
ACOMP = {w: 0.5 for w in WEEKS}; ACOMP[7] = 1.0  # acompanhamento (1.5.x): 5 h no total

H, P, PARC, NEW = 'Histórico', 'Previsto', 'Parcial', 'Nova'

# (código, tarefa, nota, h-p, janela, predecessoras, estado, semana prevista ou None)
AREAS = [
 ('1', 'Gestão do projeto', [
  ('1.1 Termo de Abertura', [
   ('1.1', 'Termo de Abertura', 'Elaborado em outubro; dia de submissão por confirmar.', 3, 'Out. / até 30/10', '-', H, None)]),
  ('1.2 Estrutura de Decomposição do Trabalho (EDT)', [
   ('1.2', 'Estrutura de Decomposição do Trabalho (EDT)', 'PDF registado em 02/11 (4680e18); entrega confirmada.', 5, 'Até 02–06/11', '1.1', H, None)]),
  ('1.3 Cronograma', [
   ('1.3.1', 'Lista de atividades e dependências', '', 1, '13–14/11', '1.2', H, None),
   ('1.3.2', 'Disponibilidade da equipa', '', 0.5, '13–14/11', '1.2', H, None),
   ('1.3.3', 'Estimativas de duração', '', 1, '13–14/11', '1.3.1, 1.3.2', H, None),
   ('1.3.4', 'Diagrama de Gantt', 'Revisto a 13/11 com o estado real da app (estados e prioridades).', 1.5, '13–14/11', '1.3.3', H, None)]),
  ('1.4 Planeamento editável', [
   ('1.4.1', 'Ficheiro ProjectLibre/MS Project', '', 3, '16–21/11', '1.3.4', P, 1),
   ('1.4.2', 'Linha de base', '', 0.5, '16–21/11', '1.4.1', P, 1)]),
  ('1.5 Acompanhamento e controlo', [
   ('1.5.1', 'Atas de reuniões da equipa', '', 2, '16/11–16/01', '1.1', P, 'all'),
   ('1.5.2', 'Registo de riscos atualizado', 'Inclui a dependência do Gemini (serviço externo, limite de análises, chave da API).', 1, '16/11–16/01', '1.1', P, 'all'),
   ('1.5.3', 'Atualização do progresso no planeamento', '', 2, '16/11–16/01', '1.4.2', P, 'all')]),
 ]),
 ('2', 'Análise e requisitos', [
  ('2.1 Requisitos', [
   ('2.1.1', 'Requisitos funcionais', '', 2, '23–28/11', '1.1', P, 2),
   ('2.1.2', 'Requisitos não funcionais', '', 1.5, '23–28/11', '1.1', P, 2),
   ('2.1.3', 'Critérios de verificação', '', 1.5, '23–28/11', '2.1.1, 2.1.2', P, 2)]),
  ('2.2 Regras de negócio', [
   ('2.2.1', 'Regras de eliminação', '', 1, '23–28/11', '4.4.1', P, 2),
   ('2.2.2', 'Regras do histórico e da repetição de tarefas', '', 1, '23–28/11', '4.4.3', P, 2),
   ('2.2.3', 'Lista inicial de categorias', '', 1, '06–08/11', '4.2.2', H, None),
   ('2.2.4', 'Criação da conta de administrador', 'Script de promoção a administrador registado em 03/11.', 1, '03/11', '4.3.1', H, None)]),
  ('2.3 Diagramas UML', [
   ('2.3.1', 'Diagrama de casos de uso', '', 2, '23–28/11', '2.1.1', P, 2),
   ('2.3.2', 'Diagrama de classes / modelo de dados', '', 2, '30/11–06/12', '4.2.5', P, 3)]),
  ('2.4 Decisões técnicas', [
   ('2.4.1', 'Escolha de backend e base de dados (Node.js, Express, MongoDB)', '', 1, '03/11', '1.1', H, None),
   ('2.4.2', 'Armazenamento das fotografias', '', 1, '06–08/11', '4.2.3', H, None),
   ('2.4.3', 'Ambiente de execução da API (testes e demonstração)', 'Antecipado: inclui um primeiro teste num telemóvel real antes da apresentação intermédia.', 2, '30/11–06/12', '4.5.1', P, 3)]),
 ]),
 ('3', 'Design e usabilidade', [
  ('3.1 Card sorting', [
   ('3.1.1', 'Preparação (cartões e participantes)', '', 1, '16–21/11', '1.1', P, 1),
   ('3.1.2', 'Sessões', '', 2, '16–21/11', '3.1.1', P, 1),
   ('3.1.3', 'Análise de resultados', 'Os resultados validam a arquitetura e alimentam os ajustes aos ecrãs (3.4.3).', 1, '23–28/11', '3.1.2', P, 2)]),
  ('3.2 Arquitetura de informação e navegação', [
   ('3.2.1', 'Mapa de navegação', 'Frame registado no PAM em 03/11; validar com card sorting.', 1, 'Até 03/11', '1.1', H, None),
   ('3.2.2', 'Fluxos principais', '', 2, '23–28/11', '3.1.3, 3.2.1', P, 2)]),
  ('3.3 Sistema de design', [
   ('3.3.1', 'Fundações: cor, tipografia, espaçamento e grelha', '', 3, 'Até 02–06/11', '1.1', H, None),
   ('3.3.2', 'Componentes base com estados', '', 5, 'Até 02–06/11', '3.3.1', H, None),
   ('3.3.3', 'Componentes específicos do KeepWell', '', 2, '30/11–06/12', '3.3.2', P, 3),
   ('3.3.4', 'Fichas de especificação e teste do conteúdo hostil', '', 2, '30/11–06/12', '3.3.3', P, 3),
   ('3.3.5', 'Modo escuro por variáveis e verificação de contraste', '', 2, '30/11–06/12', '3.3.1', P, 3),
   ('3.3.6', 'Publicação da biblioteca', '', 1, '07–13/12', '3.3.4, 3.3.5', P, 4)]),
  ('3.4 Protótipo interativo', [
   ('3.4.1', 'Ecrãs do utilizador comum', 'Ecrãs já observados em 03/11; ligações em 3.4.4.', 6, 'Até 03/11', '3.3.2', H, None),
   ('3.4.2', 'Ecrãs do administrador', 'Ecrãs já observados em 03/11; ligações em 3.4.4.', 3, 'Até 03/11', '3.3.2', H, None),
   ('3.4.3', 'Ajustes ao âmbito (arquivar Recuperar acesso) e ecrãs em falta', 'Inclui as alterações resultantes do card sorting.', 1, '23–28/11', '3.4.1, 3.4.2, 3.1.3', P, 2),
   ('3.4.4', 'Ligações, transições e overlays', '', 3, '30/11–06/12', '3.4.3, 3.2.2', P, 3),
   ('3.4.5', 'Handoff e revisão cruzada', '', 1, '07–13/12', '3.4.4', P, 4)]),
  ('3.5 Avaliação heurística', [
   ('3.5.1', 'Relatório de avaliação (4 problemas, regra violada, gravidade)', '', 2, '07–13/12', '3.4.4', P, 4),
   ('3.5.2', 'Três correções aplicadas no protótipo', '', 2, '07–13/12', '3.5.1', P, 4)]),
  ('3.6 Testes com utilizadores', [
   ('3.6.1', 'Guião e tarefas', '', 1, '07–13/12', '3.4.4', P, 4),
   ('3.6.2', 'Recrutamento de 3 participantes', '', 1, '16–21/11', '1.1', P, 1),
   ('3.6.3', 'Sessões em telemóvel', '', 3, '14–20/12', '3.6.1, 3.6.2, 3.5.2', P, 5),
   ('3.6.4', 'Registo e análise de resultados', '', 2, '14–20/12', '3.6.3', P, 5)]),
 ]),
 ('4', 'Backend e base de dados', [
  ('4.1 Projeto base da API', [
   ('4.1.1', 'Projeto Node.js/Express e estrutura de pastas', '', 2, '03/11', '2.4.1', H, None),
   ('4.1.2', 'Ligação à base de dados MongoDB', '', 2, '03/11', '4.1.1', H, None),
   ('4.1.3', 'Dados iniciais (categorias, administrador, exemplos)', 'Dados de demonstração a partir de 06/11 (425d539); cuidados e dicas acrescentados até 09/11.', 2, '06–09/11', '4.2.5, 4.3.2', H, None)]),
  ('4.2 Modelos de dados', [
   ('4.2.1', 'Utilizador', '', 1, '03/11', '4.1.2', H, None),
   ('4.2.2', 'Categoria', '', 1, '03/11', '4.1.2', H, None),
   ('4.2.3', 'Objeto', '', 2, '03/11', '4.2.1, 4.2.2', H, None),
   ('4.2.4', 'Tarefa de manutenção', '', 2, '06–08/11', '4.2.3', H, None),
   ('4.2.5', 'Dica', '', 1, '09/11', '4.2.2', H, None)]),
  ('4.3 Autenticação e permissões', [
   ('4.3.1', 'Registo e início de sessão', '', 4, '03/11', '4.2.1', H, None),
   ('4.3.2', 'Proteção das rotas por perfil (utilizador/administrador)', '', 2, '03/11', '4.3.1', H, None)]),
  ('4.4 Endpoints da API', [
   ('4.4.1', 'Objetos (CRUD, pesquisa e filtro)', 'Criação/pesquisa em 03/11; edição registada em 08/11.', 5, '03–08/11', '4.2.3, 4.3.2', H, None),
   ('4.4.2', 'Tarefas (CRUD, concluir e histórico)', 'Criação e conclusão em 08/11; edição e filtros em 09/11.', 5, '08–09/11', '4.2.4, 4.3.2', H, None),
   ('4.4.3', 'Repetição de tarefas', '', 3, '09/11', '4.4.2', H, None),
   ('4.4.4', 'Categorias (CRUD do administrador)', '', 3, '03–04/11', '4.2.2, 4.3.2', H, None),
   ('4.4.5', 'Dicas (consulta e CRUD do administrador)', '', 3, '09/11', '4.2.5, 4.3.2', H, None)]),
  ('4.5 Fotografias', [
   ('4.5.1', 'Envio e armazenamento', '', 4, '06–08/11', '2.4.2, 4.2.3', H, None),
   ('4.5.2', 'Disponibilização das imagens à app', '', 2, '06–08/11', '4.5.1', H, None),
   ('4.5.3', 'Análise de fotografias com Gemini', 'Nova (alteração de âmbito). Sugere nome e categoria; registada em 10/11.', 3, '10/11', '4.5.1', H, None)]),
  ('4.6 Documentação da API', [
   ('4.6.1', 'Recursos, URIs e métodos HTTP', '', 2, '14–20/12', '4.4.5, 4.5.3', P, 5),
   ('4.6.2', 'Exemplos de pedidos e respostas', '', 2, '21–27/12', '4.6.1', P, 6)]),
 ]),
 ('5', 'Aplicação Flutter', [
  ('5.1 Base da aplicação', [
   ('5.1.1', 'Projeto e tema (claro/escuro)', 'Base e tema inicial: 02/11 (951dca1, 367f004).', 3, '02/11', '1.1', H, None),
   ('5.1.2', 'Navegação entre ecrãs e barra de separadores', 'Navegação base observada até 08/11.', 2, 'Até 08/11', '5.1.1, 5.2.2', H, None),
   ('5.1.3', 'Serviço de ligação à API', 'Ligação de autenticação em 04/11; ecrãs ligados em 06/11.', 2, '04–06/11', '4.3.1, 5.1.1', H, None)]),
  ('5.2 Conta', [
   ('5.2.1', 'Ecrã de boas-vindas', '', 2, '02/11', '5.1.1', H, None),
   ('5.2.2', 'Entrar', '', 2, '03–04/11', '5.1.3, 5.2.1', H, None),
   ('5.2.3', 'Criar conta', '', 2, '03–04/11', '5.1.3, 5.2.1', H, None),
   ('5.2.4', 'Terminar sessão', '', 1, '06–08/11', '5.1.3, 5.2.2', H, None)]),
  ('5.3 Objetos', [
   ('5.3.1', 'Início', '', 2, '16–21/11', '5.1.2, 4.4.2', P, 1),
   ('5.3.2', 'Lista com pesquisa e filtro por categoria', 'Lista em 06/11 (425d539); pesquisa e filtro até 10/11; testado no emulador a 12/11.', 2, '06–10/11', '4.4.1, 5.1.3', H, None),
   ('5.3.3', 'Adicionar e editar objeto com fotografia (câmara)', 'Criação e câmara em 10/11 (9121587); edição em 12/11 (e87db19); testado no emulador.', 4, '10–12/11', '4.5.2, 5.1.3', H, None),
   ('5.3.4', 'Detalhe e eliminação do objeto', 'Detalhe e eliminação registados em 12/11 (e26cf7a, e87db19).', 3, '12/11', '4.4.1, 5.1.3', H, None),
   ('5.3.5', 'Histórico do objeto', '', 2, '23–28/11', '4.4.2, 5.3.4', P, 2),
   ('5.3.6', 'Preenchimento automático com a análise da foto', 'Nova (alteração de âmbito). Nome e categoria sugeridos pelo Gemini; registada em 10/11 (7a2c6ba).', 2, '10/11', '4.5.3, 5.3.3', H, None)]),
  ('5.4 Cuidados', [
   ('5.4.1', 'Lista com filtros por estado', 'Lista e filtros por estado registados em 12/11 (99657d2); testados no emulador.', 2, '12/11', '4.4.2, 5.1.3', H, None),
   ('5.4.2', 'Adicionar e editar cuidado', 'Criação registada e testada em 12/11 (faa0b88); falta a edição.', 2, '16–21/11', '4.4.2, 5.1.3', PARC, 1),
   ('5.4.3', 'Detalhe, conclusão e eliminação', 'Conclusão registada em 12/11 (5899175); faltam o detalhe e a eliminação.', 3, '23–28/11', '5.4.1, 5.4.2', PARC, 2),
   ('5.4.4', 'Lembretes (notificações locais)', 'Prioridade 5: pode ser cortada se o núcleo atrasar.', 5, '21–27/12', '5.4.3', P, 6),
   ('5.4.5', 'Repetição de tarefas', 'Prioridade 6, a primeira a cortar. A API já repete; na app é só escolher o intervalo.', 2, '21–27/12', '4.4.3, 5.4.2', P, 6)]),
  ('5.5 Dicas', [
   ('5.5.1', 'Consulta de dicas por categoria', '', 3, '16–21/11', '4.4.5, 5.1.3', P, 1)]),
  ('5.6 Perfil', [
   ('5.6.1', 'Definições e modo escuro', '', 3, '14–20/12', '5.2.4', P, 5)]),
  ('5.7 Administração', [
   ('5.7.1', 'Painel de administração', '', 2, '30/11–06/12', '5.2.2, 4.3.2', P, 3),
   ('5.7.2', 'Gestão de categorias', '', 3, '07–13/12', '5.7.1, 4.4.4', P, 4),
   ('5.7.3', 'Gestão de dicas', '', 3, '07–13/12', '5.7.1, 4.4.5', P, 4)]),
  ('5.8 Acabamentos', [
   ('5.8.1', 'Estados de carregamento, erro e lista vazia', 'Já aplicados nas listas de objetos e cuidados; falta rever os restantes ecrãs.', 1, '14–20/12', '5.4.3, 5.5.1', P, 5),
   ('5.8.2', 'Validação de formulários', 'Já aplicada nos formulários feitos; falta rever os do administrador.', 1, '21–27/12', '5.4.3, 5.7.3', P, 6),
   ('5.8.3', 'Animações', '', 2, '14–20/12', '5.8.1', P, 5),
   ('5.8.4', 'Revisão de Stateful/Stateless', '', 1, '21–27/12', '5.8.2', P, 6)]),
 ]),
 ('6', 'Integração e testes', [
  ('6.1 Testes de integração app/API', [
   ('6.1.1', 'Percurso principal (objeto > tarefa > conclusão > histórico)', '', 3, '30/11–06/12', '5.3.3, 5.3.5, 5.4.3', P, 3),
   ('6.1.2', 'Persistência dos dados', '', 2, '14–20/12', '6.1.1', P, 5)]),
  ('6.2 Testes de permissões e erros', [
   ('6.2.1', 'Acesso por perfil', '', 2, '14–20/12', '5.7.2, 5.7.3', P, 5),
   ('6.2.2', 'Formulários inválidos e eliminações', '', 2, '21–27/12', '5.8.2', P, 6),
   ('6.2.3', 'Falhas de ligação', '', 1, '21–27/12', '2.4.3, 6.1.1', P, 6),
   ('6.2.4', 'Câmara e notificações sem permissão', '', 2, '21–27/12', '5.3.3, 5.4.4', P, 6)]),
  ('6.3 Testes em Android real', [
   ('6.3', 'Testes em Android real', 'Primeiro teste num telemóvel em 2.4.3 (30/11–06/12); aqui, o teste completo.', 3, '28/12–03/01', '6.2.1, 6.2.2, 6.2.3, 6.2.4', P, 7)]),
  ('6.4 Correção de erros', [
   ('6.4', 'Correção de erros', '', 4, '04–10/01', '6.3', P, 8)]),
 ]),
 ('7', 'Entrega e apresentação', [
  ('7.1 Apresentação intermédia', [
   ('7.1.1', 'Slides', 'Prazo de entrega: 13/12; data da apresentação por confirmar.', 2, '07–13/12', '3.4.4, 6.1.1', P, 4),
   ('7.1.2', 'Ensaio', '', 1, '07–13/12', '7.1.1', P, 4)]),
  ('7.2 Documentação final', [
   ('7.2.1', 'Requisitos e UML atualizados', '', 2, '28/12–03/01', '2.3.1, 2.3.2', P, 7),
   ('7.2.2', 'Documentação da API final', '', 2, '28/12–03/01', '4.6.2', P, 7),
   ('7.2.3', 'Documentação do sistema de design', '', 2, '28/12–03/01', '3.3.6', P, 7)]),
  ('7.3 Relatório de GP', [
   ('7.3', 'Relatório de GP', '', 5, '04–10/01', '1.4.2, 7.2.1, 7.2.2, 7.2.3', P, 8)]),
  ('7.4 Apresentação final', [
   ('7.4.1', 'Slides', '', 3, '04–10/01', '7.3', P, 8),
   ('7.4.2', 'Dados e cenário de demonstração', 'Os dados de demonstração já existem (4.1.3); falta o guião.', 1, '04–10/01', '6.4', P, 8),
   ('7.4.3', 'Ensaio', '', 1, '04–10/01', '7.4.1, 7.4.2', P, 8)]),
  ('7.5 Submissões', [
   ('7.5.1', 'Pacote de GP (relatório, MPP/POD e slides em zip)', '', 0.5, '04–10/01', '7.4.3', P, 8),
   ('7.5.2', 'Entregas das restantes disciplinas', '', 2, '11–16/01', '7.5.1', P, 9)]),
 ]),
]

# Colunas do Gantt já cumpridas (histórico), por área.
HIST_COLS = {'1': ['Out.', '02/11', '13–14'], '2': ['03–08'], '3': ['02/11'], '4': ['03–08', '09–12'],
             '5': ['02/11', '03–08', '09–12'], '6': [], '7': []}
WEEK_COL = {1: '16/11', 2: '23/11', 3: '30/11', 4: '07/12', 5: '14/12', 6: '21/12', 7: '28/12', 8: '04/01', 9: '11/01'}

# ---- cálculos ----
load = dict(ACOMP)
planned_cols = {a[0]: set() for a in AREAS}
for code, _, groups in AREAS:
    for _, rows in groups:
        for r in rows:
            week = r[7]
            if week == 'all':
                planned_cols[code].update(WEEK_COL.values())
            elif week:
                load[week] += r[3]
                planned_cols[code].add(WEEK_COL[week])

def num(x):
    return (f'{x:.1f}'.rstrip('0').rstrip('.')).replace('.', ',')

if '--check' in sys.argv:
    for w in WEEKS: print(WEEKS[w], load[w])
    sys.exit()

esc = html.escape

def table(rows_groups):
    out = ['<table><thead><tr><th class="c">EDT</th><th>Tarefa</th><th class="h">h-p</th>'
           '<th class="j">Janela</th><th class="p">Predecessoras</th><th class="e">Estado</th></tr></thead><tbody>']
    for gname, rows in rows_groups:
        out.append(f'<tr class="g"><td colspan="6">{esc(gname)}</td></tr>')
        for code, name, note, hp, jan, pred, est, _ in rows:
            n = f'<div class="note">{esc(note)}</div>' if note else ''
            cls = {H: 'hist', P: 'prev', PARC: 'parc'}[est]
            out.append(f'<tr><td class="c"><b>{code}</b></td><td>{esc(name)}{n}</td><td class="h">{num(hp)}</td>'
                       f'<td class="j">{esc(jan)}</td><td class="p">{esc(pred)}</td><td class="e {cls}">{est}</td></tr>')
    out.append('</tbody></table>')
    return ''.join(out)

page_no = [0]
def page(title, sub, body):
    page_no[0] += 1
    return (f'<section class="page"><div class="bar"></div><div class="kicker">KEEPWELL / G1 / GESTÃO DE PROJETOS</div>'
            f'<h1>{title}</h1><div class="sub">{sub}</div>{body}'
            f'<div class="foot"><span>ESMAD | CTeSP em Design e Tecnologias para Aplicações Móveis | 2026/2027</span>'
            f'<b>{page_no[0]}</b></div></section>')

SUB = 'h-p = horas-pessoa estimadas | Histórico = já registado | Parcial = começado | Previsto = janela estimada'

pages = []
milestones = [('30/10/2026', 'Termo de Abertura'), ('06/11/2026', 'EDT'), ('14/11/2026', 'Cronograma - até 23h59'),
              ('21/11/2026', 'Planeamento editável'), ('28/11/2026', 'Requisitos funcionais e não funcionais'),
              ('13/12/2026', 'Slides da apresentação intermédia'), ('10/01/2027', 'Entrega final de GP - até 23h59'),
              ('11/01/2027', 'Apresentação e discussão de GP'), ('16/01/2027', 'Limite geral do Projeto Interdisciplinar')]
ms = ''.join(f'<div class="ms"><b>{d}</b><span>{esc(t)}</span></div>' for d, t in milestones)
pages.append(page('Cronograma do projeto',
 'Entrega 3 &nbsp;|&nbsp; Plinio Rodrigues (40250311) e Rafael Pereira (40250312) &nbsp;|&nbsp; 14/11/2026',
 '<p>O cronograma abrange o projeto desde o Termo de Abertura até à entrega final. As tabelas conservam os códigos da EDT entregue; '
 'as tarefas 4.5.3 e 5.3.6 são novas e correspondem a uma alteração de âmbito. As horas por tarefa são estimativas de trabalho em '
 'horas-pessoa, incluindo o trabalho histórico; não são horas medidas. A coluna Janela indica o período de execução ou a data em que o trabalho foi confirmado.</p>'
 '<p>Capacidade: 10 h por pessoa e por semana (20 h do grupo, incluindo aulas). A carga prevista fica abaixo das 20 h em todas as semanas, '
 'para deixar folga, sobretudo antes da apresentação intermédia (07–13/12) e da entrega final. Na pausa letiva, validar as horas disponíveis antes de fixar a linha de base. '
 'Nas tarefas previstas, as predecessoras devem terminar antes do início da tarefa seguinte. No histórico, as relações descrevem a sequência lógica; as janelas podem indicar apenas a data do registo.</p>'
 '<p>Prioridades: 1) núcleo (conta, objetos com fotografia, cuidados, conclusão e histórico) até à apresentação intermédia; 2) administração de categorias e dicas; '
 '3) animações e acabamentos; 4) modo escuro; 5) lembretes; 6) repetição de tarefas. Se houver atraso, cortam-se primeiro a repetição (5.4.5) e os lembretes (5.4.4).</p>'
 '<p>Referências: EDT entregue (GP-2627-E2-G1), enunciados de Gestão de Projetos e histórico do projeto. Os commits indicam datas de registo, sem fixar o dia em que o trabalho começou.</p>'
 '<p class="link"><a href="https://github.com/PlinioNR/KeepWell/commits/main" style="color:inherit;text-decoration:none">Histórico do repositório KeepWell (GitHub)</a></p>'
 f'<h2>Marcos de entrega</h2><div class="msgrid">{ms}</div>'
 '<p>Trabalho adicional registado: análise de fotografias com Gemini na API (4.5.3) e preenchimento automático de nome e categoria no Flutter (5.3.6), '
 'a 10/11. Trata-se de uma alteração de âmbito face à EDT entregue; o risco associado (serviço externo, limite de análises e chave da API) consta do registo de riscos (1.5.2).</p>'))

# Gantt
head = '<tr><th></th>' + ''.join(f'<th>{c}</th>' for c in GANTT_COLS) + '</tr>'
rows = ''
for code, name, _ in AREAS:
    cells = ''
    for c in GANTT_COLS:
        k = 'gh' if c in HIST_COLS[code] else 'gp' if c in planned_cols[code] else 'ge'
        cells += f'<td><div class="{k}"></div></td>'
    rows += f'<tr><td class="an">{code}&nbsp; {esc(name)}</td>{cells}</tr>'
loads = ''.join(f'<div class="ld"><b>{WEEKS[w]}</b><span>{num(load[w])} h</span></div>' for w in WEEKS)
pages.append(page('Visão semanal', 'Gantt resumido por área; o detalhe das tarefas, durações e relações segue nas páginas seguintes.',
 f'<table class="gantt">{head}{rows}</table>'
 '<div class="legend"><span><i class="gh"></i>Histórico documentado ou estimado</span><span><i class="gp"></i>Planeamento previsto</span></div>'
 f'<h2>Carga prevista por semana (h-pessoa)</h2><div class="loads">{loads}</div>'
 '<p>A carga semanal inclui 5 h de acompanhamento: 0,5 h por semana e 1 h na semana de 28/12. Os trabalhos de 13–14/11 totalizam 4 h. '
 'As janelas indicam semanas, não datas de início e fim medidas. As semanas de 16–21/11 e 07–13/12 têm folga para absorver atrasos antes dos marcos seguintes.</p>'))

# Páginas de tarefas: dividir grupos para caberem (máx. ~15 linhas por página)
MAX = 20
for code, name, groups in AREAS:
    chunks, cur, n = [], [], 0
    for g in groups:
        size = len(g[1]) + 1 + sum(1 for r in g[1] if r[2]) * 0.4
        if cur and n + size > MAX:
            chunks.append(cur); cur, n = [], 0
        cur.append(g); n += size
    chunks.append(cur)
    for i, ch in enumerate(chunks):
        title = f'{code}&nbsp; {esc(name)}' + ('&nbsp; (continuação)' if i else '')
        pages.append(page(title, SUB, table(ch)))

CSS = '''
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0b1f3a; font-size: 9.5pt; }
.page { width: 297mm; height: 210mm; position: relative; padding: 14mm 15mm 16mm; page-break-after: always; overflow: hidden; }
.bar { position: absolute; top: 0; left: 0; right: 0; height: 3.2mm; background: #001d4a; }
.kicker { color: #1b7a64; font-weight: bold; font-size: 8.5pt; letter-spacing: .3px; margin-top: 3mm; }
h1 { font-size: 25pt; margin: 1mm 0 1mm; color: #001d4a; }
h2 { font-size: 14pt; margin: 6mm 0 2mm; color: #001d4a; }
.sub { color: #5a6b85; font-size: 9pt; margin-bottom: 6mm; }
p { margin: 0 0 3mm; line-height: 1.4; font-size: 9pt; }
.link { color: #1b7a64; font-weight: bold; }
.msgrid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(5, auto); grid-auto-flow: column; gap: 1.6mm 6mm; margin-bottom: 4mm; }
.ms { background: #edf2f9; padding: 2.2mm 3mm; display: flex; gap: 8mm; font-size: 8.5pt; }
.ms b { width: 22mm; }
table { width: 100%; border-collapse: collapse; }
thead th { background: #001d4a; color: #fff; text-align: left; padding: 2.4mm 3mm; font-size: 8.5pt; }
td { padding: 1.7mm 3mm; border-bottom: .3mm solid #dfe6f0; vertical-align: middle; font-size: 8.5pt; }
tr.g td { background: #edf2f9; font-weight: bold; border: 0; padding: 1.5mm 3mm; }
.note { color: #5a6b85; font-size: 7pt; margin-top: .4mm; }
.c { width: 16mm; } .h { width: 14mm; } .j { width: 30mm; } .p { width: 38mm; } .e { width: 20mm; font-weight: bold; font-size: 8pt; }
.hist { color: #1b7a64; } .prev { color: #001d4a; } .parc { color: #b8661c; }
.gantt th { background: none; color: #001d4a; font-size: 7.5pt; text-align: left; padding: 0 0 3mm .5mm; }
.gantt td { border: 0; padding: .6mm .4mm; }
.gantt td.an { font-weight: bold; font-size: 9.5pt; width: 85mm; padding: 2.3mm 0; }
.gantt td div { height: 6.5mm; }
.gh { background: #1b7a64; } .gp { background: #001d4a; } .ge { background: #edf2f9; }
.legend { display: flex; gap: 40mm; margin: 4mm 0 0; font-size: 8.5pt; }
.legend i { display: inline-block; width: 4mm; height: 4mm; margin-right: 2mm; vertical-align: -0.8mm; }
.loads { display: grid; grid-template-columns: repeat(9, 1fr); margin-bottom: 4mm; }
.ld b { display: block; font-size: 7.5pt; margin-bottom: 1.5mm; } .ld span { font-weight: bold; font-size: 10pt; }
.foot { position: absolute; left: 15mm; right: 15mm; bottom: 8mm; border-top: .3mm solid #cfd8e3; padding-top: 2mm;
        display: flex; justify-content: space-between; color: #5a6b85; font-size: 7pt; }
'''
doc = f'<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>GP-2627-E3-G1</title><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'
open(sys.argv[1], 'w', encoding='utf-8').write(doc)
print('páginas:', page_no[0])
