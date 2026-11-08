/// Erro devolvido pela comunicação com a API.
///
/// Guarda uma mensagem em português, pronta a mostrar ao utilizador.
class ApiException implements Exception {
  const ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}
