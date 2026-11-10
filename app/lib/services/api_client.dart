import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

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

  /// Cabeçalho com o token da sessão.
  ///
  /// É "static" para outros sítios o poderem usar sem criar um ApiClient
  /// (ex.: as fotos, que também precisam do token para serem vistas).
  static Map<String, String> get authHeader => {
    'Authorization': 'Bearer ${Session.token}',
  };

  /// Pede dados à API (GET) e devolve o JSON da resposta.
  ///
  /// Se correr mal, lança uma [ApiException] com a mensagem a mostrar.
  Future<Map<String, dynamic>> get(String path) {
    return _send(
      () => _client.get(Uri.parse('$apiBaseUrl$path'), headers: authHeader),
    );
  }

  /// Envia dados novos à API (POST) em JSON e devolve o JSON da resposta.
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> data) {
    return _send(
      () => _client.post(
        Uri.parse('$apiBaseUrl$path'),
        headers: {...authHeader, 'Content-Type': 'application/json'},
        // jsonEncode transforma o mapa do Dart em texto JSON.
        body: jsonEncode(data),
      ),
    );
  }

  /// Envia uma fotografia (PUT) no formato "multipart/form-data",
  /// que é o formato usado para enviar ficheiros, no campo "photo".
  Future<Map<String, dynamic>> putPhoto(String path, String filePath) {
    return _send(() async {
      final request =
          http.MultipartRequest('PUT', Uri.parse('$apiBaseUrl$path'))
            ..headers.addAll(authHeader)
            ..files.add(
              await http.MultipartFile.fromPath(
                'photo',
                filePath,
                // A API só aceita imagens; a câmara grava em JPEG.
                contentType: MediaType('image', 'jpeg'),
              ),
            );
      // send() devolve a resposta "aos bocados"; fromStream junta-a toda.
      return http.Response.fromStream(await _client.send(request));
    });
  }

  /// Faz o pedido, trata os erros de rede e lê a resposta.
  ///
  /// [request] é uma função que faz o pedido; assim o GET e o POST
  /// partilham o mesmo tratamento de erros.
  Future<Map<String, dynamic>> _send(
    Future<http.Response> Function() request,
  ) async {
    final http.Response response;

    try {
      response = await request().timeout(_timeout);
    } on TimeoutException {
      throw const ApiException(
        'O servidor está a demorar a responder. Tente novamente.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Não foi possível ligar ao servidor. Verifique a ligação.',
      );
    }

    // 200 = "OK" e 201 = "Created": o pedido correu bem.
    if (response.statusCode == 200 || response.statusCode == 201) {
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
