import 'package:flutter_test/flutter_test.dart';
import 'package:keepwell/utils/validators.dart';

/// Testes da regra da palavra-passe (igual à da API: 6 a 20, sem espaços).
void main() {
  test('Palavra-passe nova: aceita entre 6 e 20 caracteres sem espaços', () {
    expect(validateNewPassword('abc123'), isNull); // 6: no limite
    expect(validateNewPassword('a' * 20), isNull); // 20: no limite
  });

  test('Palavra-passe nova: rejeita vazia, curta, longa e com espaços', () {
    expect(validateNewPassword(''), 'Escreva uma palavra-passe.');
    expect(validateNewPassword('abc12'), 'Use pelo menos 6 caracteres.');
    expect(validateNewPassword('a' * 21), 'Use no máximo 20 caracteres.');
    expect(validateNewPassword('abc 123'), 'Não use espaços.');
  });

  test('nome do objeto: obrigatório e com pelo menos 2 caracteres', () {
    expect(validateObjectName('  '), 'Escreva o nome do objeto.');
    expect(validateObjectName('a'), 'Use pelo menos 2 caracteres.');
    expect(validateObjectName('Bicicleta'), isNull);
  });

  test('validateCareTitle: obrigatório, pelo menos 2 caracteres', () {
    expect(validateCareTitle(''), 'Escreva a tarefa.');
    expect(validateCareTitle('a'), 'Use pelo menos 2 caracteres.');
    expect(validateCareTitle('Lubrificar a corrente'), isNull);
  });
}
