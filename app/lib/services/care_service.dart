import '../models/care.dart';
import 'api_client.dart';

/// Pedidos à API sobre cuidados (na API chamam-se "tasks").
class CareService {
  /// [api] só é passado nos testes.
  CareService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  /// Lista os cuidados de quem tem sessão iniciada: GET /tasks.
  ///
  /// Vêm ordenados pela data prevista. Pedimos até 100 (o máximo da API)
  /// para não termos de programar "carregar mais".
  Future<List<Care>> fetchCares() async {
    final body = await _api.get('/tasks?pageSize=100');
    final list = body['tasks'] as List;
    return list
        .map((json) => Care.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Cria um cuidado para um objeto: POST /tasks.
  ///
  /// [dueOn] é a data prevista em 'AAAA-MM-DD'.
  Future<void> createCare({
    required String objectId,
    required String title,
    required String dueOn,
  }) {
    return _api.post('/tasks', {
      'objectId': objectId,
      'title': title,
      'dueOn': dueOn,
    });
  }

  /// Marca um cuidado como concluído: POST /tasks/:id/complete.
  ///
  /// A API guarda a data de realização e, se o cuidado se repetir,
  /// cria logo o seguinte. O {} é o corpo vazio (sem observações).
  Future<void> completeCare(String id) => _api.post('/tasks/$id/complete', {});
}
