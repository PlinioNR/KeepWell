import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_config.dart';
import 'api_exception.dart';
import 'session.dart';

/// Faz pedidos à API em nome de quem tem sessão iniciada.
///
/// Junta sempre o token ao pedido (cabeçalho "Authorization"), para a API
/// saber quem somos. Os serviços de objetos, categorias, etc. usam-no.
class ApiClient {
  /// [client] só é passado nos testes, para simular a API sem Internet.
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _timeout = Duration(seconds: 10);

  /// Pede dados à API (GET) e devolve o JSON da resposta.
  ///
  /// Se correr mal, lança uma [ApiException] com a mensagem a mostrar.
  Future<Map<String, dynamic>> get(String path) async {
    final http.Response response;

    try {
      response = await _client
          .get(
            Uri.parse('$apiBaseUrl$path'),
            headers: {'Authorization': 'Bearer ${Session.token}'},
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw const ApiException(
        'O servidor está a demorar a responder. Tente novamente.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Não foi possível ligar ao servidor. Verifique a ligação.',
      );
    }

    // 200 = "OK": o pedido correu bem.
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }

    throw ApiException(_errorMessage(response));
  }

  /// Lê a mensagem de erro que a API envia em {"error": "..."}.
  String _errorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body['error'] is String) return body['error'];
    } on FormatException {
      // A resposta não era JSON; usamos a mensagem genérica abaixo.
    }
    return 'Ocorreu um erro (${response.statusCode}). Tente novamente.';
  }
}
