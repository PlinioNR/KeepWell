import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:keepwell/services/api_client.dart';
import 'package:keepwell/services/api_exception.dart';
import 'package:keepwell/services/object_service.dart';
import 'package:keepwell/services/session.dart';

/// Testes do ObjectService com uma API "a fingir" (MockClient).
void main() {
  // Resposta JSON com acentos, como a API real envia.
  http.Response jsonResponse(Object body, int status) => http.Response(
    jsonEncode(body),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );

  test('fetchObjects: envia o token e lê a lista de objetos', () async {
    Session.token = 'abc';
    late http.Request sentRequest;
    final service = ObjectService(
      api: ApiClient(
        client: MockClient((request) async {
          sentRequest = request;
          return jsonResponse({
            'objects': [
              {
                'id': '1',
                'name': 'Bicicleta urbana',
                'categoryId': 'c1',
                'acquiredOn': null,
              },
            ],
            'page': 1,
            'pageSize': 100,
            'total': 1,
          }, 200);
        }),
      ),
    );

    final objects = await service.fetchObjects();

    expect(sentRequest.url.path, '/objects');
    expect(sentRequest.headers['Authorization'], 'Bearer abc');
    expect(objects.single.name, 'Bicicleta urbana');
    expect(objects.single.categoryId, 'c1');
  });

  test('fetchCategories: lê a lista de categorias', () async {
    final service = ObjectService(
      api: ApiClient(
        client: MockClient(
          (_) async => jsonResponse({
            'categories': [
              {'id': 'c1', 'name': 'Veículos', 'icon': 'bike'},
            ],
          }, 200),
        ),
      ),
    );

    final categories = await service.fetchCategories();

    expect(categories.single.name, 'Veículos');
  });

  test('sessão expirada: mostra a mensagem da API', () async {
    final service = ObjectService(
      api: ApiClient(
        client: MockClient(
          (_) async => jsonResponse({
            'error': 'Sessão inválida ou expirada. Inicia sessão novamente.',
          }, 401),
        ),
      ),
    );

    await expectLater(
      service.fetchObjects(),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Sessão inválida ou expirada. Inicia sessão novamente.',
        ),
      ),
    );
  });
}
