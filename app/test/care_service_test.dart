import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:keepwell/services/api_client.dart';
import 'package:keepwell/services/care_service.dart';

/// Testes do CareService com uma API "a fingir" (MockClient).
void main() {
  test('createCare: envia POST /tasks com os dados em JSON', () async {
    late http.Request sentRequest;
    final service = CareService(
      api: ApiClient(
        client: MockClient((request) async {
          sentRequest = request;
          return http.Response(jsonEncode({'task': {}}), 201);
        }),
      ),
    );

    await service.createCare(
      objectId: 'o1',
      title: 'Lubrificar a corrente',
      dueOn: '2026-11-15',
    );

    expect(sentRequest.method, 'POST');
    expect(sentRequest.url.path, '/tasks');
    expect(jsonDecode(sentRequest.body), {
      'objectId': 'o1',
      'title': 'Lubrificar a corrente',
      'dueOn': '2026-11-15',
    });
  });
}
