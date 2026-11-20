import 'package:flutter/material.dart';

import '../models/history_event.dart';
import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/object_service.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';

/// Ecrã 09 Histórico: cuidados concluídos de um objeto, numa linha do
/// tempo (do mais recente para o mais antigo, a acabar em "Objeto adicionado").
class ObjectHistoryScreen extends StatefulWidget {
  const ObjectHistoryScreen({super.key, required this.object});

  final UserObject object;

  @override
  State<ObjectHistoryScreen> createState() => _ObjectHistoryScreenState();
}

class _ObjectHistoryScreenState extends State<ObjectHistoryScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<HistoryEvent> _events = [];

  // Medidas da linha do tempo (como no Figma).
  static const _dotSize = 12.0;
  static const _lineWidth = 2.0;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  /// Pede o histórico à API.
  Future<void> _loadHistory() async {
    setState(() {
      // Só mostra "a carregar" se ainda não houver nada no ecrã; senão a
      // lista fica visível e atualiza-se quando chegam os dados novos.
      _isLoading = _events.isEmpty;
      _errorMessage = null;
    });
    try {
      final events = await ObjectService().fetchHistory(widget.object.id);
      if (!mounted) return;
      setState(() {
        _events = events;
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

  /// Um evento: ponto e traço à esquerda, textos à direita.
  /// O último evento não tem traço por baixo do ponto.
  Widget _eventItem(HistoryEvent event, {required bool isLast}) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;
    // A API manda a hora em UTC; toLocal() passa para a hora do telemóvel.
    final date = formatDateForDisplay(
      DateTime.parse(event.occurredAt).toLocal(),
    );

    // IntrinsicHeight faz o traço ter a mesma altura que os textos ao lado.
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: _dotSize,
                height: _dotSize,
                decoration: BoxDecoration(
                  color: colors.primary,
                  shape: BoxShape.circle,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: _lineWidth,
                    color: colors.outlineVariant,
                  ),
                ),
            ],
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.title, style: text.titleMedium),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    date,
                    style: text.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  if (event.notes.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      event.notes,
                      style: text.bodyMedium?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Histórico')),
      // AnimatedSwitcher: ao passar de "a carregar" para a lista (ou erro),
      // o conteúdo novo aparece com um esbatimento (fade).
      body: AnimatedSwitcher(duration: AppMotion.short, child: _buildBody()),
    );
  }

  /// Escolhe o que mostrar: a carregar, erro ou a linha do tempo.
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
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: AppSpacing.md),
              OutlinedButton(
                onPressed: _loadHistory,
                child: const Text('TENTAR NOVAMENTE'),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        Text(widget.object.name, style: text.headlineSmall),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Histórico de cuidados',
          style: text.bodyLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        // "indexed" dá a posição de cada evento, para saber qual é o último.
        for (final (index, event) in _events.indexed)
          _eventItem(event, isLast: index == _events.length - 1),
      ],
    );
  }
}
