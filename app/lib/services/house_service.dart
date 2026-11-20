import '../models/house.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'session.dart';

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

  /// Entra noutra casa com um código de convite: POST /house/join.
  ///
  /// Só funciona se a casa atual estiver vazia (senão a API dá 409).
  Future<void> join(String code) async {
    await _api.post('/house/join', {'code': code});
    await _refreshUser();
  }

  /// Gestor ou membro sai da casa e fica com uma casa nova: POST /house/leave.
  Future<void> leave() async {
    await _api.post('/house/leave', {});
    await _refreshUser();
  }

  /// Depois de mudar de casa, o papel muda: pede outra vez o utilizador
  /// (GET /auth/me) e guarda-o na sessão.
  Future<void> _refreshUser() async {
    final body = await _api.get('/auth/me');
    Session.user = User.fromJson(body['user'] as Map<String, dynamic>);
  }
}
