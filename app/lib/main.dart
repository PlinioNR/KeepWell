import 'package:flutter/material.dart';

import 'theme/app_spacing.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const KeepWellApp());
}

class KeepWellApp extends StatelessWidget {
  const KeepWellApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KeepWell',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      // Por agora segue o modo do telemóvel; o interruptor do ecrã
      // Definições vem mais tarde.
      themeMode: ThemeMode.system,
      home: const ThemePreviewScreen(),
    );
  }
}

/// Ecrã temporário para verificar o tema. Sai quando houver ecrãs reais.
class ThemePreviewScreen extends StatelessWidget {
  const ThemePreviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Tema KeepWell')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text('H1 Título', style: text.headlineLarge),
          Text('H2 Secção', style: text.headlineMedium),
          Text('H3 Subtítulo', style: text.headlineSmall),
          Text('Title', style: text.titleLarge),
          Text('Body — texto corrente', style: text.bodyLarge),
          Text('Body Small — metadados', style: text.bodyMedium),
          Text('Caption — 12 out 2026', style: text.bodySmall),
          const SizedBox(height: AppSpacing.lg),
          const TextField(
            decoration: InputDecoration(hintText: 'Ex.: Máquina de café'),
          ),
          const SizedBox(height: AppSpacing.lg),
          FilledButton(onPressed: () {}, child: const Text('GUARDAR OBJETO')),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(onPressed: () {}, child: const Text('VER HISTÓRICO')),
          const SizedBox(height: AppSpacing.sm),
          const FilledButton(onPressed: null, child: Text('DESATIVADO')),
        ],
      ),
    );
  }
}
