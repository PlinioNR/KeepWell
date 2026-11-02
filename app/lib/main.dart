import 'package:flutter/material.dart';

import 'screens/welcome_screen.dart';
import 'theme/app_theme.dart';

/// Ponto de entrada: é a primeira função que corre quando a app abre.
void main() {
  runApp(const KeepWellApp());
}

/// A app em si: liga o tema (claro e escuro) e escolhe o primeiro ecrã.
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
      home: const WelcomeScreen(),
    );
  }
}
