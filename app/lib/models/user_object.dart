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
  });

  final String id;
  final String name;

  /// Id da categoria. O nome da categoria vem do pedido /categories.
  final String categoryId;

  /// Data de aquisição no formato 'AAAA-MM-DD', ou null se não foi indicada.
  final String? acquiredOn;

  /// Cria um UserObject a partir do JSON da API.
  factory UserObject.fromJson(Map<String, dynamic> json) {
    return UserObject(
      id: json['id'] as String,
      name: json['name'] as String,
      categoryId: json['categoryId'] as String,
      acquiredOn: json['acquiredOn'] as String?,
    );
  }
}
