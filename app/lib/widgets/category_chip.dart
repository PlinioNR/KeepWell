import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme/app_spacing.dart';

/// Chip de categoria para filtrar listas (componente Category Chip do Figma).
///
/// Tem dois estados: normal (fundo creme, borda fina) e selecionado
/// (fundo azul-marinho, texto claro e um ✓ antes do nome).
class CategoryChip extends StatelessWidget {
  const CategoryChip({
    super.key,
    required this.label,
    required this.selected,
    this.onTap,
  });

  final String label;
  final bool selected;

  /// null = só mostra a categoria, sem se poder tocar (ex.: no detalhe).
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    // Cores conforme o estado (o "? :" escolhe entre duas opções).
    final background = selected ? colors.primary : theme.cardTheme.color;
    final border = selected ? colors.primary : colors.outlineVariant;
    final foreground = selected ? colors.onPrimary : colors.onSurface;

    // Material + InkWell: fundo arredondado com efeito de toque.
    return Material(
      color: background,
      shape: StadiumBorder(side: BorderSide(color: border)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          // Altura mínima de 44 para ser fácil de tocar (como no Figma).
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // "if" dentro da lista: o ✓ só aparece quando está selecionado.
              if (selected) ...[
                Icon(LucideIcons.check, size: 16, color: foreground),
                const SizedBox(width: AppSpacing.sm),
              ],
              Text(
                label,
                style: theme.textTheme.labelMedium?.copyWith(color: foreground),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
