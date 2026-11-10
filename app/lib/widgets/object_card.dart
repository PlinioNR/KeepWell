import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../services/api_client.dart';
import '../theme/app_spacing.dart';

/// Cartão de um objeto na lista (componente Object Card do Figma).
///
/// Mostra a foto (ou um ícone, se não tiver), o nome, a categoria e uma
/// seta. O aspeto (fundo, borda e cantos)
/// vem do cardTheme em app_theme.dart.
class ObjectCard extends StatelessWidget {
  const ObjectCard({
    super.key,
    required this.name,
    required this.category,
    this.photoUrl,
    this.onTap,
  });

  final String name;
  final String category;

  /// Endereço completo da foto na API, ou null se o objeto não tem foto.
  final String? photoUrl;

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
                // Corta a foto com os mesmos cantos arredondados.
                clipBehavior: Clip.antiAlias,
                child: photoUrl == null
                    ? const Icon(LucideIcons.package)
                    // A foto também precisa do token para ser vista.
                    // Se falhar a carregar, mostra o ícone (errorBuilder).
                    : Image.network(
                        photoUrl!,
                        headers: ApiClient.authHeader,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(LucideIcons.package),
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
