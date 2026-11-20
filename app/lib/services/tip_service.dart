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

  /// Cria uma dica (POST /tips) ou, se tiver [id], altera-a (PATCH /tips/:id).
  ///
  /// [videoUrl] vazio fica sem vídeo (a API guarda null).
  Future<void> saveTip({
    String? id,
    required String objectId,
    required String title,
    required String text,
    required String videoUrl,
  }) {
    final body = {
      'objectId': objectId,
      'title': title,
      'text': text,
      'videoUrl': videoUrl,
    };
    return id == null
        ? _api.post('/tips', body)
        : _api.patch('/tips/$id', body);
  }

  /// Elimina uma dica: DELETE /tips/:id.
  Future<void> deleteTip(String id) => _api.delete('/tips/$id');
}
