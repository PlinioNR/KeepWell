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

  /// Gera um código de convite novo (substitui o anterior): POST /house/invite.
  Future<void> generateInvite() => _api.post('/house/invite', {});

  /// O dono muda o papel de alguém para 'manager' ou 'member'.
  Future<void> changeRole(String userId, String role) =>
      _api.patch('/house/members/$userId', {'role': role});

  /// O dono remove alguém da casa (a pessoa fica com uma casa nova, vazia).
  Future<void> removeMember(String userId) =>
      _api.delete('/house/members/$userId');
}
