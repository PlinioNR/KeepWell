import 'dart:convert';
import 'dart:io';

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

  test('createObject: envia os dados em JSON e lê o objeto criado', () async {
    late http.Request sentRequest;
    final service = ObjectService(
      api: ApiClient(
        client: MockClient((request) async {
          sentRequest = request;
          return jsonResponse({
            'object': {
              'id': '9',
              'name': 'Portátil',
              'categoryId': 'c1',
              'acquiredOn': '2024-03-09',
            },
          }, 201);
        }),
      ),
    );

    final object = await service.createObject(
      name: 'Portátil',
      categoryId: 'c1',
      acquiredOn: '2024-03-09',
    );

    expect(sentRequest.method, 'POST');
    expect(sentRequest.url.path, '/objects');
    expect(jsonDecode(sentRequest.body), {
      'name': 'Portátil',
      'categoryId': 'c1',
      'acquiredOn': '2024-03-09',
    });
    expect(object.id, '9');
  });

  test('uploadPhoto: envia a foto em multipart no campo photo', () async {
    // Ficheiro temporário a fazer de fotografia.
    final file = File('${Directory.systemTemp.path}/keepwell_test.jpg')
      ..writeAsBytesSync([1, 2, 3]);
    late http.BaseRequest sentRequest;
    late String sentBody;
    final service = ObjectService(
      api: ApiClient(
        client: MockClient((request) async {
          sentRequest = request;
          sentBody = request.body;
          return jsonResponse({
            'object': {
              'id': '9',
              'name': 'Portátil',
              'categoryId': 'c1',
              'acquiredOn': null,
              'photoUrl': '/objects/9/photo',
            },
          }, 200);
        }),
      ),
    );

    final object = await service.uploadPhoto('9', file.path);

    expect(sentRequest.method, 'PUT');
    expect(sentRequest.url.path, '/objects/9/photo');
    expect(
      sentRequest.headers['content-type'],
      contains('multipart/form-data'),
    );
    expect(sentBody, contains('name="photo"'));
    expect(sentBody, contains('content-type: image/jpeg'));
    expect(object.photoUrl, '/objects/9/photo');
  });

  test(
    'analyzePhoto: envia a foto em POST e lê o nome e a categoria',
    () async {
      final file = File('${Directory.systemTemp.path}/keepwell_analise.jpg')
        ..writeAsBytesSync([1, 2, 3]);
      late http.BaseRequest sentRequest;
      final service = ObjectService(
        api: ApiClient(
          client: MockClient((request) async {
            sentRequest = request;
            return jsonResponse({
              'object': {'name': 'Bicicleta', 'categoryId': 'c1'},
              'suggestedTasks': [],
            }, 200);
          }),
        ),
      );

      final result = await service.analyzePhoto(file.path);

      expect(sentRequest.method, 'POST');
      expect(sentRequest.url.path, '/objects/photo-analysis');
      expect(result['name'], 'Bicicleta');
      expect(result['categoryId'], 'c1');
    },
  );

  test('updateObject: envia PATCH com os dados novos', () async {
    late http.Request sentRequest;
    final service = ObjectService(
      api: ApiClient(
        client: MockClient((request) async {
          sentRequest = request;
          return jsonResponse({
            'object': {'id': '9', 'name': 'Portátil novo', 'categoryId': 'c1'},
          }, 200);
        }),
      ),
    );

    final object = await service.updateObject(
      '9',
      name: 'Portátil novo',
      categoryId: 'c1',
    );

    expect(sentRequest.method, 'PATCH');
    expect(sentRequest.url.path, '/objects/9');
    expect(jsonDecode(sentRequest.body)['name'], 'Portátil novo');
    expect(object.name, 'Portátil novo');
  });

  test('deleteObject: aceita 204 e mostra o erro 409 da API', () async {
    // 1.º pedido corre bem (204, sem corpo); o 2.º é recusado (409).
    var calls = 0;
    final service = ObjectService(
      api: ApiClient(
        client: MockClient((request) async {
          calls++;
          expect(request.method, 'DELETE');
          return calls == 1
              ? http.Response('', 204)
              : jsonResponse({
                  'error': 'O objeto tem tarefas associadas.',
                }, 409);
        }),
      ),
    );

    await service.deleteObject('9');
    expect(
      () => service.deleteObject('9'),
      throwsA(
        isA<ApiException>().having(
          (error) => error.message,
          'message',
          'O objeto tem tarefas associadas.',
        ),
      ),
    );
  });
}
