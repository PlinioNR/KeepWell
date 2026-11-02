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
}
