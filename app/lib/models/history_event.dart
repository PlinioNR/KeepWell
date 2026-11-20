/// Uma linha do histórico de um objeto (ecrã 09).
///
/// A API manda dois tipos de evento: 'care_completed' (cuidado concluído)
/// e 'object_added' (objeto registado, sempre o mais antigo).
class HistoryEvent {
  const HistoryEvent({
    required this.title,
    required this.occurredAt,
    required this.notes,
  });

  final String title;

  /// Data e hora do evento, como vem da API (ex.: '2026-11-09T14:47:12Z').
  final String occurredAt;

  /// Texto por baixo da data: as observações do cuidado, ou
  /// 'Sem observações.' (como no Figma). Vazio em "Objeto adicionado".
  final String notes;

  factory HistoryEvent.fromJson(Map<String, dynamic> json) {
    // "task" só existe nos cuidados concluídos.
    final task = json['task'] as Map<String, dynamic>?;
    final notes = task?['notes'] as String? ?? '';
    return HistoryEvent(
      title: task?['title'] as String? ?? 'Objeto adicionado',
      occurredAt: json['occurredAt'] as String,
      notes: task == null || notes.isNotEmpty ? notes : 'Sem observações.',
    );
  }
}
