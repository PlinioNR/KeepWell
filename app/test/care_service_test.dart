import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:keepwell/models/care.dart';
import 'package:keepwell/utils/date_format.dart';
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

  test('fetchCares: lê a lista e calcula os estados', () async {
    final service = CareService(
      api: ApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/tasks');
          return http.Response(
            jsonEncode({
              'tasks': [
                // Data muito antiga e por fazer: em atraso.
                {
                  'id': 't1',
                  'objectId': 'o1',
                  'objectName': 'Portátil',
                  'title': 'Limpar',
                  'dueOn': '2000-01-01',
                  'status': 'pending',
                },
                {
                  'id': 't2',
                  'objectId': 'o1',
                  'objectName': 'Portátil',
                  'title': 'Aspirar',
                  'dueOn': '2000-01-01',
                  'status': 'completed',
                },
              ],
            }),
            200,
          );
        }),
      ),
    );

    final cares = await service.fetchCares();

    expect(cares.length, 2);
    expect(cares[0].objectName, 'Portátil');
    expect(cares[0].isOverdue, isTrue);
    expect(cares[1].isDone, isTrue);
    // Concluído nunca está em atraso.
    expect(cares[1].isOverdue, isFalse);
  });

  test('isDueThisWeek: por fazer até daqui a 7 dias, com os em atraso', () {
    // Cria um cuidado com a data prevista daqui a [days] dias.
    Care careIn(int days, {bool isDone = false}) => Care(
      id: 't',
      objectId: 'o',
      objectName: 'Bicicleta',
      title: 'Lubrificar',
      dueOn: formatDateForApi(DateTime.now().add(Duration(days: days))),
      isDone: isDone,
    );

    expect(careIn(-3).isDueThisWeek, isTrue); // em atraso
    expect(careIn(7).isDueThisWeek, isTrue); // último dia da semana
    expect(careIn(8).isDueThisWeek, isFalse); // já fica para depois
    expect(careIn(0, isDone: true).isDueThisWeek, isFalse); // concluído
  });

  test('completeCare: envia POST /tasks/:id/complete', () async {
    late http.Request sentRequest;
    final service = CareService(
      api: ApiClient(
        client: MockClient((request) async {
          sentRequest = request;
          return http.Response(jsonEncode({'task': {}}), 200);
        }),
      ),
    );

    await service.completeCare('t1');

    expect(sentRequest.method, 'POST');
    expect(sentRequest.url.path, '/tasks/t1/complete');
  });
}
