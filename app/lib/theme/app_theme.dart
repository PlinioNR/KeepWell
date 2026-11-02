import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';
import 'app_spacing.dart';

/// Tema claro e escuro do KeepWell.
///
/// Correspondência entre os estilos do Figma e os nomes do Flutter:
/// H1 → headlineLarge, H2 → headlineMedium, H3 → headlineSmall,
/// Title → titleLarge, Body → bodyLarge, Body Small → bodyMedium,
/// Caption → bodySmall, Button → labelLarge, Label → labelMedium,
/// Tab Label → labelSmall.
abstract final class AppTheme {
  static ThemeData get light => _build(
        const ColorScheme(
          brightness: Brightness.light,
          primary: AppColors.primary500,
          onPrimary: AppColors.white,
          secondary: AppColors.accent500,
          onSecondary: AppColors.primary500,
          error: AppColors.danger600,
          onError: AppColors.white,
          surface: AppColors.white,
          onSurface: AppColors.primary500,
          onSurfaceVariant: AppColors.primary400,
          outline: AppColors.primary200,
        ),
        scaffold: AppColors.secondary100,
      );

  // O modo escuro ainda não existe no Figma: estas cores são uma proposta
  // e devem ser acertadas quando forem criadas as variáveis do modo escuro.
  static ThemeData get dark => _build(
        const ColorScheme(
          brightness: Brightness.dark,
          primary: AppColors.secondary500,
          onPrimary: AppColors.primary500,
          secondary: AppColors.accent400,
          onSecondary: AppColors.primary900,
          error: AppColors.danger400,
          onError: AppColors.primary900,
          surface: AppColors.primary700,
          onSurface: AppColors.secondary100,
          onSurfaceVariant: AppColors.primary200,
          outline: AppColors.primary400,
        ),
        scaffold: AppColors.primary800,
      );

  static ThemeData _build(ColorScheme colors, {required Color scaffold}) {
    final textTheme = _textTheme(colors.onSurface);

    return ThemeData(
      colorScheme: colors,
      scaffoldBackgroundColor: scaffold,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: scaffold,
        foregroundColor: colors.onSurface,
        centerTitle: true,
        elevation: 0,
        titleTextStyle: textTheme.titleLarge,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          textStyle: textTheme.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          foregroundColor: colors.primary,
          side: BorderSide(color: colors.primary),
          textStyle: textTheme.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: const EdgeInsets.all(AppSpacing.md),
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: colors.onSurfaceVariant,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
      ),
    );
  }

  static TextTheme _textTheme(Color color) {
    TextStyle style(double size, FontWeight weight, double lineHeight,
            [double letterSpacing = 0]) =>
        GoogleFonts.nunitoSans(
          fontSize: size,
          fontWeight: weight,
          height: lineHeight / size,
          letterSpacing: letterSpacing,
          color: color,
        );

    return TextTheme(
      headlineLarge: style(32, FontWeight.w700, 40),
      headlineMedium: style(28, FontWeight.w700, 36),
      headlineSmall: style(24, FontWeight.w600, 32),
      titleLarge: style(20, FontWeight.w600, 28),
      bodyLarge: style(16, FontWeight.w400, 24),
      bodyMedium: style(14, FontWeight.w400, 20, 0.1),
      bodySmall: style(12, FontWeight.w400, 16, 0.4),
      labelLarge: style(14, FontWeight.w600, 20, 0.1),
      labelMedium: style(14, FontWeight.w600, 20, 0.1),
      labelSmall: style(12, FontWeight.w600, 16, 0.5),
    );
  }
}
