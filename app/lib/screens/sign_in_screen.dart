import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme/app_spacing.dart';
import '../utils/validators.dart';
import '../widgets/app_text_field.dart';
import 'sign_up_screen.dart';

/// Ecrã 02 Sign In: o utilizador entra com o email e a palavra-passe.
///
/// É um StatefulWidget porque guarda o que se escreve nos campos e
/// tem de verificar esses valores quando se carrega em "Entrar".
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

/// O "estado" do ecrã: os dados que podem mudar enquanto está aberto.
class _SignInScreenState extends State<SignInScreen> {
  // Chave do formulário: permite validar todos os campos de uma vez.
  final _formKey = GlobalKey<FormState>();

  // Controladores: guardam o texto escrito em cada campo.
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  // Quando o ecrã fecha, libertamos os controladores da memória.
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Corre quando se carrega em "Entrar".
  void _signIn() {
    // validate() corre o validator de cada campo e mostra os erros.
    final isValid = _formKey.currentState!.validate();
    if (!isValid) return;

    // A ligação à API ainda não existe. Por agora só confirmamos que
    // o formulário está válido.
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Dados válidos. Falta ligar à API.')),
    );
  }


  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        // Seta para voltar ao ecrã anterior (Welcome).
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          tooltip: 'Voltar',
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Entrar'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // A lista pode deslizar: quando o teclado abre, nada fica tapado.
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: [
                    Text('Bem-vindo de volta', style: text.headlineMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Entre para gerir os seus objetos e cuidados.',
                      style: text.bodyLarge?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      label: 'Email',
                      hint: 'nome@exemplo.pt',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      validator: validateEmail,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      label: 'Palavra-passe',
                      hint: '••••••••',
                      controller: _passwordController,
                      obscureText: true,
                      textInputAction: TextInputAction.done,
                      validator: (value) =>
                          validateRequired(value, 'Escreva a palavra-passe.'),
                      onFieldSubmitted: (_) => _signIn(),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    FilledButton(
                      onPressed: _signIn,
                      child: const Text('ENTRAR'),
                    ),
                  ],
                ),
              ),
            ),
            // Rodapé fixo em baixo, fora da lista.
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Ainda não tem conta?',
                    style: text.bodyLarge?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  TextButton(
                    // Troca este ecrã pelo Criar conta (não empilha ecrãs).
                    onPressed: () => Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SignUpScreen(),
                      ),
                    ),
                    child: const Text('CRIAR CONTA'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
