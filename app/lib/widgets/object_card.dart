import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme/app_spacing.dart';
import '../utils/date_format.dart';
import 'object_photo.dart';

/// Cartão de um objeto na lista (componente Object Card do Figma).
///
/// Mostra a foto (ou um ícone, se não tiver), o nome, a categoria, a data
/// do próximo cuidado (se houver) e uma seta. O aspeto (fundo, borda e cantos)
/// vem do cardTheme em app_theme.dart.
class ObjectCard extends StatelessWidget {
  const ObjectCard({
    super.key,
    required this.objectId,
    required this.name,
    required this.category,
    this.photoUrl,
    this.nextCareDueOn,
    this.onTap,
  });

  /// Data do próximo cuidado ('AAAA-MM-DD'), ou null se não houver.
  final String? nextCareDueOn;

  /// Id do objeto, para a etiqueta da animação da foto.
  final String objectId;
  final String name;
  final String category;

  /// Caminho da foto na API, ou null se o objeto não tem foto.
  final String? photoUrl;

  /// O que acontece ao tocar no cartão (abrir o detalhe).
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
              // Quadrado da foto, 64 × 64. O Hero faz a foto "voar" e
              // crescer até ao Detalhe quando se toca no cartão.
              Hero(
                tag: ObjectPhoto.heroTag(objectId),
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: colors.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  // Corta a foto com os mesmos cantos arredondados.
                  clipBehavior: Clip.antiAlias,
                  child: ObjectPhoto(photoUrl: photoUrl),
                ),
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
                    // Linha coral (secondary) só se houver cuidado por fazer.
                    if (nextCareDueOn != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Próximo cuidado · ${formatApiDate(nextCareDueOn!)}',
                        style: text.bodySmall?.copyWith(
                          color: colors.secondary,
                        ),
                      ),
                    ],
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
