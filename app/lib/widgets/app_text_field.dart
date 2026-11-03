import 'package:flutter/material.dart';

import '../theme/app_spacing.dart';

/// Campo de texto do KeepWell, igual ao componente "Forms/Text Field" do Figma:
/// um rótulo por cima e a caixa de texto por baixo.
///
/// Vai ser usado em todos os formulários (entrar, criar conta, objetos...),
/// por isso fica nesta pasta de widgets partilhados.
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.validator,
    this.onFieldSubmitted,
  });

  /// Texto por cima do campo (ex.: "Email").
  final String label;

  /// Guarda o que o utilizador escreveu, para o ecrã o poder ler.
  final TextEditingController controller;

  /// Texto de exemplo dentro do campo vazio (ex.: "nome@exemplo.pt").
  final String? hint;

  /// Tipo de teclado (email, números...).
  final TextInputType? keyboardType;

  /// Botão do teclado: "seguinte" ou "concluído".
  final TextInputAction? textInputAction;

  /// Esconde o texto com pontos (para palavras-passe).
  final bool obscureText;

  /// Verifica o valor: devolve uma mensagem de erro ou null se estiver certo.
  final String? Function(String?)? validator;

  /// O que acontece quando se carrega no botão do teclado.
  final void Function(String)? onFieldSubmitted;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          obscureText: obscureText,
          validator: validator,
          onFieldSubmitted: onFieldSubmitted,
          decoration: InputDecoration(hintText: hint),
        ),
      ],
    );
  }
}
