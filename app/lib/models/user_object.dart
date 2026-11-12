/// Objeto registado por um utilizador (ex.: "Bicicleta urbana").
///
/// Chama-se UserObject e não "Object" porque "Object" já é um nome
/// reservado do Dart (é a classe de onde vêm todas as outras).
class UserObject {
  const UserObject({
    required this.id,
    required this.name,
    required this.categoryId,
    this.acquiredOn,
    this.photoUrl,
    this.description,
    this.nextCareTitle,
    this.nextCareDueOn,
  });

  final String id;
  final String name;

  /// Id da categoria. O nome da categoria vem do pedido /categories.
  final String categoryId;

  /// Data de aquisição no formato 'AAAA-MM-DD', ou null se não foi indicada.
  final String? acquiredOn;

  /// Caminho da foto na API (ex.: '/objects/123/photo'), ou null sem foto.
  final String? photoUrl;

  /// Descrição livre do objeto, ou null.
  final String? description;

  /// Próximo cuidado por fazer (título e data 'AAAA-MM-DD'), ou null.
  /// A API manda-o na lista de objetos, dentro de "nextCare".
  final String? nextCareTitle;
  final String? nextCareDueOn;

  /// Cria um UserObject a partir do JSON da API.
  factory UserObject.fromJson(Map<String, dynamic> json) {
    // "nextCare" pode não vir (ex.: ao criar) ou vir null.
    final nextCare = json['nextCare'] as Map<String, dynamic>?;
    return UserObject(
      id: json['id'] as String,
      name: json['name'] as String,
      categoryId: json['categoryId'] as String,
      acquiredOn: json['acquiredOn'] as String?,
      photoUrl: json['photoUrl'] as String?,
      description: json['description'] as String?,
      nextCareTitle: nextCare?['title'] as String?,
      nextCareDueOn: nextCare?['dueOn'] as String?,
    );
  }
}
