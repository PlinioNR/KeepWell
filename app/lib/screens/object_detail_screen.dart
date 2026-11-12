import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/category.dart';
import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/object_service.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';
import '../widgets/category_chip.dart';
import '../widgets/object_photo.dart';
import 'add_object_screen.dart';

/// Ecrã 08 Object Detail: mostra os dados de um objeto.
///
/// Recebe o objeto e o nome da categoria do ecrã Objetos (que já os tem),
/// por isso não faz pedidos à API para mostrar os dados. Não guarda
/// estado que mude: é um StatelessWidget.
///
/// Se o objeto for editado ou eliminado, fecha e devolve a mensagem a
/// mostrar na lista (ex.: 'Objeto eliminado.'), para ela se atualizar.
class ObjectDetailScreen extends StatelessWidget {
  const ObjectDetailScreen({
    super.key,
    required this.object,
    required this.categoryName,
    required this.categories,
  });

  final UserObject object;
  final String categoryName;

  /// Todas as categorias, para o formulário de edição.
  final List<Category> categories;

  // Medidas da caixa da foto (como no Figma).
  static const _photoHeight = 200.0;
  static const _photoIconSize = 64.0;

  /// Abre o formulário a editar este objeto.
  Future<void> _edit(BuildContext context) async {
    final message = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) =>
            AddObjectScreen(categories: categories, object: object),
      ),
    );
    // Se guardou, volta à lista com a mensagem (a lista atualiza-se).
    if (message != null && context.mounted) Navigator.pop(context, message);
  }

  /// Pergunta se quer mesmo eliminar e, se sim, pede à API.
  Future<void> _delete(BuildContext context) async {
    // showDialog espera pela resposta: true (Eliminar) ou null (Cancelar).
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar objeto?'),
        content: Text('"${object.name}" vai ser eliminado.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCELAR'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('ELIMINAR'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ObjectService().deleteObject(object.id);
      if (context.mounted) Navigator.pop(context, 'Objeto eliminado.');
    } on ApiException catch (error) {
      // Ex.: a API recusa se o objeto tiver cuidados associados.
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

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
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.pencil),
            tooltip: 'Editar objeto',
            onPressed: () => _edit(context),
          ),
          IconButton(
            icon: const Icon(LucideIcons.trash2),
            tooltip: 'Eliminar objeto',
            onPressed: () => _delete(context),
          ),
        ],
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
                  if (object.description.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(object.description, style: secondaryText),
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
