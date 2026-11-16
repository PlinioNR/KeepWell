import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'care_screen.dart';
import 'home_screen.dart';
import 'objects_screen.dart';
import 'profile_screen.dart';

/// Ecrã principal depois de entrar: tem a barra de separadores em baixo
/// (Tab Bar do Figma) com Início, Objetos, Cuidados e Perfil.
///
/// É um StatefulWidget porque guarda qual separador está ativo.
class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  // Posição do separador ativo: 0 Início, 1 Objetos, 2 Cuidados, 3 Perfil.
  int _currentTab = 0;

  // Um ecrã por separador, pela mesma ordem dos botões.
  static const _tabs = [
    HomeScreen(),
    ObjectsScreen(),
    CareScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // IndexedStack mostra só o ecrã ativo, mas mantém os outros em
      // memória: ao voltar a um separador, ele está como o deixámos.
      body: IndexedStack(index: _currentTab, children: _tabs),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Traço fino por cima da barra (cor definida no tema).
          const Divider(),
          NavigationBar(
            selectedIndex: _currentTab,
            // Ao tocar num separador, guardamos a posição e redesenhamos.
            onDestinationSelected: (index) =>
                setState(() => _currentTab = index),
            destinations: const [
              NavigationDestination(
                icon: Icon(LucideIcons.house),
                label: 'Início',
              ),
              NavigationDestination(
                icon: Icon(LucideIcons.package),
                label: 'Objetos',
              ),
              NavigationDestination(
                icon: Icon(LucideIcons.wrench),
                label: 'Cuidados',
              ),
              NavigationDestination(
                icon: Icon(LucideIcons.user),
                label: 'Perfil',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
