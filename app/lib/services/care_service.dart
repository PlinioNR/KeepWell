import 'api_client.dart';

/// Pedidos à API sobre cuidados (na API chamam-se "tasks").
class CareService {
  /// [api] só é passado nos testes.
  CareService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

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
}
