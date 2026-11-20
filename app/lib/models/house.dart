/// Uma pessoa da casa, com o seu papel.
class HouseMember {
  const HouseMember({required this.id, required this.name, required this.role});

  final String id;
  final String name;

  /// 'owner', 'manager' ou 'member' (como vem da API).
  final String role;

  /// Nome do papel para mostrar no ecrã.
  String get roleLabel => House.roleLabels[role] ?? role;

  factory HouseMember.fromJson(Map<String, dynamic> json) {
    return HouseMember(
      id: json['id'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
    );
  }
}

/// A casa de quem tem sessão iniciada, tal como GET /house a devolve.
class House {
  const House({
    required this.name,
    required this.members,
    this.inviteCode,
    this.inviteExpiresAt,
  });

  final String name;
  final List<HouseMember> members;

  /// Código de convite. null se ainda não foi gerado ou se a pessoa é
  /// membro (a API só o mostra ao dono e ao gestor).
  final String? inviteCode;

  /// Data em que o código deixa de valer (texto da API, ex.: '2026-11-27T…').
  final String? inviteExpiresAt;

  /// Papéis da API → nomes em português.
  static const roleLabels = {
    'owner': 'Dono',
    'manager': 'Gestor',
    'member': 'Membro',
  };

  factory House.fromJson(Map<String, dynamic> json) {
    final house = json['house'] as Map<String, dynamic>;
    final invite = json['invite'] as Map<String, dynamic>?;
    return House(
      name: house['name'] as String,
      members: (json['members'] as List)
          .map((member) => HouseMember.fromJson(member as Map<String, dynamic>))
          .toList(),
      inviteCode: invite?['code'] as String?,
      inviteExpiresAt: invite?['expiresAt'] as String?,
    );
  }
}
