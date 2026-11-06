/// Categoria de objetos (ex.: "Eletrodomésticos"), criada pelo admin.
class Category {
  const Category({required this.id, required this.name, required this.icon});

  final String id;
  final String name;

  /// Nome do ícone Lucide escolhido pelo admin (ex.: 'plug', 'bike').
  final String icon;

  /// Cria uma Category a partir do JSON da API.
  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String,
    );
  }
}
