import '../models/user.dart';

/// Guarda a sessão atual enquanto a app está aberta.
///
/// Depois do login, a API devolve um "token" (uma espécie de cartão de
/// acesso). Os pedidos seguintes enviam-no para a API saber quem somos.
///
/// Fica só em memória: ao fechar a app, é preciso entrar outra vez.
/// É a versão mais simples; guardar no telemóvel fica para mais tarde.
class Session {
  static String? token;
  static User? user;

  /// true se houver alguém com sessão iniciada.
  static bool get isLoggedIn => token != null;

  /// Apaga a sessão (usado ao sair).
  static void clear() {
    token = null;
    user = null;
  }
}
