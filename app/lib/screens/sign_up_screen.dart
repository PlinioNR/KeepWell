import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../services/api_exception.dart';
import '../services/auth_service.dart';
import '../theme/app_spacing.dart';
import '../utils/validators.dart';
import '../widgets/app_text_field.dart';
import 'sign_in_screen.dart';

/// Ecrã 03 Sign Up: cria uma conta nova de utilizador comum.
///
/// É um StatefulWidget porque guarda o que se escreve nos campos e
/// se a caixa dos termos está marcada.
class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  // Se a caixa "Aceito os termos" está marcada.
  bool _acceptedTerms = false;

  // Se devemos mostrar o erro dos termos (só depois de tentar criar a conta).
  bool _showTermsError = false;

  // Se estamos à espera da resposta da API (o botão mostra um "a carregar").
  bool _isLoading = false;

  // Serviço que faz os pedidos de conta à API.
  final _authService = AuthService();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Corre quando se carrega em "Criar conta".
  ///
  /// É "async" porque tem de esperar ("await") pela resposta da API.
  Future<void> _signUp() async {
    final fieldsAreValid = _formKey.currentState!.validate();

    // setState avisa o Flutter de que algo mudou e o ecrã tem de ser
    // redesenhado (aqui: mostrar ou esconder o erro dos termos).
    setState(() => _showTermsError = !_acceptedTerms);

    if (!fieldsAreValid || !_acceptedTerms) return;

    setState(() => _isLoading = true);

    try {
      await _authService.register(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      // Depois de um "await", o ecrã pode já ter sido fechado.
      // "mounted" confirma que ainda está aberto antes de o usarmos.
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Conta criada. Já pode entrar.')),
      );
      // Leva a pessoa para o ecrã Entrar.
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const SignInScreen()),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      // Mostra a mensagem da API (ex.: "Já existe uma conta com este email.").
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
      setState(() => _isLoading = false);
    }
  }

  /// Marca ou desmarca a caixa dos termos.
  void _toggleTerms() {
    setState(() {
      _acceptedTerms = !_acceptedTerms;
      // Se a pessoa marcar a caixa, o erro desaparece logo.
      if (_acceptedTerms) _showTermsError = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          tooltip: 'Voltar',
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Criar conta'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: [
                    Text('Crie a sua conta', style: text.headlineMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Comece a organizar os cuidados dos seus objetos.',
                      style: text.bodyLarge?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      label: 'Nome',
                      hint: 'O seu nome',
                      controller: _nameController,
                      keyboardType: TextInputType.name,
                      textInputAction: TextInputAction.next,
                      validator: (value) =>
                          validateRequired(value, 'Escreva o seu nome.'),
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
                      hint: '6 a 20 caracteres, sem espaços',
                      controller: _passwordController,
                      obscureText: true,
                      textInputAction: TextInputAction.done,
                      validator: validateNewPassword,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _TermsCheckbox(
                      value: _acceptedTerms,
                      showError: _showTermsError,
                      onTap: _toggleTerms,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    FilledButton(
                      // Enquanto espera pela API, o botão fica desativado
                      // (null) para não se criar a conta duas vezes.
                      onPressed: _isLoading ? null : _signUp,
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('CRIAR CONTA'),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Já tem conta?',
                    style: text.bodyLarge?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  TextButton(
                    // Troca este ecrã pelo Entrar (não empilha ecrãs).
                    onPressed: () => Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SignInScreen(),
                      ),
                    ),
                    child: const Text('ENTRAR'),
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

/// Caixa "Aceito os termos e a política de privacidade" (Forms/Checkbox).
///
/// Tocar na caixa ou no texto marca/desmarca. Se [showError] for true,
/// aparece uma mensagem a vermelho por baixo.
class _TermsCheckbox extends StatelessWidget {
  const _TermsCheckbox({
    required this.value,
    required this.showError,
    required this.onTap,
  });

  final bool value;
  final bool showError;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // InkWell torna a linha toda "tocável", não só o quadrado.
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: Row(
            children: [
              Checkbox(value: value, onChanged: (_) => onTap()),
              const SizedBox(width: AppSpacing.xs),
              Expanded(
                child: Text(
                  'Aceito os termos e a política de privacidade',
                  style: text.labelMedium,
                ),
              ),
            ],
          ),
        ),
        if (showError)
          Padding(
            padding: const EdgeInsets.only(left: AppSpacing.md),
            child: Text(
              'Tem de aceitar os termos para criar conta.',
              style: text.bodySmall?.copyWith(color: colors.error),
            ),
          ),
      ],
    );
  }
}
