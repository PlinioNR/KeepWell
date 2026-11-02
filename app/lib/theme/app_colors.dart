import 'package:flutter/material.dart';

/// Cores do KeepWell, copiadas das variáveis do Figma (página Foundations).
/// Cada família vai de 100 (mais clara) a 900 (mais escura); a 500 é a base.
abstract final class AppColors {
  // Primary — azul-marinho: ações principais, estado ativo, texto.
  static const primary100 = Color(0xFFD7DCE5);
  static const primary200 = Color(0xFFABB6C7);
  static const primary300 = Color(0xFF7B8CA6);
  static const primary400 = Color(0xFF40577B);
  static const primary500 = Color(0xFF001D4A);
  static const primary600 = Color(0xFF00173D);
  static const primary700 = Color(0xFF00102F);
  static const primary800 = Color(0xFF000920);
  static const primary900 = Color(0xFF000412);

  // Secondary — creme: superfícies e fundos.
  static const secondary100 = Color(0xFFFDFDF6);
  static const secondary200 = Color(0xFFFCFBEB);
  static const secondary300 = Color(0xFFFAF8DF);
  static const secondary400 = Color(0xFFF7F5CF);
  static const secondary500 = Color(0xFFF4F1BB);
  static const secondary900 = Color(0xFF51503C);

  // Accent — coral: destaques (até 10% do ecrã).
  static const accent100 = Color(0xFFFFEBE7);
  static const accent400 = Color(0xFFF79688);
  static const accent500 = Color(0xFFED6A5A);
  static const accent700 = Color(0xFFA1463B);

  // Estados — usar só em estados (erro, confirmação, aviso).
  static const danger100 = Color(0xFFFFF1F0);
  static const danger400 = Color(0xFFFCA5A5);
  static const danger500 = Color(0xFFE5484D);
  static const danger600 = Color(0xFFC63A3A);

  static const success100 = Color(0xFFF2FBF4);
  static const success400 = Color(0xFF8FD7A8);
  static const success600 = Color(0xFF2E9B4D);

  static const info100 = Color(0xFFF2F8FF);
  static const info400 = Color(0xFF7DB7FF);
  static const info600 = Color(0xFF1C5BFF);

  static const white = Color(0xFFFFFFFF);
}
