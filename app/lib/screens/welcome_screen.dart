import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import 'sign_in_screen.dart';

/// Ecrã 01 Welcome: a primeira coisa que o utilizador vê.
///
/// Mostra o logótipo, o nome e a frase da app, e dois botões:
/// "Entrar" (quem já tem conta) e "Criar conta" (quem é novo).
///
/// É um StatelessWidget porque nada neste ecrã muda depois de aparecer.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      // SafeArea afasta o conteúdo da barra de estado e dos botões do sistema.
      body: SafeArea(
        child: Padding(
          // Margens do Figma: 48 em cima, 16 dos lados, 32 em baixo.
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.xxl,
            AppSpacing.md,
            AppSpacing.xl,
          ),
          child: Column(
            children: [
              // Expanded ocupa todo o espaço livre, empurrando os botões
              // para o fundo e deixando o logótipo centrado.
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // O logótipo já inclui o nome "Keep Well", por isso
                    // não repetimos o nome em texto.
                    const _Logo(),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Cuide dos seus objetos e faça-os durar mais tempo.',
                      textAlign: TextAlign.center,
                      style: text.bodyLarge?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                // Abre o ecrã Entrar por cima deste (a seta "voltar" regressa).
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SignInScreen()),
                ),
                child: const Text('ENTRAR'),
              ),
              const SizedBox(height: AppSpacing.md),
              OutlinedButton(
                // O ecrã "Criar conta" ainda não existe; a navegação vem a seguir.
                onPressed: () {},
                child: const Text('CRIAR CONTA'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Logótipo do KeepWell (imagem em assets/images/logo.png).
///
/// O "_" no início do nome torna a classe privada: só este ficheiro a usa.
class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) {
    // O logótipo é azul-marinho. No modo escuro o fundo também é escuro,
    // por isso pintamos a imagem toda de creme para continuar visível.
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Image.asset(
      'assets/images/logo.png',
      height: 160,
      color: isDark ? AppColors.secondary100 : null,
      // Explicação para leitores de ecrã (acessibilidade).
      semanticLabel: 'Logótipo KeepWell',
    );
  }
}
