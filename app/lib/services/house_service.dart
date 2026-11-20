import '../models/house.dart';
import 'api_client.dart';

/// Pedidos à API sobre a casa de quem tem sessão iniciada.
class HouseService {
  /// [api] só é passado nos testes.
  HouseService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  /// Nome da casa, membros e (para dono e gestor) o convite: GET /house.
  Future<House> fetchHouse() async {
    return House.fromJson(await _api.get('/house'));
  }
}
