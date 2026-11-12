import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/user_object.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';
import '../widgets/category_chip.dart';
import '../widgets/object_photo.dart';

/// Ecrã 08 Object Detail: mostra os dados de um objeto.
///
/// Recebe o objeto e o nome da categoria do ecrã Objetos (que já os tem),
/// por isso não faz pedidos à API. Só mostra dados: é um StatelessWidget.
class ObjectDetailScreen extends StatelessWidget {
  const ObjectDetailScreen({
    super.key,
    required this.object,
    required this.categoryName,
  });

  final UserObject object;
  final String categoryName;

  // Medidas da caixa da foto (como no Figma).
  static const _photoHeight = 200.0;
  static const _photoIconSize = 64.0;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;
    final secondaryText = text.bodyLarge?.copyWith(
      color: colors.onSurfaceVariant,
    );

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          tooltip: 'Voltar',
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Detalhe'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Conteúdo que desliza, se não couber no ecrã.
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  Container(
                    height: _photoHeight,
                    decoration: BoxDecoration(
                      color: colors.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: ObjectPhoto(
                      photoUrl: object.photoUrl,
                      iconSize: _photoIconSize,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(object.name, style: text.headlineSmall),
                  const SizedBox(height: AppSpacing.sm),
                  // Align impede o chip de esticar a toda a largura.
                  Align(
                    alignment: Alignment.centerLeft,
                    child: CategoryChip(label: categoryName, selected: false),
                  ),
                  // Descrição e data só aparecem se existirem.
                  if (object.description != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(object.description!, style: secondaryText),
                  ],
                  if (object.acquiredOn != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Adquirido em ${formatApiDate(object.acquiredOn!)}',
                      style: secondaryText,
                    ),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  Text('Próximo cuidado', style: text.titleLarge),
                  const SizedBox(height: AppSpacing.sm),
                  object.nextCareTitle == null
                      ? Text('Sem cuidados por fazer.', style: secondaryText)
                      : ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(object.nextCareTitle!),
                          subtitle: Text(formatApiDate(object.nextCareDueOn!)),
                        ),
                ],
              ),
            ),
            // Botões fixos em baixo, como no Figma.
            // onPressed: null = desativado; ligam-se quando houver os
            // ecrãs de cuidados (11 Add Care) e de histórico (09).
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const FilledButton(
                    onPressed: null,
                    child: Text('ADICIONAR CUIDADO'),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  const OutlinedButton(
                    onPressed: null,
                    child: Text('VER HISTÓRICO'),
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
