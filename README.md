# KeepWell

> Cuide dos objetos da sua casa e faça-os durar mais tempo.

O **KeepWell** é uma aplicação móvel Android para organizar a manutenção dos objetos de uma casa, como eletrodomésticos, móveis e bicicletas. Cada pessoa regista objetos com fotografia, planeia cuidados conforme o seu papel e consulta o histórico. A partilha por casa permitirá aos membros acompanhar os mesmos objetos, cuidados e dicas.

Projeto Interdisciplinar 2 do CTeSP em **Design e Tecnologias para Aplicações Móveis** (ESMAD, 2026/2027).

---

## Índice

1. [Problema e objetivo](#1-problema-e-objetivo)
2. [Público-alvo](#2-público-alvo)
3. [Funcionalidades](#3-funcionalidades)
4. [Papéis na casa](#4-papéis-na-casa)
5. [Tecnologias](#5-tecnologias)
6. [Estrutura do repositório](#6-estrutura-do-repositório)
7. [Como correr a app](#7-como-correr-a-app)
8. [Testes](#8-testes)
9. [Design](#9-design)
10. [Regras do código](#10-regras-do-código)
11. [Estado do projeto](#11-estado-do-projeto)
12. [Equipa](#12-equipa)

---

## 1. Problema e objetivo

**Problema.** As pessoas esquecem-se de fazer a manutenção dos seus objetos e não guardam registo do que já foi feito. Muitos objetos avariam antes do tempo e acabam por ser substituídos, o que traz mais despesa e mais desperdício.

**Objetivo.** Criar uma app que torne a manutenção simples e regular: registar o objeto, planear o cuidado, marcar como feito e consultar o histórico.

**Enquadramento no ODS 12 — Produção e Consumo Responsáveis**
- **Meta 12.5** (principal): prevenir resíduos, incentivando a conservação e evitando o descarte antecipado.
- **Meta 12.2** (complementar): uso eficiente dos recursos, ao prolongar a utilização dos produtos.

> Os impactos são contributos potenciais: o projeto não mede resíduos evitados.

**Exemplo do percurso principal**
1. Registar uma bicicleta (com fotografia).
2. Criar a tarefa "Lubrificar a corrente".
3. Definir a data prevista.
4. Marcar a tarefa como concluída.
5. Ver esse cuidado no histórico da bicicleta.

## 2. Público-alvo

Adultos entre os 20 e os 45 anos que vivem de forma independente (estudantes deslocados, jovens casais, famílias) e que querem que as suas coisas durem mais, mas não se lembram de cuidar delas.

## 3. Funcionalidades

| Área | Funcionalidade prevista |
|---|---|
| **Conta** | Criar conta, entrar e terminar sessão. O registo cria automaticamente a casa inicial. |
| **Casa** | Consultar membros e papéis, convidar por código, entrar noutra casa e gerir membros conforme o papel. Cada pessoa pertence a uma casa de cada vez. |
| **Objetos** | Registar uma fotografia, pesquisar por nome e filtrar por categoria. Todos os membros da casa podem criar, editar e eliminar objetos. |
| **Análise de fotografias** | O Gemini sugere o nome e a categoria no formulário. A API também devolve sugestões de cuidados. |
| **Cuidados** | Planear um cuidado para um objeto, definir a data e marcá-lo como concluído. |
| **Histórico** | Consultar o evento de criação do objeto e os cuidados concluídos, com a data e as observações da conclusão. |
| **Categorias** | Consultar um catálogo fixo partilhado por todas as casas. |
| **Dicas** | Consultar dicas de cada objeto, com link opcional para vídeo ou tutorial. Dono e gestor podem geri-las. |
| **Perfil** | Definições da conta e modo escuro. |

Lembretes locais e repetição de cuidados ficam fora da prioridade da app nesta fase.

## 4. Papéis na casa

| Papel | Permissões previstas |
|---|---|
| **Dono** | Consulta e gere os dados da casa, renomeia a casa, gera convites, muda papéis e remove membros. |
| **Gestor** | Consulta e gere objetos, cuidados e dicas. Pode renomear a casa, gerar convites e sair da casa. |
| **Membro** | Consulta objetos, fotos, cuidados, histórico, dicas e membros. Pode adicionar, editar e eliminar objetos e gerir as suas fotografias. Pode sair da casa. |

Cada conta começa como dona da sua casa. Para aceitar um convite, a casa atual deve ter apenas essa pessoa, sem objetos nem dicas. O código tem oito caracteres, dura sete dias e permite a entrada como membro. A API vai verificar o papel em cada operação protegida. As regras completas estão na [especificação de casas](docs/casas.md).

## 5. Tecnologias

| Parte | Tecnologia |
|---|---|
| App móvel | [Flutter](https://flutter.dev) (Dart), Android para a demonstração e Chrome para testes locais |
| API | Node.js + Express (API REST) |
| Base de dados | MongoDB Atlas |
| Análise de fotografias | Google Gemini |
| Design | Figma (protótipo e sistema de design) |
| Controlo de versões | Git + GitHub |

**Pacotes da app**

| Pacote | Para quê |
|---|---|
| [`google_fonts`](https://pub.dev/packages/google_fonts) | Fonte Nunito Sans, a mesma do Figma |
| [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter) | Ícones Lucide, a mesma família do Figma |

## 6. Estrutura do repositório

```
KeepWell/
├── app/                        App Flutter
│   ├── assets/images/          Imagens (logótipo)
│   ├── lib/
│   │   ├── main.dart           Ponto de entrada: tema e primeiro ecrã
│   │   ├── screens/            Um ficheiro por ecrã
│   │   │   ├── welcome_screen.dart
│   │   │   ├── sign_in_screen.dart
│   │   │   └── sign_up_screen.dart
│   │   ├── theme/              Cores, espaçamentos e tema (claro/escuro)
│   │   │   ├── app_colors.dart
│   │   │   ├── app_spacing.dart
│   │   │   └── app_theme.dart
│   │   ├── utils/              Funções auxiliares
│   │   │   └── validators.dart Validação dos formulários
│   │   └── widgets/            Widgets partilhados entre ecrãs
│   │       └── app_text_field.dart
│   ├── test/                   Testes automáticos
│   └── pubspec.yaml            Dependências e recursos da app
├── api/                        API Node.js/Express (em desenvolvimento)
├── docs/casas.md               Especificação de casas e permissões
├── docs/gp/                    Entregas de Gestão de Projetos
├── EDT.md                      Estrutura de Decomposição do Trabalho
├── CLAUDE.md                   Contexto e regras do projeto
└── README.md
```

## 7. Como correr a app

### Requisitos
- [Flutter](https://docs.flutter.dev/get-started/install) (versão estável; o projeto usa Dart 3.13 ou superior)
- [Android Studio](https://developer.android.com/studio) com o Android SDK e as *Command-line Tools*
- Um emulador Android ou um telemóvel Android com a *Depuração USB* ativa
- [Git](https://git-scm.com)

Para confirmar que está tudo instalado:
```bash
flutter doctor
```
A linha **Android toolchain** tem de aparecer com `[√]`. A linha do Visual Studio pode ficar com `X` (só serve para apps Windows).

### Passos
1. **Clonar o repositório**
   ```bash
   git clone https://github.com/PlinioNR/KeepWell.git
   cd KeepWell/app
   ```
2. **Instalar as dependências**
   ```bash
   flutter pub get
   ```
3. **Abrir o emulador** (Android Studio → *Device Manager* → ▶) ou ligar o telemóvel por USB.
4. **Correr a app**
   ```bash
   flutter run
   ```

Para usar o login e os dados da casa, configura e inicia a API num terminal separado.
A API usa Node.js 24 ou superior e um ficheiro local `api/.env`.
Segue os passos de preparação no [README da API](api/README.md).

Também podes experimentar no Chrome, a partir de `KeepWell/app`, com a API ligada.

```bash
flutter run -d chrome --web-hostname localhost --web-port 8080
```

### Durante o desenvolvimento
| Tecla no terminal do `flutter run` | O que faz |
|---|---|
| `r` | *Hot reload*: aplica alterações ao código sem reiniciar a app |
| `R` | *Hot restart*: reinicia a app (necessário quando se muda o primeiro ecrã ou o estado inicial) |
| `q` | Fecha a app |

Quando se acrescentam imagens ou pacotes novos, é preciso parar (`q`) e voltar a correr `flutter run`.

### Problemas comuns
- **"This command should be run from the root of your Flutter project"** — o comando foi corrido na pasta `KeepWell` em vez de `KeepWell/app`.
- **O emulador não responde e o hot reload não funciona** — o emulador ficou *offline*. Fechar o emulador e arrancá-lo do zero: Android Studio → *Device Manager* → ⋮ → **Cold Boot Now**.
- **`cmdline-tools component is missing`** — Android Studio → *SDK Manager* → *SDK Tools* → marcar **Android SDK Command-line Tools**.

## 8. Testes

Dentro da pasta `app`:
```bash
flutter analyze
```
Verifica o código à procura de erros e más práticas.

```bash
flutter test
```
Corre os testes automáticos em `app/test/`. Atualmente verificam:
- a app abre no ecrã de boas-vindas com a logo e os dois botões;
- o ecrã **Entrar** abre a partir do Welcome, mostra erros com os campos vazios e a seta volta atrás;
- o ecrã **Criar conta** valida nome, palavra-passe curta e aceitação dos termos.

## 9. Design

- **Figma:** [KeepWell — protótipo e sistema de design](https://www.figma.com/design/PYQKV2OlgnlrZcCt5HCspK)
- O tema da app (`app/lib/theme/`) usa **os mesmos valores das variáveis do Figma**:

| Fundação | Valores |
|---|---|
| Cor primária | `#001D4A` (azul-marinho) |
| Cor secundária | `#F4F1BB` (creme) |
| Cor de destaque | `#ED6A5A` (coral) |
| Estados | Danger, Success, Info |
| Tipografia | Nunito Sans — H1 32, H2 28, H3 24, Title 20, Body 16, Body Small 14, Caption 12 |
| Espaçamentos | 4 · 8 · 16 · 24 · 32 · 48 |
| Raios dos cantos | 4 · 8 · 16 · 999 |

Correspondência entre os estilos de texto do Figma e do Flutter:

| Figma | Flutter (`Theme.of(context).textTheme`) |
|---|---|
| H1 / H2 / H3 | `headlineLarge` / `headlineMedium` / `headlineSmall` |
| Title | `titleLarge` |
| Body / Body Small / Caption | `bodyLarge` / `bodyMedium` / `bodySmall` |
| Button / Label / Tab Label | `labelLarge` / `labelMedium` / `labelSmall` |

## 10. Regras do código

O código é escrito por dois estudantes a aprender Flutter, por isso segue regras simples:

- **Simples e legível:** nomes claros, ficheiros pequenos, um ecrã por ficheiro.
- **Sem arquiteturas avançadas:** o estado gere-se com `StatefulWidget` e `setState`; a navegação com `Navigator.push` / `pop`.
- **Stateless vs Stateful:** `StatelessWidget` para o que não muda (ex.: Welcome); `StatefulWidget` para ecrãs com dados que mudam (ex.: formulários).
- **Nada de valores à mão nos ecrãs:** cores, textos e espaçamentos vêm sempre do tema (`AppColors`, `AppSpacing`, `Theme.of(context)`).
- **Reutilizar:** o que se repete em vários ecrãs vai para `widgets/` (componentes) ou `utils/` (funções).
- **Comentários em português** a explicar para que serve cada classe e as partes menos óbvias.
- **Antes de cada commit:** `flutter analyze` sem problemas e `flutter test` a passar.

## 11. Estado do projeto

| Parte | Estado atual |
|---|---|
| Conta | Registo e login ligados à API e testados no emulador. |
| Objetos | Criação, consulta, pesquisa, filtros e fotografia disponíveis na app. |
| Cuidados e histórico | Criação e conclusão ligadas à app. A API disponibiliza edição, histórico, descrição e observações de conclusão. |
| Análise de fotografias | Preenchimento de nome e categoria testado no Chrome. As sugestões de cuidados estão disponíveis na API. |
| Casas e papéis | Registo transacional, convites e gestão de membros implementados e testados em bases temporárias do Atlas. Integração dos ecrãs da casa pendente. |
| Migração dos dados | Migração aplicada na base partilhada a 19/11/2026. Cinco contas, três casas, dez objetos, doze cuidados e quatro dicas por objeto. Logins e papéis verificados na API. |
| Permissões, categorias e dicas | Objetos, fotos, histórico, cuidados, notificações e dicas usam a casa. O membro gere objetos e fotos. Dicas por objeto com vídeo opcional. Categorias só de consulta. |

Os comandos da API estão no [README da API](api/README.md). Os problemas e testes estão no [diário técnico](docs/diario-tecnico.md). O planeamento completo está no [EDT](EDT.md).

## 12. Equipa

**Grupo G1**

| Nome | Número |
|---|---|
| Plinio Rodrigues | 40250311 |
| Rafael Pereira | 40250312 |

**Unidades curriculares envolvidas:** Gestão de Projetos · Usabilidade e User Experience · Prototipagem em Aplicações Móveis · Sensores e Serviços Web · Desenvolvimento em Aplicações Móveis II.
