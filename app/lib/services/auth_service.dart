import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_config.dart';
import 'api_exception.dart';

/// Faz os pedidos de conta à API (criar conta; mais tarde entrar e sair).
///
/// Os ecrãs não falam diretamente com a API: chamam este serviço.
/// Assim, o código HTTP fica todo num sítio e os ecrãs ficam simples.
class AuthService {
  /// [client] só é passado nos testes, para simular a API sem Internet.
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// Tempo máximo de espera por uma resposta da API.
  static const _timeout = Duration(seconds: 10);

  /// Cria uma conta nova: POST /auth/register.
  ///
  /// Se correr bem, termina sem devolver nada.
  /// Se correr mal, lança uma [ApiException] com a mensagem a mostrar.
  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final http.Response response;

    try {
      response = await _client
          .post(
            Uri.parse('$apiBaseUrl/auth/register'),
            headers: {'Content-Type': 'application/json'},
            // jsonEncode transforma o mapa do Dart em texto JSON.
            body: jsonEncode({
              'name': name,
              'email': email,
              'password': password,
            }),
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw const ApiException(
          'O servidor está a demorar a responder. Tente novamente.');
    } on http.ClientException {
      // Sem rede, API desligada ou endereço errado.
      throw const ApiException(
          'Não foi possível ligar ao servidor. Verifique a ligação.');
    }

    // 201 = "Created": a conta foi criada.
    if (response.statusCode == 201) return;

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
