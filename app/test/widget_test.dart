import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:keepwell/main.dart';

void main() {
  // Nos testes não há Internet para descarregar a fonte.
  GoogleFonts.config.allowRuntimeFetching = false;

  testWidgets('A app abre no ecrã Welcome com os dois botões', (tester) async {
    await tester.pumpWidget(const KeepWellApp());

    expect(find.bySemanticsLabel('Logótipo KeepWell'), findsOneWidget);
    expect(find.text('ENTRAR'), findsOneWidget);
    expect(find.text('CRIAR CONTA'), findsOneWidget);
  });

  testWidgets('Entrar: abre a partir do Welcome e valida os campos vazios',
      (tester) async {
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
}
