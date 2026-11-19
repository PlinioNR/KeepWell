/// Utilizador autenticado e papel na sua casa, tal como a API os devolve.
class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.houseId,
    required this.houseRole,
  });

  final String id;
  final String name;
  final String email;
  final String houseId;
  final String houseRole;

  /// Dono e gestor podem gerir os cuidados e as dicas.
  bool get canManage => houseRole == 'owner' || houseRole == 'manager';

  /// Só o dono pode gerir os papéis e remover pessoas da casa.
  bool get isOwner => houseRole == 'owner';

  factory User.fromJson(Map<String, dynamic> json) {
    final houseRole = json['houseRole'];
    if (!['owner', 'manager', 'member'].contains(houseRole)) {
      throw const FormatException('Papel na casa inválido.');
    }
    return User(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      houseId: json['houseId'] as String,
      houseRole: houseRole as String,
    );
  }
}
