import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/object_service.dart';
import '../theme/app_spacing.dart';
import '../widgets/object_card.dart';

/// Ecrã 06 Objects: lista dos objetos de quem tem sessão iniciada.
///
/// É um StatefulWidget porque os dados chegam da API depois de o ecrã
/// abrir. Enquanto esperamos, mostramos "a carregar"; se falhar, um erro.
/// Ainda falta: pesquisa e filtro por categoria (próximo passo).
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

  // Nome de cada categoria, pelo id: {'id123': 'Veículos', ...}
  Map<String, String> _categoryNames = {};

  // initState corre uma vez, quando o ecrã é criado.
  @override
  void initState() {
    super.initState();
    _loadObjects();
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
            // O ecrã 07 Add Object ainda não existe.
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Adicionar objeto: em breve.')),
            ),
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

    // ListView.separated põe um espaço de 16 entre cartões.
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: _objects.length,
      separatorBuilder: (context, index) =>
          const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final object = _objects[index];
        return ObjectCard(
          name: object.name,
          // "??" usa o texto da direita se a categoria não for encontrada.
          category: _categoryNames[object.categoryId] ?? 'Sem categoria',
        );
      },
    );
  }
}
