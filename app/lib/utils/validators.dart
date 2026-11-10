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

/// Palavra-passe de uma conta nova: de 6 a 20 caracteres, sem espaços.
/// É a mesma regra da API (api/src/services/registration.js); se mudar
/// num lado, tem de mudar no outro.
String? validateNewPassword(String? value) {
  final password = value ?? '';
  if (password.isEmpty) return 'Escreva uma palavra-passe.';
  if (password.length < 6) return 'Use pelo menos 6 caracteres.';
  if (password.length > 20) return 'Use no máximo 20 caracteres.';
  // \s apanha qualquer espaço em branco: espaço, tabulação ou mudança de linha.
  if (password.contains(RegExp(r'\s'))) return 'Não use espaços.';
  return null;
}

/// Nome de um objeto: obrigatório, entre 2 e 100 caracteres (regra da API).
String? validateObjectName(String? value) {
  final name = value?.trim() ?? '';
  if (name.isEmpty) return 'Escreva o nome do objeto.';
  if (name.length < 2) return 'Use pelo menos 2 caracteres.';
  if (name.length > 100) return 'Use no máximo 100 caracteres.';
  return null;
}
