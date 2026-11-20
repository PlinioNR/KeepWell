import 'package:flutter/material.dart';

import '../models/tip.dart';
import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/tip_service.dart';
import '../theme/app_spacing.dart';

/// Ecrã 18 Dicas: dicas de conservação de um objeto.
///
/// Aberto pelo botão "Ver dicas" do Detalhe do objeto. Por agora só
/// mostra as dicas; criar e editar (dono e gestor) vem a seguir.
class TipsScreen extends StatefulWidget {
  const TipsScreen({super.key, required this.object});

  final UserObject object;

  @override
  State<TipsScreen> createState() => _TipsScreenState();
}

class _TipsScreenState extends State<TipsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Tip> _tips = [];

  @override
  void initState() {
    super.initState();
    _loadTips();
  }

  /// Pede as dicas deste objeto à API.
  Future<void> _loadTips() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final tips = await TipService().fetchTips(widget.object.id);
      if (!mounted) return;
      setState(() {
        _tips = tips;
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
      appBar: AppBar(title: Text('Dicas · ${widget.object.name}')),
      body: _buildBody(),
    );
  }

  /// Escolhe o que mostrar: a carregar, erro, vazio ou a lista.
  Widget _buildBody() {
    final text = Theme.of(context).textTheme;
    final secondaryText = text.bodyMedium?.copyWith(
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // Erro ou lista vazia: uma mensagem ao centro.
    if (_errorMessage != null || _tips.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _errorMessage ?? 'Ainda não há dicas para este objeto.',
                textAlign: TextAlign.center,
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                OutlinedButton(
                  onPressed: _loadTips,
                  child: const Text('TENTAR NOVAMENTE'),
                ),
              ],
            ],
          ),
        ),
      );
    }

    // Um cartão (Tip Card do Figma) por dica.
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: _tips.length,
      separatorBuilder: (context, index) =>
          const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final tip = _tips[index];
        return Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tip.title, style: text.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(tip.text, style: secondaryText),
              ],
            ),
          ),
        );
      },
    );
  }
}
