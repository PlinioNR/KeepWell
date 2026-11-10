import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:keepwell/main.dart';
import 'package:keepwell/models/category.dart';
import 'package:keepwell/screens/add_object_screen.dart';
import 'package:keepwell/theme/app_theme.dart';
import 'package:keepwell/widgets/category_chip.dart';
import 'package:keepwell/widgets/object_card.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

void main() {
  // Nos testes não há Internet para descarregar a fonte.
  GoogleFonts.config.allowRuntimeFetching = false;

  testWidgets('A app abre no ecrã Welcome com os dois botões', (tester) async {
    await tester.pumpWidget(const KeepWellApp());

    expect(find.bySemanticsLabel('Logótipo KeepWell'), findsOneWidget);
    expect(find.text('ENTRAR'), findsOneWidget);
    expect(find.text('CRIAR CONTA'), findsOneWidget);
  });

  testWidgets('Entrar: abre a partir do Welcome e valida os campos vazios', (
    tester,
  ) async {
    await tester.pumpWidget(const KeepWellApp());

    // Toca em ENTRAR no Welcome e espera pela animação de transição.
    await tester.tap(find.text('ENTRAR'));
    await tester.pumpAndSettle();
    expect(find.text('Bem-vindo de volta'), findsOneWidget);

    // Toca em ENTRAR com os campos vazios: devem aparecer os dois erros.
    await tester.tap(find.text('ENTRAR'));
    await tester.pump();
    expect(find.text('Escreva o seu email.'), findsOneWidget);
    expect(find.text('Escreva a palavra-passe.'), findsOneWidget);

    // A seta "voltar" regressa ao Welcome.
    await tester.tap(find.byTooltip('Voltar'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Logótipo KeepWell'), findsOneWidget);
  });

  testWidgets('Criar conta: valida campos, palavra-passe curta e termos', (
    tester,
  ) async {
    // Ecrã do tamanho do Figma (390 × 844), para caber o formulário todo.
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const KeepWellApp());
    await tester.tap(find.text('CRIAR CONTA'));
    await tester.pumpAndSettle();
    expect(find.text('Crie a sua conta'), findsOneWidget);

    // Palavra-passe com menos de 6 caracteres e termos por aceitar.
    await tester.enterText(find.byType(TextFormField).at(2), '123');
    await tester.tap(find.widgetWithText(FilledButton, 'CRIAR CONTA'));
    await tester.pump();
    expect(find.text('Escreva o seu nome.'), findsOneWidget);
    expect(find.text('Use pelo menos 6 caracteres.'), findsOneWidget);
    expect(
      find.text('Tem de aceitar os termos para criar conta.'),
      findsOneWidget,
    );

    // Marcar a caixa faz desaparecer o erro dos termos.
    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    expect(
      find.text('Tem de aceitar os termos para criar conta.'),
      findsNothing,
    );
  });

  testWidgets('Cartão de objeto mostra nome e categoria', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: ObjectCard(name: 'Bicicleta urbana', category: 'Veículos'),
        ),
      ),
    );

    expect(find.text('Bicicleta urbana'), findsOneWidget);
    expect(find.text('Veículos'), findsOneWidget);
  });

  testWidgets('Chip de categoria: só o selecionado mostra o ✓', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Row(
            children: [
              CategoryChip(label: 'Todos', selected: true, onTap: () {}),
              CategoryChip(
                label: 'Veículos',
                selected: false,
                onTap: () => taps++,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.byIcon(LucideIcons.check), findsOneWidget);
    await tester.tap(find.text('Veículos'));
    expect(taps, 1);
  });

  testWidgets('Novo objeto: valida nome e categoria', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const AddObjectScreen(
          categories: [Category(id: 'c1', name: 'Veículos', icon: 'bike')],
        ),
      ),
    );

    await tester.tap(find.text('GUARDAR OBJETO'));
    await tester.pump();

    expect(find.text('Escreva o nome do objeto.'), findsOneWidget);
    expect(find.text('Escolha uma categoria.'), findsOneWidget);
  });
}
