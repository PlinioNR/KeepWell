import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:keepwell/services/api_client.dart';
import 'package:keepwell/services/tip_service.dart';

/// Testes do TipService com uma API "a fingir" (MockClient).
void main() {
  test('fetchTips: pede as dicas do objeto e lê o link do vídeo', () async {
    final service = TipService(
      api: ApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/tips');
          expect(request.url.queryParameters['objectId'], 'o1');
          return http.Response(
            jsonEncode({
              'tips': [
                {
                  'id': 't1',
                  'objectId': 'o1',
                  'title': 'Descalcificar',
                  'text': 'Uma vez por mês.',
                  'videoUrl': 'https://exemplo.pt/video',
                },
                {
                  'id': 't2',
                  'objectId': 'o1',
                  'title': 'Limpar o depósito',
                  'text': 'Com água morna.',
                  'videoUrl': null,
                },
              ],
            }),
            200,
          );
        }),
      ),
    );

    final tips = await service.fetchTips('o1');

    expect(tips.length, 2);
    expect(tips[0].videoUrl, 'https://exemplo.pt/video');
    expect(tips[1].videoUrl, isNull);
  });
}
