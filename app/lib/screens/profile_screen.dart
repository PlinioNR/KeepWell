import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/session.dart';
import '../theme/app_spacing.dart';
import 'welcome_screen.dart';

/// Separador Perfil — VERSÃO PROVISÓRIA.
///
/// Mostra quem está com sessão iniciada e o botão Sair. Vai ser
/// substituído pelo ecrã 14 Settings do Figma.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  /// Termina a sessão e volta ao ecrã Welcome.
  Future<void> _signOut(BuildContext context) async {
    await AuthService().logout();

    // Depois de um "await", confirmamos que o ecrã ainda está aberto.
    if (!context.mounted) return;
    // rootNavigator: true fecha também a barra de separadores.
    // Abre o Welcome e apaga os ecrãs anteriores, para a seta "voltar"
    // não regressar à app depois de sair.
    Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const WelcomeScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;
    final user = Session.user;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Perfil'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(user?.name ?? '', style: text.headlineSmall),
          const SizedBox(height: AppSpacing.xs),
          Text(
            user?.email ?? '',
            style: text.bodyLarge?.copyWith(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: AppSpacing.lg),
          OutlinedButton(
            onPressed: () => _signOut(context),
            child: const Text('SAIR'),
          ),
        ],
      ),
    );
  }
}
