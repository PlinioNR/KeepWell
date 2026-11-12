import '../utils/date_format.dart';

/// Cuidado (tarefa de manutenção) de um objeto, ex.: "Lubrificar a corrente".
///
/// Na API chama-se "task".
class Care {
  const Care({
    required this.id,
    required this.objectId,
    required this.objectName,
    required this.title,
    required this.dueOn,
    required this.isDone,
  });

  final String id;
  final String objectId;

  /// Nome do objeto (a API junta-o à tarefa na lista).
  final String objectName;

  final String title;

  /// Data prevista no formato 'AAAA-MM-DD'.
  final String dueOn;

  /// true se já foi concluído (na API: status 'completed').
  final bool isDone;

  /// Em atraso: ainda por fazer e a data prevista já passou.
  /// As datas 'AAAA-MM-DD' podem ser comparadas como texto.
  bool get isOverdue =>
      !isDone && dueOn.compareTo(formatDateForApi(DateTime.now())) < 0;

  /// Cria um Care a partir do JSON da API.
  factory Care.fromJson(Map<String, dynamic> json) {
    return Care(
      id: json['id'] as String,
      objectId: json['objectId'] as String,
      objectName: json['objectName'] as String? ?? '',
      title: json['title'] as String,
      dueOn: json['dueOn'] as String,
      isDone: json['status'] == 'completed',
    );
  }
}
