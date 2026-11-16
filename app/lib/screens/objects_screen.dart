import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/category.dart';
import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/object_service.dart';
import '../theme/app_spacing.dart';
import '../widgets/category_chip.dart';
import '../widgets/object_card.dart';
import 'add_object_screen.dart';
import 'object_detail_screen.dart';

/// Ecrã 06 Objects: lista dos objetos de quem tem sessão iniciada.
///
/// É um StatefulWidget porque os dados chegam da API depois de o ecrã
/// abrir. Enquanto esperamos, mostramos "a carregar"; se falhar, um erro.
///
/// A pesquisa e o filtro por categoria são feitos na app, sobre a lista
/// que já veio da API (não fazem pedidos novos).
class ObjectsScreen extends StatefulWidget {
  const ObjectsScreen({super.key});

  @override
  State<ObjectsScreen> createState() => _ObjectsScreenState();
}

class _ObjectsScreenState extends State<ObjectsScreen> {
  final _objectService = ObjectService();

  // Os três estados possíveis do ecrã:
  bool _isLoading = true; // 1. à espera da API
  String? _errorMessage; // 2. correu mal (null = sem erro)
  List<UserObject> _objects = []; // 3. dados recebidos (pode estar vazia)

  // Categorias, para os chips de filtro.
  List<Category> _categories = [];

  // Nome de cada categoria, pelo id: {'id123': 'Veículos', ...}
  Map<String, String> _categoryNames = {};

  // Texto escrito no campo de pesquisa.
  final _searchController = TextEditingController();

  // Categoria escolhida nos chips (null = "Todos").
  String? _selectedCategoryId;

  // initState corre uma vez, quando o ecrã é criado.
  @override
  void initState() {
    super.initState();
    _loadObjects();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Abre um ecrã (Novo objeto ou Detalhe) e espera que feche.
  ///
  /// Se algo mudou, esse ecrã devolve uma mensagem (ex.: 'Objeto
  /// adicionado.'): mostramo-la e atualizamos a lista.
  Future<void> _openAndReload(Widget screen) async {
    final message = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => screen),
    );

    if (message == null || !mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
    _loadObjects();
  }

  /// Objetos que passam na pesquisa e no filtro de categoria.
  ///
  /// É um "getter": calcula a lista sempre que é usado, por isso fica
  /// atualizada a cada setState.
  List<UserObject> get _visibleObjects {
    final search = _searchController.text.trim().toLowerCase();
    return _objects.where((object) {
      final matchesSearch = object.name.toLowerCase().contains(search);
      final matchesCategory =
          _selectedCategoryId == null ||
          object.categoryId == _selectedCategoryId;
      return matchesSearch && matchesCategory;
    }).toList();
  }

  /// Pede os objetos e as categorias à API.
  Future<void> _loadObjects() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Os dois pedidos são feitos um a seguir ao outro.
      final objects = await _objectService.fetchObjects();
      final categories = await _objectService.fetchCategories();

      if (!mounted) return;
      setState(() {
        _objects = objects;
        _categories = categories;
        _categoryNames = {for (final c in categories) c.id: c.name};
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        // Ecrã principal de um separador: não tem seta "voltar".
        automaticallyImplyLeading: false,
        title: const Text('Objetos'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus),
            tooltip: 'Adicionar objeto',
            onPressed: () =>
                _openAndReload(AddObjectScreen(categories: _categories)),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  /// Escolhe o que mostrar conforme o estado.
  Widget _buildBody() {
    final text = Theme.of(context).textTheme;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _errorMessage!,
                style: text.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              OutlinedButton(
                onPressed: _loadObjects,
                child: const Text('TENTAR NOVAMENTE'),
              ),
            ],
          ),
        ),
      );
    }

    if (_objects.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Text(
            'Ainda não tem objetos.\nToque em + para adicionar o primeiro.',
            style: text.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final visibleObjects = _visibleObjects;

    return Column(
      children: [
        // Campo de pesquisa: a cada letra, setState redesenha a lista.
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.md,
            0,
          ),
          child: TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(hintText: 'Pesquisar objetos'),
            onChanged: (_) => setState(() {}),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        // Chips numa fila que desliza para o lado.
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            children: [
              CategoryChip(
                label: 'Todos',
                selected: _selectedCategoryId == null,
                onTap: () => setState(() => _selectedCategoryId = null),
              ),
              // Um chip por categoria.
              for (final category in _categories) ...[
                const SizedBox(width: AppSpacing.sm),
                CategoryChip(
                  label: category.name,
                  selected: _selectedCategoryId == category.id,
                  onTap: () =>
                      setState(() => _selectedCategoryId = category.id),
                ),
              ],
            ],
          ),
        ),
        // Expanded: a lista ocupa o resto do ecrã e desliza sozinha.
        Expanded(
          child: visibleObjects.isEmpty
              ? Center(
                  child: Text(
                    'Nenhum objeto encontrado.',
                    style: text.bodyLarge,
                  ),
                )
              // ListView.separated põe um espaço de 16 entre cartões.
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: visibleObjects.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: AppSpacing.md),
                  itemBuilder: (context, index) {
                    final object = visibleObjects[index];
                    // "??" usa o texto da direita se a categoria não
                    // for encontrada.
                    final categoryName =
                        _categoryNames[object.categoryId] ?? 'Sem categoria';
                    return ObjectCard(
                      name: object.name,
                      category: categoryName,
                      photoUrl: object.photoUrl,
                      // Toque no cartão: abre o ecrã de detalhe.
                      onTap: () => _openAndReload(
                        ObjectDetailScreen(
                          object: object,
                          categoryName: categoryName,
                          categories: _categories,
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
