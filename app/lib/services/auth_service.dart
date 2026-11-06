import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/user.dart';
import 'api_config.dart';
import 'api_exception.dart';
import 'session.dart';

/// Faz os pedidos de conta à API: criar conta, entrar e sair.
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
    final response = await _postJson('/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });

    // 201 = "Created": a conta foi criada.
    if (response.statusCode == 201) return;

    throw ApiException(_errorMessage(response));
  }

  /// Entra na conta: POST /auth/login.
  ///
  /// Se correr bem, guarda o token e o utilizador na [Session].
  /// Se correr mal (ex.: palavra-passe errada), lança uma [ApiException].
  Future<void> login({required String email, required String password}) async {
    final response = await _postJson('/auth/login', {
      'email': email,
      'password': password,
    });

    if (response.statusCode != 200) {
      throw ApiException(_errorMessage(response));
    }

    // A API responde: {"token": "...", "user": {...}, ...}
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    Session.token = body['token'] as String;
    Session.user = User.fromJson(body['user'] as Map<String, dynamic>);
  }

  /// Sai da conta: POST /auth/logout.
  ///
  /// Primeiro apaga a sessão na app, por isso sair funciona sempre.
  /// Depois pede à API para apagar a sessão do lado dela. Se esse pedido
  /// falhar (ex.: sem rede), não faz mal: o token expira sozinho em 24 h.
  Future<void> logout() async {
    final token = Session.token;
    Session.clear();
    if (token == null) return;

    try {
      await _client
          .post(
            Uri.parse('$apiBaseUrl/auth/logout'),
            // O token vai neste cabeçalho para a API saber que sessão apagar.
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(_timeout);
    } catch (_) {
      // Ignoramos o erro de propósito (ver explicação acima).
    }
  }

  /// Envia um pedido POST com [data] em JSON e devolve a resposta.
  ///
  /// Trata aqui os problemas de rede, que são iguais em todos os pedidos.
  Future<http.Response> _postJson(String path, Map<String, String> data) async {
    try {
      return await _client
          .post(
            Uri.parse('$apiBaseUrl$path'),
            headers: {'Content-Type': 'application/json'},
            // jsonEncode transforma o mapa do Dart em texto JSON.
            body: jsonEncode(data),
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw const ApiException(
        'O servidor está a demorar a responder. Tente novamente.',
      );
    } on http.ClientException {
      // Sem rede, API desligada ou endereço errado.
      throw const ApiException(
        'Não foi possível ligar ao servidor. Verifique a ligação.',
      );
    }
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
