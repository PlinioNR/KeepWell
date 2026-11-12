// Funções simples para mostrar e enviar datas.
//
// A API guarda as datas como texto 'AAAA-MM-DD' (ex.: '2024-03-09').
// No ecrã mostramos 'DD/MM/AAAA' (ex.: '09/03/2024').

/// Põe um zero à esquerda nos números de um algarismo (3 → '03').
String _twoDigits(int number) => number.toString().padLeft(2, '0');

/// Data para mostrar no ecrã: '09/03/2024'.
String formatDateForDisplay(DateTime date) {
  return '${_twoDigits(date.day)}/${_twoDigits(date.month)}/${date.year}';
}

/// Data para enviar à API: '2024-03-09'.
String formatDateForApi(DateTime date) {
  return '${date.year}-${_twoDigits(date.month)}-${_twoDigits(date.day)}';
}

/// Data que veio da API ('2024-03-09') pronta a mostrar: '09/03/2024'.
String formatApiDate(String apiDate) =>
    formatDateForDisplay(DateTime.parse(apiDate));
