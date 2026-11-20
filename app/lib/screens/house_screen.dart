import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/house.dart';
import '../services/api_exception.dart';
import '../services/house_service.dart';
import '../services/session.dart';
import '../theme/app_spacing.dart';
import '../utils/date_format.dart';

/// Ecrã 15 A minha casa: nome da casa, código de convite e membros.
///
/// Dono e gestor geram o código; só o dono muda papéis e remove pessoas.
/// Entrar noutra casa e sair vêm no passo seguinte.
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

  /// Faz uma ação na API; se correr bem mostra [message] e recarrega a casa.
  ///
  /// Usada por todos os botões deste ecrã, para não repetir o try/catch.
  Future<void> _run(Future<void> Function() action, String message) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
      messenger.showSnackBar(SnackBar(content: Text(message)));
      _loadHouse();
    } on ApiException catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  /// Caixa do dono ao tocar numa pessoa: mudar o papel ou remover.
  Future<void> _manageMember(HouseMember member) async {
    // Gestor passa a membro e membro passa a gestor.
    final newRole = member.role == 'manager' ? 'member' : 'manager';
    final newRoleLabel = House.roleLabels[newRole]!.toUpperCase();
    final error = Theme.of(context).colorScheme.error;

    // A caixa devolve o que foi escolhido ('role' ou 'remove'), ou null.
    final choice = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(member.name),
        content: Text(
          'É ${member.roleLabel.toLowerCase()} desta casa. '
          'O que quer fazer?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCELAR'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'remove'),
            style: TextButton.styleFrom(foregroundColor: error),
            child: const Text('REMOVER DA CASA'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'role'),
            child: Text('TORNAR $newRoleLabel'),
          ),
        ],
      ),
    );

    final service = HouseService();
    if (choice == 'role') {
      _run(() => service.changeRole(member.id, newRole), 'Papel alterado.');
    } else if (choice == 'remove') {
      _run(() => service.removeMember(member.id), 'Pessoa removida da casa.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('A minha casa')),
      body: _buildBody(),
    );
  }

  /// Linha de uma pessoa da casa.
  ///
  /// Só o dono pode mexer nos outros: para ele, as outras pessoas têm
  /// uma seta e abrem a caixa de mudar papel ou remover.
  Widget _memberTile(HouseMember member, {required bool isMe}) {
    final canEdit = (Session.user?.isOwner ?? false) && !isMe;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(member.name),
      subtitle: Text(isMe ? '${member.roleLabel} (você)' : member.roleLabel),
      trailing: canEdit ? const Icon(LucideIcons.chevronRight) : null,
      onTap: canEdit ? () => _manageMember(member) : null,
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
          // Align impede o botão de esticar a toda a largura.
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
              onPressed: () => _run(
                HouseService().generateInvite,
                'Código gerado. Válido durante 7 dias.',
              ),
              child: Text(code == null ? 'GERAR CÓDIGO' : 'GERAR NOVO CÓDIGO'),
            ),
          ),
        ],

        const SizedBox(height: AppSpacing.lg),
        Text('Membros', style: text.titleLarge),
        // Um ListTile por pessoa; "(você)" marca quem está a usar a app.
        for (final member in house.members)
          _memberTile(member, isMe: member.id == me?.id),
      ],
    );
  }
}
