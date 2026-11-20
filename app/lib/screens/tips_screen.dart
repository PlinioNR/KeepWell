import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/tip.dart';
import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/session.dart';
import '../services/tip_service.dart';
import '../theme/app_spacing.dart';
import 'tip_form_screen.dart';

/// Ecrã 18 Dicas: dicas de conservação de um objeto.
///
/// Aberto pelo botão "Ver dicas" do Detalhe do objeto. Todos veem as
/// dicas; só o dono e o gestor têm o + (nova) e o lápis (editar).
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

  /// Só o dono e o gestor criam e editam dicas.
  bool get _canManage => Session.user?.canManage ?? false;

  /// Abre o formulário (nova dica se [tip] for null) e, se guardou,
  /// mostra a mensagem e recarrega a lista.
  Future<void> _openForm([Tip? tip]) async {
    final message = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) =>
            TipFormScreen(objectId: widget.object.id, tip: tip),
      ),
    );
    if (message == null || !mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
    _loadTips();
  }

  /// Abre o link do vídeo fora da app (YouTube ou navegador).
  Future<void> _openVideo(String url) async {
    // catchError: se o pacote der erro, conta como "não abriu".
    final opened = await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    ).catchError((_) => false);
    if (opened || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Não foi possível abrir o vídeo.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Dicas · ${widget.object.name}'),
        actions: [
          if (_canManage)
            IconButton(
              icon: const Icon(LucideIcons.plus),
              tooltip: 'Nova dica',
              onPressed: _openForm,
            ),
        ],
      ),
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
                // Título e, para dono e gestor, o lápis de editar.
                Row(
                  children: [
                    Expanded(child: Text(tip.title, style: text.titleMedium)),
                    if (_canManage)
                      IconButton(
                        icon: const Icon(LucideIcons.pencil),
                        tooltip: 'Editar dica',
                        onPressed: () => _openForm(tip),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(tip.text, style: secondaryText),
                // Só aparece se a dica tiver link.
                if (tip.videoUrl != null)
                  TextButton.icon(
                    icon: const Icon(LucideIcons.circlePlay),
                    label: const Text('VER VÍDEO'),
                    onPressed: () => _openVideo(tip.videoUrl!),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
