import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme/app_spacing.dart';

/// Cartão de um objeto na lista (componente Object Card do Figma).
///
/// Mostra a foto (por agora um ícone, porque a API ainda não guarda fotos),
/// o nome, a categoria e uma seta. O aspeto (fundo, borda e cantos)
/// vem do cardTheme em app_theme.dart.
class ObjectCard extends StatelessWidget {
  const ObjectCard({
    super.key,
    required this.name,
    required this.category,
    this.onTap,
  });

  final String name;
  final String category;

  /// O que acontece ao tocar no cartão (mais tarde: abrir o detalhe).
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    return Card(
      // InkWell dá o efeito de toque e chama onTap.
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              // Quadrado da foto, 64 × 64.
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: colors.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(LucideIcons.package),
              ),
              const SizedBox(width: AppSpacing.md),
              // Expanded ocupa o espaço livre; nomes longos ficam com "…".
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: text.labelMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      category,
                      style: text.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(LucideIcons.chevronRight),
            ],
          ),
        ),
      ),
    );
  }
}
