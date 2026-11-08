import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:keepwell/services/api_exception.dart';
import 'package:keepwell/services/auth_service.dart';
import 'package:keepwell/services/session.dart';

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

    await service.register(
      name: 'Ana',
      email: 'ana@mail.pt',
      password: 'abc123',
    );

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
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({'error': 'Já existe uma conta com este email.'}),
          409,
          headers: {'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    );

    expect(
      () => service.register(
        name: 'Ana',
        email: 'ana@mail.pt',
        password: 'abc123',
      ),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Já existe uma conta com este email.',
        ),
      ),
    );
  });

  test('register: sem ligação ao servidor dá uma mensagem clara', () async {
    final service = AuthService(
      client: MockClient((_) async => throw http.ClientException('offline')),
    );

    expect(
      () => service.register(
        name: 'Ana',
        email: 'ana@mail.pt',
        password: 'abc123',
      ),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Não foi possível ligar ao servidor. Verifique a ligação.',
        ),
      ),
    );
  });

  test('login: guarda o token e o utilizador na Session', () async {
    Session.clear();
    final service = AuthService(
      client: MockClient((request) async {
        expect(request.url.path, '/auth/login');
        return http.Response(
          jsonEncode({
            'token': 'abc',
            'tokenType': 'Bearer',
            'user': {
              'id': '1',
              'name': 'Ana',
              'email': 'ana@mail.pt',
              'role': 'user',
            },
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );

    await service.login(email: 'ana@mail.pt', password: 'abc123');

    expect(Session.token, 'abc');
    expect(Session.user?.name, 'Ana');
    expect(Session.user?.isAdmin, false);
  });

  test('login: palavra-passe errada mostra a mensagem da API', () async {
    Session.clear();
    final service = AuthService(
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({'error': 'Email ou palavra-passe incorretos.'}),
          401,
          headers: {'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    );

    await expectLater(
      service.login(email: 'ana@mail.pt', password: 'errada'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Email ou palavra-passe incorretos.',
        ),
      ),
    );
    expect(Session.isLoggedIn, false);
  });

  test('logout: envia o token à API e apaga a Session', () async {
    Session.token = 'abc';
    late http.Request sentRequest;
    final service = AuthService(
      client: MockClient((request) async {
        sentRequest = request;
        return http.Response('', 204);
      }),
    );

    await service.logout();

    expect(sentRequest.url.path, '/auth/logout');
    expect(sentRequest.headers['Authorization'], 'Bearer abc');
    expect(Session.isLoggedIn, false);
  });

  test('logout: sem ligação, a app sai na mesma', () async {
    Session.token = 'abc';
    final service = AuthService(
      client: MockClient((_) async => throw http.ClientException('offline')),
    );

    await service.logout();

    expect(Session.isLoggedIn, false);
  });
}
