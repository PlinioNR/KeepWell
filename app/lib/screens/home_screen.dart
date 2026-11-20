import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/care.dart';
import '../models/category.dart';
import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/care_service.dart';
import '../services/object_service.dart';
import '../services/session.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';
import '../widgets/object_card.dart';
import 'object_detail_screen.dart';

/// Ecrã 05 Home (Início): saudação, resumo da semana, próximos cuidados
/// e alguns objetos.
///
/// Carrega cuidados, objetos e categorias ao abrir; puxar para baixo
/// volta a carregá-los. Tocar num cuidado ou objeto abre o Detalhe do objeto.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Care> _cares = [];
  List<UserObject> _objects = [];
  List<Category> _categories = [];

  // Quantos cuidados e objetos mostrar (como no Figma).
  static const _upcomingCount = 3;
  static const _objectCount = 2;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  /// Pede à API os cuidados (já ordenados por data), os objetos e as
  /// categorias (para mostrar o nome da categoria nos cartões).
  Future<void> _loadData() async {
    setState(() => _errorMessage = null);
    try {
      final cares = await CareService().fetchCares();
      final objects = await ObjectService().fetchObjects();
      final categories = await ObjectService().fetchCategories();
      if (!mounted) return;
      setState(() {
        _cares = cares;
        _objects = objects;
        _categories = categories;
        _isLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
        _isLoading = false;
      });
    }
  }

  /// Frase do resumo, no singular ou no plural.
  String _weekSummary() {
    final count = _cares.where((care) => care.isDueThisWeek).length;
    return switch (count) {
      0 => 'Não tem cuidados para fazer esta semana.',
      1 => 'Tem 1 cuidado para fazer esta semana.',
      _ => 'Tem $count cuidados para fazer esta semana.',
    };
  }

  /// Nome da categoria de um objeto.
  String _categoryName(UserObject object) =>
      _categories
          .where((category) => category.id == object.categoryId)
          .firstOrNull
          ?.name ??
      'Sem categoria';

  /// Abre o Detalhe do objeto; se lá se alterou algo, mostra a mensagem
  /// e recarrega o Início.
  Future<void> _openObject(UserObject object) async {
    final message = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) => ObjectDetailScreen(
          object: object,
          categoryName: _categoryName(object),
          categories: _categories,
        ),
      ),
    );
    if (message == null || !mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
    _loadData();
  }

  /// Linha de um cuidado (componente List Item do Figma): fundo creme,
  /// título, "data · objeto", seta e uma linha por baixo.
  Widget _careItem(Care care) {
    final object = _objects
        .where((object) => object.id == care.objectId)
        .firstOrNull;
    return Column(
      children: [
        ListTile(
          // Mesmo creme dos cartões (vem do cardTheme).
          tileColor: Theme.of(context).cardTheme.color,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.xs,
          ),
          title: Text(care.title),
          subtitle: Text('${formatApiDate(care.dueOn)} · ${care.objectName}'),
          trailing: const Icon(LucideIcons.chevronRight),
          onTap: object == null ? null : () => _openObject(object),
        ),
        Divider(color: Theme.of(context).colorScheme.surfaceContainerHighest),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final secondaryText = text.bodyLarge?.copyWith(
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );
    // Os primeiros cuidados por fazer (os em atraso aparecem primeiro).
    final upcoming = _cares
        .where((care) => !care.isDone)
        .take(_upcomingCount)
        .toList();
    final hasData = !_isLoading && _errorMessage == null;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Início'),
      ),
      // RefreshIndicator: puxar para baixo volta a pedir os dados.
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Text('Olá, ${Session.user?.name ?? ''}', style: text.headlineSmall),
            const SizedBox(height: AppSpacing.sm),
            // Enquanto carrega ou se falhar, mostra isso no lugar do resumo.
            if (_isLoading)
              const LinearProgressIndicator()
            else
              Text(_errorMessage ?? _weekSummary(), style: secondaryText),

            const SizedBox(height: AppSpacing.lg),
            Text('Próximos cuidados', style: text.titleLarge),
            const SizedBox(height: AppSpacing.md),
            if (hasData && upcoming.isEmpty)
              Text('Sem cuidados por fazer.', style: secondaryText),
            for (final care in upcoming) _careItem(care),

            const SizedBox(height: AppSpacing.lg),
            Text('Os meus objetos', style: text.titleLarge),
            const SizedBox(height: AppSpacing.md),
            if (hasData && _objects.isEmpty)
              Text('Ainda não tem objetos.', style: secondaryText),
            // Os primeiros objetos, com 16 de espaço entre cartões.
            for (final object in _objects.take(_objectCount)) ...[
              ObjectCard(
                objectId: object.id,
                name: object.name,
                category: _categoryName(object),
                photoUrl: object.photoUrl,
                nextCareDueOn: object.nextCareDueOn,
                onTap: () => _openObject(object),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ],
        ),
      ),
    );
  }
}
