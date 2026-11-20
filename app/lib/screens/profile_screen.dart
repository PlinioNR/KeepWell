import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/house.dart';
import '../services/api_exception.dart';
import '../services/auth_service.dart';
import '../services/session.dart';
import '../theme/app_spacing.dart';
import '../utils/validators.dart';
import '../widgets/app_text_field.dart';
import 'house_screen.dart';
import 'welcome_screen.dart';

/// Separador Perfil = ecrã 14 Definições do Figma.
///
/// Muda o nome, mostra o email, abre A minha casa e tem o botão Sair.
/// Os interruptores Notificações e Modo escuro do Figma entram quando
/// essas funcionalidades existirem.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(text: Session.user?.name);
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  /// Guarda o nome novo na API.
  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _isSaving = true);
    try {
      await AuthService().updateName(_nameController.text.trim());
      messenger.showSnackBar(
        const SnackBar(content: Text('Alterações guardadas.')),
      );
    } on ApiException catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(error.message)));
    }
    if (mounted) setState(() => _isSaving = false);
  }

  /// Termina a sessão e volta ao ecrã Welcome.
  Future<void> _signOut() async {
    await AuthService().logout();
    if (!mounted) return;
    // rootNavigator: true fecha também a barra de separadores; apaga os
    // ecrãs anteriores para a seta "voltar" não regressar à app.
    Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const WelcomeScreen()),
      (route) => false,
    );
  }

  /// Texto de ajuda por baixo de um campo (como no Figma).
  Widget _helpText(String help) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.xs),
      child: Text(
        help,
        style: Theme.of(context).textTheme.bodySmall
            ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final user = Session.user;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Definições'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            AppTextField(
              label: 'Nome',
              controller: _nameController,
              keyboardType: TextInputType.name,
              validator: (value) =>
                  validateRequired(value, 'Escreva o seu nome.'),
            ),
            _helpText('Como prefere ser identificado na aplicação.'),
            const SizedBox(height: AppSpacing.lg),
            // O email só se mostra: mudá-lo pede a palavra-passe atual.
            Text('Email', style: text.labelMedium),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(initialValue: user?.email, enabled: false),
            _helpText('Usado para os avisos da sua conta.'),
            const SizedBox(height: AppSpacing.lg),
            // Abre o ecrã 15 A minha casa.
            ListTile(
              tileColor: Theme.of(context).cardTheme.color,
              title: const Text('A minha casa'),
              subtitle: Text(House.roleLabels[user?.houseRole] ?? ''),
              trailing: const Icon(LucideIcons.chevronRight),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const HouseScreen()),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton(
                onPressed: _isSaving ? null : _save,
                child: const Text('GUARDAR ALTERAÇÕES'),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            // Sair não está no Figma, mas é preciso (requisito: logout).
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton(
                onPressed: _signOut,
                child: const Text('SAIR DA CONTA'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
