/// Utilizador com sessão iniciada, tal como a API o devolve.
///
/// A API nunca envia a palavra-passe: só estes dados públicos.
class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  final String id;
  final String name;
  final String email;

  /// 'user' (utilizador comum) ou 'admin' (administrador).
  final String role;

  /// Atalho para saber se é administrador.
  bool get isAdmin => role == 'admin';

  /// Cria um User a partir do JSON da API, por exemplo:
  /// {"id": "...", "name": "Ana", "email": "ana@mail.pt", "role": "user"}
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
    );
  }
}
