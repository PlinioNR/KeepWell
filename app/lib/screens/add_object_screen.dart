import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/category.dart';
import '../services/api_exception.dart';
import '../services/object_service.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';
import '../utils/validators.dart';
import '../widgets/app_text_field.dart';
import '../widgets/photo_picker_box.dart';

/// Ecrã 07 Add Object: formulário para registar um objeto novo.
///
/// Recebe a lista de categorias do ecrã Objetos (já a tinha carregado),
/// para não a pedir outra vez à API.
/// Ao guardar com sucesso, fecha e devolve "true" ao ecrã anterior,
/// para ele saber que tem de atualizar a lista.
/// A fotografia é opcional: se houver, é enviada logo a seguir ao objeto.
class AddObjectScreen extends StatefulWidget {
  const AddObjectScreen({super.key, required this.categories});

  final List<Category> categories;

  @override
  State<AddObjectScreen> createState() => _AddObjectScreenState();
}

class _AddObjectScreenState extends State<AddObjectScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  // Mostra a data escolhida no campo (ex.: '09/03/2024').
  final _dateController = TextEditingController();

  final _objectService = ObjectService();

  // Categoria escolhida (null = ainda nenhuma).
  String? _categoryId;

  // Data de aquisição escolhida (opcional, por isso pode ficar null).
  DateTime? _acquiredOn;

  // Caminho da fotografia no telemóvel (opcional, por isso pode ser null).
  String? _photoPath;

  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  /// Abre o calendário do Android para escolher a data de aquisição.
  Future<void> _pickDate() async {
    final today = DateTime.now();
    // showDatePicker devolve a data escolhida, ou null se cancelar.
    final picked = await showDatePicker(
      context: context,
      initialDate: _acquiredOn ?? today,
      firstDate: DateTime(1950),
      // Não faz sentido ter comprado um objeto no futuro.
      lastDate: today,
    );
    if (picked == null) return;

    setState(() {
      _acquiredOn = picked;
      _dateController.text = formatDateForDisplay(picked);
    });
  }

  /// Corre quando se carrega em "Guardar objeto".
  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // 1.º pedido: cria o objeto (a API devolve-o já com o id).
      final object = await _objectService.createObject(
        name: _nameController.text.trim(),
        categoryId: _categoryId!,
        // Sem data escolhida, envia null (a data é opcional).
        acquiredOn: _acquiredOn == null ? null : formatDateForApi(_acquiredOn!),
      );

      // 2.º pedido (só se houver foto): envia a fotografia desse objeto.
      if (_photoPath != null) {
        try {
          await _objectService.uploadPhoto(object.id, _photoPath!);
        } on ApiException catch (error) {
          // O objeto já ficou guardado; avisamos só que a foto falhou.
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Objeto guardado, mas a fotografia falhou: ${error.message}',
                ),
              ),
            );
          }
        }
      }

      if (!mounted) return;
      // Fecha o ecrã e avisa o ecrã Objetos de que correu bem.
      Navigator.pop(context, true);
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
        title: const Text('Novo objeto'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // A lista desliza: com o teclado aberto, nada fica tapado.
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: [
                    PhotoPickerBox(
                      photoPath: _photoPath,
                      onPicked: (path) => setState(() => _photoPath = path),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      label: 'Nome do objeto',
                      hint: 'Ex.: Máquina de café',
                      controller: _nameController,
                      textInputAction: TextInputAction.next,
                      validator: validateObjectName,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    // Select do Figma: rótulo por cima + lista de opções.
                    Text('Categoria', style: text.labelMedium),
                    const SizedBox(height: AppSpacing.sm),
                    DropdownButtonFormField<String>(
                      initialValue: _categoryId,
                      hint: const Text('Escolha uma categoria'),
                      icon: const Icon(LucideIcons.chevronDown, size: 16),
                      // Uma opção por categoria: mostra o nome, guarda o id.
                      items: [
                        for (final category in widget.categories)
                          DropdownMenuItem(
                            value: category.id,
                            child: Text(category.name),
                          ),
                      ],
                      onChanged: (value) => setState(() => _categoryId = value),
                      validator: (value) =>
                          value == null ? 'Escolha uma categoria.' : null,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    // Date Field do Figma: não se escreve, toca-se para
                    // abrir o calendário (readOnly + onTap).
                    Text(
                      'Data de aquisição (opcional)',
                      style: text.labelMedium,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextFormField(
                      controller: _dateController,
                      readOnly: true,
                      onTap: _pickDate,
                      decoration: const InputDecoration(
                        hintText: 'dd/mm/aaaa',
                        suffixIcon: Icon(LucideIcons.calendar, size: 20),
                      ),
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
                      : const Text('GUARDAR OBJETO'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
