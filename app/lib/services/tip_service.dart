import '../models/tip.dart';
import 'api_client.dart';

/// Pedidos à API sobre as dicas de cada objeto.
class TipService {
  /// [api] só é passado nos testes.
  TipService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  /// Dicas de um objeto: GET /tips?objectId=...
  ///
  /// Pedimos até 100 (o máximo da API) para não haver "carregar mais".
  Future<List<Tip>> fetchTips(String objectId) async {
    final body = await _api.get('/tips?objectId=$objectId&pageSize=100');
    final list = body['tips'] as List;
    return list
        .map((json) => Tip.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
