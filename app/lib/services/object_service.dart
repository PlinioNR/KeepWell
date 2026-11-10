import '../models/category.dart';
import '../models/user_object.dart';
import 'api_client.dart';

/// Pedidos à API sobre objetos e categorias.
class ObjectService {
  /// [api] só é passado nos testes.
  ObjectService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  /// Lista os objetos de quem tem sessão iniciada: GET /objects.
  ///
  /// A API devolve 20 de cada vez; pedimos até 100 para não termos de
  /// programar "carregar mais" (chega bem para a demonstração).
  Future<List<UserObject>> fetchObjects() async {
    final body = await _api.get('/objects?pageSize=100');
    final list = body['objects'] as List;
    // Transforma cada mapa JSON num UserObject.
    return list
        .map((json) => UserObject.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Cria um objeto novo: POST /objects.
  ///
  /// [acquiredOn] é a data de aquisição em 'AAAA-MM-DD', ou null.
  /// Devolve o objeto criado, já com o id que a API lhe deu.
  Future<UserObject> createObject({
    required String name,
    required String categoryId,
    String? acquiredOn,
  }) async {
    final body = await _api.post('/objects', {
      'name': name,
      'categoryId': categoryId,
      'acquiredOn': acquiredOn,
    });
    return UserObject.fromJson(body['object'] as Map<String, dynamic>);
  }

  /// Envia a fotografia de um objeto: PUT /objects/:id/photo.
  ///
  /// [filePath] é o caminho do ficheiro no telemóvel (vem da câmara).
  Future<UserObject> uploadPhoto(String objectId, String filePath) async {
    final body = await _api.putPhoto('/objects/$objectId/photo', filePath);
    return UserObject.fromJson(body['object'] as Map<String, dynamic>);
  }

  /// Lista todas as categorias: GET /categories.
  Future<List<Category>> fetchCategories() async {
    final body = await _api.get('/categories');
    final list = body['categories'] as List;
    return list
        .map((json) => Category.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
