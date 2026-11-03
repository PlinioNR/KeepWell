/// Funções para verificar os campos dos formulários.
///
/// Todas seguem a mesma regra do Flutter: recebem o texto do campo e
/// devolvem uma mensagem de erro, ou null quando o valor está correto.
/// Ficam aqui para serem usadas em vários ecrãs sem repetir código.
library;

/// O campo não pode estar vazio. [message] é o erro a mostrar.
String? validateRequired(String? value, String message) {
  if (value == null || value.trim().isEmpty) return message;
  return null;
}

/// O email não pode estar vazio e tem de ter "@".
String? validateEmail(String? value) {
  final email = value?.trim() ?? '';
  if (email.isEmpty) return 'Escreva o seu email.';
  if (!email.contains('@')) return 'O email não é válido.';
  return null;
}

/// Palavra-passe de uma conta nova: pelo menos 8 caracteres.
String? validateNewPassword(String? value) {
  final password = value ?? '';
  if (password.isEmpty) return 'Escreva uma palavra-passe.';
  if (password.length < 8) return 'Use pelo menos 8 caracteres.';
  return null;
}
