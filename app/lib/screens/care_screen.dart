import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/care.dart';
import '../services/api_exception.dart';
import '../services/care_service.dart';
import '../services/object_service.dart';
import '../theme/app_spacing.dart';
import '../widgets/care_card.dart';
import '../widgets/category_chip.dart';
import 'add_care_screen.dart';

/// Ecrã 10 Care: lista dos cuidados, com filtro por estado.
///
/// Tal como o ecrã Objetos, carrega os dados da API ao abrir e filtra na
/// app a lista já carregada. Puxar a lista para baixo volta a carregá-la.
class CareScreen extends StatefulWidget {
  const CareScreen({super.key});

  @override
  State<CareScreen> createState() => _CareScreenState();
}

class _CareScreenState extends State<CareScreen> {
  final _careService = CareService();

  bool _isLoading = true;
  String? _errorMessage;
  List<Care> _cares = [];

  // Filtro escolhido nos chips (null = "Todos").
  String? _filter;

  // Os chips de filtro: valor do filtro → texto do chip.
  static const _filters = {
    null: 'Todos',
    'pending': 'Pendentes',
    'overdue': 'Em atraso',
    'done': 'Concluídos',
  };

  @override
  void initState() {
    super.initState();
    _loadCares();
  }

  /// Cuidados que passam no filtro escolhido.
  List<Care> get _visibleCares {
    // "switch" escolhe a regra conforme o filtro; "_" = todos os outros casos.
    return _cares
        .where(
          (care) => switch (_filter) {
            'pending' => !care.isDone && !care.isOverdue,
            'overdue' => care.isOverdue,
            'done' => care.isDone,
            _ => true,
          },
        )
        .toList();
  }

  /// Pede os cuidados à API.
  Future<void> _loadCares() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final cares = await _careService.fetchCares();
      if (!mounted) return;
      setState(() {
        _cares = cares;
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

  /// Abre o Novo cuidado com a lista de objetos para escolher.
  Future<void> _openAddCare() async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final objects = await ObjectService().fetchObjects();
      if (!mounted) return;
      if (objects.isEmpty) {
        messenger.showSnackBar(
          const SnackBar(content: Text('Adicione primeiro um objeto.')),
        );
        return;
      }
      final message = await Navigator.push<String>(
        context,
        MaterialPageRoute(
          builder: (context) => AddCareScreen(objects: objects),
        ),
      );
      if (message == null) return;
      messenger.showSnackBar(SnackBar(content: Text(message)));
      _loadCares();
    } on ApiException catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        // Ecrã principal de um separador: não tem seta "voltar".
        automaticallyImplyLeading: false,
        title: const Text('Cuidados'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus),
            tooltip: 'Adicionar cuidado',
            onPressed: _openAddCare,
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
                onPressed: _loadCares,
                child: const Text('TENTAR NOVAMENTE'),
              ),
            ],
          ),
        ),
      );
    }

    final visibleCares = _visibleCares;

    return Column(
      children: [
        const SizedBox(height: AppSpacing.md),
        // Chips de filtro numa fila que desliza para o lado.
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            children: [
              // Um chip por filtro (entries = pares valor/texto do mapa).
              for (final filter in _filters.entries) ...[
                CategoryChip(
                  label: filter.value,
                  selected: _filter == filter.key,
                  onTap: () => setState(() => _filter = filter.key),
                ),
                const SizedBox(width: AppSpacing.sm),
              ],
            ],
          ),
        ),
        Expanded(
          // RefreshIndicator: puxar para baixo volta a pedir os cuidados.
          child: RefreshIndicator(
            onRefresh: _loadCares,
            child: visibleCares.isEmpty
                // ListView (e não só Text) para se poder puxar mesmo vazio.
                ? ListView(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    children: [
                      Text(
                        'Sem cuidados para mostrar.',
                        style: text.bodyLarge,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: visibleCares.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) =>
                        CareCard(care: visibleCares[index]),
                  ),
          ),
        ),
      ],
    );
  }
}
