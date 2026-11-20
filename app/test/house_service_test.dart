import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:keepwell/services/api_client.dart';
import 'package:keepwell/services/house_service.dart';

/// Testes do HouseService com uma API "a fingir" (MockClient).
void main() {
  /// Serviço cuja API responde sempre com [body] em GET /house.
  HouseService serviceReturning(Map<String, dynamic> body) {
    return HouseService(
      api: ApiClient(
        client: MockClient((request) async {
          expect(request.method, 'GET');
          expect(request.url.path, '/house');
          return http.Response(jsonEncode(body), 200);
        }),
      ),
    );
  }

  test('fetchHouse: lê nome, membros com papel e convite', () async {
    final house = await serviceReturning({
      'house': {'id': 'h1', 'name': 'Casa do Rafael'},
      'role': 'owner',
      'members': [
        {'id': 'u1', 'name': 'Rafael', 'email': 'r@x.pt', 'role': 'owner'},
        {'id': 'u2', 'name': 'Bruno', 'email': 'b@x.pt', 'role': 'member'},
      ],
      'invite': {'code': 'K7PM3QXA', 'expiresAt': '2026-11-27T10:00:00.000Z'},
    }).fetchHouse();

    expect(house.name, 'Casa do Rafael');
    expect(house.members.length, 2);
    expect(house.members[0].roleLabel, 'Dono');
    expect(house.members[1].roleLabel, 'Membro');
    expect(house.inviteCode, 'K7PM3QXA');
  });

  test('fetchHouse: sem convite (membro) fica sem código', () async {
    final house = await serviceReturning({
      'house': {'id': 'h1', 'name': 'Casa do Rafael'},
      'role': 'member',
      'members': [
        {'id': 'u2', 'name': 'Bruno', 'email': 'b@x.pt', 'role': 'member'},
      ],
    }).fetchHouse();

    expect(house.inviteCode, isNull);
  });
}
