import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../services/api_client.dart';
import '../services/api_config.dart';

/// Foto de um objeto, ou o ícone de caixa se não tiver foto.
///
/// Usada no cartão da lista e no ecrã de detalhe. Quem a usa decide o
/// tamanho, a cor de fundo e os cantos (à volta, num Container).
class ObjectPhoto extends StatelessWidget {
  const ObjectPhoto({super.key, this.photoUrl, this.iconSize});

  /// Caminho da foto na API (ex.: '/objects/123/photo'), ou null.
  final String? photoUrl;

  /// Tamanho do ícone quando não há foto (null = tamanho normal, 24).
  final double? iconSize;

  @override
  Widget build(BuildContext context) {
    final icon = Icon(LucideIcons.package, size: iconSize);
    if (photoUrl == null) return icon;

    // A foto também precisa do token para ser vista.
    // Se falhar a carregar, mostra o ícone (errorBuilder).
    return Image.network(
      '$apiBaseUrl$photoUrl',
      headers: ApiClient.authHeader,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => icon,
    );
  }
}
