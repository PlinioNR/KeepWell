import 'package:flutter/material.dart';

import '../services/session.dart';
import '../theme/app_spacing.dart';

/// Ecrã 05 Home — VERSÃO PROVISÓRIA.
///
/// Por agora só confirma que o login funcionou, mostrando o nome de quem
/// entrou. Vai ser substituído pelo ecrã Home do Figma no próximo passo.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    // O "?" e o "??" evitam erro se, por algum motivo, não houver utilizador.
    final name = Session.user?.name ?? '';

    return Scaffold(
      appBar: AppBar(title: const Text('Início')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Text('Olá, $name', style: text.headlineMedium),
      ),
    );
  }
}
