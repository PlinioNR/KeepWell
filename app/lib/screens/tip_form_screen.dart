import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/tip.dart';
import '../services/api_exception.dart';
import '../services/tip_service.dart';
import '../theme/app_spacing.dart';
import '../utils/validators.dart';
import '../widgets/app_text_field.dart';

/// Ecrã 19 Formulário de dica (só dono e gestor).
///
/// Sem [tip] cria uma dica nova para o objeto [objectId]; com [tip]
/// edita-a e mostra o caixote para a eliminar.
/// Ao terminar, fecha e devolve a mensagem a mostrar na lista.
class TipFormScreen extends StatefulWidget {
  const TipFormScreen({super.key, required this.objectId, this.tip});

  final String objectId;
  final Tip? tip;

  @override
  State<TipFormScreen> createState() => _TipFormScreenState();
}

class _TipFormScreenState extends State<TipFormScreen> {
  final _formKey = GlobalKey<FormState>();
  // Em modo editar, os campos começam com os valores da dica.
  late final _titleController = TextEditingController(text: widget.tip?.title);
  late final _textController = TextEditingController(text: widget.tip?.text);
  late final _videoController = TextEditingController(
    text: widget.tip?.videoUrl,
  );
  bool _isLoading = false;

  // Linhas visíveis do campo do texto da dica.
  static const _textLines = 5;

  @override
  void dispose() {
    _titleController.dispose();
    _textController.dispose();
    _videoController.dispose();
    super.dispose();
  }

  /// Faz um pedido à API; se correr bem, fecha com [message].
  Future<void> _run(Future<void> Function() action, String message) async {
    setState(() => _isLoading = true);
    try {
      await action();
      if (mounted) Navigator.pop(context, message);
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
      setState(() => _isLoading = false);
    }
  }

  /// Corre quando se carrega em "Guardar dica".
  void _save() {
    if (!_formKey.currentState!.validate()) return;
    _run(
      () => TipService().saveTip(
        id: widget.tip?.id,
        objectId: widget.objectId,
        title: _titleController.text.trim(),
        text: _textController.text.trim(),
        videoUrl: _videoController.text.trim(),
      ),
      widget.tip == null ? 'Dica adicionada.' : 'Dica alterada.',
    );
  }

  /// Pergunta se quer mesmo eliminar e, se sim, pede à API.
  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar dica?'),
        content: Text('"${widget.tip!.title}" vai ser eliminada.'),
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
    _run(() => TipService().deleteTip(widget.tip!.id), 'Dica eliminada.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.tip == null ? 'Nova dica' : 'Editar dica'),
        actions: [
          // O caixote só aparece ao editar.
          if (widget.tip != null)
            IconButton(
              icon: const Icon(LucideIcons.trash2),
              tooltip: 'Eliminar dica',
              onPressed: _isLoading ? null : _delete,
            ),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: [
                    AppTextField(
                      label: 'Título',
                      hint: 'Ex.: Descalcificar todos os meses',
                      controller: _titleController,
                      validator: validateCareTitle,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      label: 'Dica',
                      hint: 'Explique o que fazer e porquê',
                      controller: _textController,
                      maxLines: _textLines,
                      validator: (value) =>
                          validateRequired(value, 'Escreva a dica.'),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      label: 'Vídeo ou tutorial (opcional)',
                      hint: 'https://...',
                      controller: _videoController,
                      keyboardType: TextInputType.url,
                      validator: validateVideoUrl,
                    ),
                  ],
                ),
              ),
              // Botão fixo em baixo, como no Figma.
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: FilledButton(
                  onPressed: _isLoading ? null : _save,
                  child: const Text('GUARDAR DICA'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
