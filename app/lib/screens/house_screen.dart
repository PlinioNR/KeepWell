import 'package:flutter/material.dart';

import '../models/house.dart';
import '../services/api_exception.dart';
import '../services/house_service.dart';
import '../services/session.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';

/// Ecrã 15 A minha casa: nome da casa, código de convite e membros.
///
/// Por agora só mostra os dados (GET /house). As ações (gerar código,
/// mudar papel, entrar e sair) vêm no passo seguinte.
class HouseScreen extends StatefulWidget {
  const HouseScreen({super.key});

  @override
  State<HouseScreen> createState() => _HouseScreenState();
}

class _HouseScreenState extends State<HouseScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  House? _house;

  @override
  void initState() {
    super.initState();
    _loadHouse();
  }

  /// Pede a casa à API.
  Future<void> _loadHouse() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final house = await HouseService().fetchHouse();
      if (!mounted) return;
      setState(() {
        _house = house;
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
      appBar: AppBar(title: const Text('A minha casa')),
      body: _buildBody(),
    );
  }

  /// Escolhe o que mostrar conforme o estado.
  Widget _buildBody() {
    final text = Theme.of(context).textTheme;
    final secondaryText = text.bodyMedium?.copyWith(
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );

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
                onPressed: _loadHouse,
                child: const Text('TENTAR NOVAMENTE'),
              ),
            ],
          ),
        ),
      );
    }

    final house = _house!;
    final me = Session.user;
    final canManage = me?.canManage ?? false;
    final code = house.inviteCode;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        Text(house.name, style: text.headlineSmall),
        const SizedBox(height: AppSpacing.xs),
        Text(
          house.members.length == 1
              ? 'Ainda não há mais ninguém nesta casa.'
              : '${house.members.length} pessoas nesta casa.',
          style: secondaryText,
        ),

        // O código de convite só interessa a quem pode convidar.
        if (canManage) ...[
          const SizedBox(height: AppSpacing.lg),
          Text('Código de convite', style: text.titleLarge),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(code ?? 'Ainda sem código'),
            subtitle: Text(
              code == null
                  ? 'Gere um código para convidar pessoas'
                  : 'Válido até ${formatApiDate(house.inviteExpiresAt!)} · '
                        'quem o usar entra como membro',
            ),
          ),
        ],

        const SizedBox(height: AppSpacing.lg),
        Text('Membros', style: text.titleLarge),
        // Um ListTile por pessoa; "(você)" marca quem está a usar a app.
        for (final member in house.members)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(member.name),
            subtitle: Text(
              member.id == me?.id
                  ? '${member.roleLabel} (você)'
                  : member.roleLabel,
            ),
          ),
      ],
    );
  }
}
