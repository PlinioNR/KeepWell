import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:keepwell/services/api_exception.dart';
import 'package:keepwell/services/auth_service.dart';

/// Testes do AuthService com uma API "a fingir" (MockClient):
/// não é preciso ter a API ligada nem Internet.
void main() {
  test('register: envia os dados em JSON e aceita a resposta 201', () async {
    late http.Request sentRequest;
    final service = AuthService(
      client: MockClient((request) async {
        sentRequest = request;
        return http.Response('{"user":{"id":"1"}}', 201);
      }),
    );

    await service.register(name: 'Ana', email: 'ana@mail.pt', password: 'abc123');

    expect(sentRequest.method, 'POST');
    expect(sentRequest.url.path, '/auth/register');
    expect(jsonDecode(sentRequest.body), {
      'name': 'Ana',
      'email': 'ana@mail.pt',
      'password': 'abc123',
    });
  });

  test('register: mostra a mensagem de erro que a API envia', () async {
    final service = AuthService(
      client: MockClient((_) async => http.Response(
            jsonEncode({'error': 'Já existe uma conta com este email.'}),
            409,
            headers: {'content-type': 'application/json; charset=utf-8'},
          )),
    );

    expect(
      () => service.register(name: 'Ana', email: 'ana@mail.pt', password: 'abc123'),
      throwsA(isA<ApiException>().having(
          (e) => e.message, 'message', 'Já existe uma conta com este email.')),
    );
  });

  test('register: sem ligação ao servidor dá uma mensagem clara', () async {
    final service = AuthService(
      client: MockClient((_) async => throw http.ClientException('offline')),
    );

    expect(
      () => service.register(name: 'Ana', email: 'ana@mail.pt', password: 'abc123'),
      throwsA(isA<ApiException>().having((e) => e.message, 'message',
          'Não foi possível ligar ao servidor. Verifique a ligação.')),
    );
  });
}
