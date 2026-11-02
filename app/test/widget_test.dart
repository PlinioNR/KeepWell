import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:keepwell/main.dart';

void main() {
  // Nos testes não há Internet para descarregar a fonte.
  GoogleFonts.config.allowRuntimeFetching = false;

  testWidgets('A app arranca com o ecrã de pré-visualização do tema',
      (tester) async {
    await tester.pumpWidget(const KeepWellApp());

    expect(find.text('Tema KeepWell'), findsOneWidget);
    expect(find.text('GUARDAR OBJETO'), findsOneWidget);
  });
}
