import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/user_object.dart';
import '../services/api_exception.dart';
import '../services/care_service.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';
import '../utils/validators.dart';
import '../widgets/app_text_field.dart';

/// Ecrã 11 Add Care: formulário para criar um cuidado (tarefa) de um objeto.
///
/// Recebe os objetos que se podem escolher e, opcionalmente, o que vem
/// já escolhido (ao abrir a partir do Detalhe do objeto).
/// Ao guardar, fecha e devolve a mensagem 'Cuidado adicionado.'.
class AddCareScreen extends StatefulWidget {
  const AddCareScreen({super.key, required this.objects, this.objectId});

  final List<UserObject> objects;

  /// Id do objeto já escolhido, ou null.
  final String? objectId;

  @override
  State<AddCareScreen> createState() => _AddCareScreenState();
}

class _AddCareScreenState extends State<AddCareScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _dateController = TextEditingController();
  final _careService = CareService();

  // Até quantos anos para a frente se pode marcar um cuidado.
  static const _maxYearsAhead = 5;

  late String? _objectId = widget.objectId;
  DateTime? _dueOn;
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  /// Abre o calendário para escolher a data prevista.
  Future<void> _pickDate() async {
    final today = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueOn ?? today,
      // Pode ser uma data passada (cuidado em atraso) ou futura.
      firstDate: DateTime(today.year - 1),
      lastDate: DateTime(today.year + _maxYearsAhead),
    );
    if (picked == null) return;

    setState(() {
      _dueOn = picked;
      _dateController.text = formatDateForDisplay(picked);
    });
  }

  /// Corre quando se carrega em "Guardar cuidado".
  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      await _careService.createCare(
        objectId: _objectId!,
        title: _titleController.text.trim(),
        dueOn: formatDateForApi(_dueOn!),
      );
      if (mounted) Navigator.pop(context, 'Cuidado adicionado.');
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          tooltip: 'Voltar',
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Novo cuidado'),
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
                    Text('Objeto', style: text.labelMedium),
                    const SizedBox(height: AppSpacing.sm),
                    DropdownButtonFormField<String>(
                      initialValue: _objectId,
                      hint: const Text('Escolha um objeto'),
                      icon: const Icon(LucideIcons.chevronDown, size: 16),
                      items: [
                        for (final object in widget.objects)
                          DropdownMenuItem(
                            value: object.id,
                            child: Text(object.name),
                          ),
                      ],
                      onChanged: (value) => setState(() => _objectId = value),
                      validator: (value) =>
                          value == null ? 'Escolha um objeto.' : null,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      label: 'Tarefa',
                      hint: 'Ex.: Limpar o filtro',
                      controller: _titleController,
                      validator: validateCareTitle,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    // Toca-se para abrir o calendário (readOnly + onTap).
                    Text('Data', style: text.labelMedium),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _dateController,
                      readOnly: true,
                      onTap: _pickDate,
                      decoration: const InputDecoration(
                        hintText: 'dd/mm/aaaa',
                        suffixIcon: Icon(LucideIcons.calendar, size: 20),
                      ),
                      validator: (value) =>
                          _dueOn == null ? 'Escolha a data.' : null,
                    ),
                  ],
                ),
              ),
              // Botão fixo em baixo, como no Figma.
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: FilledButton(
                  onPressed: _isLoading ? null : _save,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('GUARDAR CUIDADO'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
