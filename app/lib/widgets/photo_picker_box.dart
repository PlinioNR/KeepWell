import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme/app_spacing.dart';
import 'object_photo.dart';

/// Caixa "Adicionar fotografia" (componente Forms/Photo Upload do Figma).
///
/// Ao tocar, pergunta se quer usar a câmara ou a galeria e abre-a.
/// Depois mostra a foto escolhida; tocar outra vez permite trocá-la.
/// O ecrã que a usa recebe o caminho do ficheiro em [onPicked].
class PhotoPickerBox extends StatelessWidget {
  const PhotoPickerBox({
    super.key,
    required this.photoPath,
    required this.onPicked,
    this.photoUrl,
  });

  /// Caminho da foto escolhida no telemóvel, ou null se ainda não há.
  final String? photoPath;

  /// Foto que o objeto já tem na API (ao editar), ou null.
  final String? photoUrl;

  /// Chamado com o caminho da foto nova.
  final void Function(String path) onPicked;

  /// Mostra o menu Câmara/Galeria e abre a opção escolhida.
  Future<void> _choosePhoto(BuildContext context) async {
    // showModalBottomSheet abre um painel em baixo e espera pela escolha.
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(LucideIcons.camera),
              title: const Text('Tirar fotografia'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(LucideIcons.image),
              title: const Text('Escolher da galeria'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    // Fechou o painel sem escolher nada.
    if (source == null) return;

    // O image_picker abre a câmara (ou a galeria) do Android.
    // maxWidth/maxHeight e imageQuality reduzem o ficheiro
    // (a API aceita no máximo 5 MB).
    final photo = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1600,
      maxHeight: 1600,
      imageQuality: 85,
    );
    if (photo != null) onPicked(photo.path);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Material(
      color: theme.cardTheme.color,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: BorderSide(color: colors.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _choosePhoto(context),
        child: SizedBox(
          height: 200,
          width: double.infinity,
          // 1.º a foto nova escolhida; 2.º a foto que já está na API;
          // sem nenhuma: o ícone e os textos do Figma.
          child: photoPath != null
              ? Image.file(File(photoPath!), fit: BoxFit.cover)
              : photoUrl != null
              ? ObjectPhoto(photoUrl: photoUrl)
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.camera, size: 32),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Adicionar fotografia',
                      style: theme.textTheme.labelMedium,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Tirar uma foto ou escolher da galeria',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
