import 'package:flutter_test/flutter_test.dart';
import 'package:keepwell/utils/date_format.dart';

void main() {
  final date = DateTime(2024, 3, 9);

  test('data para o ecrã: DD/MM/AAAA com zeros à esquerda', () {
    expect(formatDateForDisplay(date), '09/03/2024');
  });

  test('data para a API: AAAA-MM-DD', () {
    expect(formatDateForApi(date), '2024-03-09');
  });
}
