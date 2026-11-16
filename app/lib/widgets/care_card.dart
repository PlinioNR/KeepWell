import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/care.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';

/// Cartão de um cuidado na lista (componente Care Item do Figma).
///
/// Mostra um círculo (vazio, ou verde com ✓ se concluído), o título,
/// "objeto · data" e uma etiqueta com o estado: Pendente, Em atraso ou
/// Concluído. O fundo, a borda e os cantos vêm do cardTheme.
class CareCard extends StatelessWidget {
  const CareCard({super.key, required this.care});

  final Care care;

  // Tamanho do círculo e dos ícones pequenos (como no Figma).
  static const _circleSize = 24.0;
  static const _smallIconSize = 16.0;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    // Texto, ícone e cores da etiqueta, conforme o estado.
    // "(a, b, c, d)" é um record: junta vários valores num só.
    // As cores de estado são as do Figma (iguais nos modos claro e escuro).
    final (label, icon, color, background) = care.isDone
        ? (
            'Concluído',
            LucideIcons.circleCheck,
            AppColors.success600,
            AppColors.success100,
          )
        : care.isOverdue
        ? (
            'Em atraso',
            LucideIcons.circleAlert,
            AppColors.danger600,
            AppColors.danger100,
          )
        : ('Pendente', LucideIcons.clock, AppColors.info600, AppColors.info100);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Círculo: verde com ✓ se concluído, vazio se não.
            care.isDone
                ? const CircleAvatar(
                    radius: _circleSize / 2,
                    backgroundColor: AppColors.success600,
                    child: Icon(
                      LucideIcons.check,
                      size: _smallIconSize,
                      color: AppColors.white,
                    ),
                  )
                : Icon(
                    LucideIcons.circle,
                    size: _circleSize,
                    color: colors.onSurfaceVariant,
                  ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    care.title,
                    // Concluído: título mais claro, como no Figma.
                    style: text.bodyLarge?.copyWith(
                      color: care.isDone ? colors.onSurfaceVariant : null,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    '${care.objectName} · ${formatApiDate(care.dueOn)}',
                    style: text.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  // Etiqueta de estado (Status Badge do Figma).
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: Row(
                      // Só ocupa a largura do texto.
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: _smallIconSize, color: color),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          label,
                          style: text.labelMedium?.copyWith(color: color),
                        ),
                      ],
                    ),
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
