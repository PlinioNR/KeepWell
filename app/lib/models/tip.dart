/// Uma dica de conservação de um objeto, tal como a API a devolve.
class Tip {
  const Tip({
    required this.id,
    required this.objectId,
    required this.title,
    required this.text,
    this.videoUrl,
  });

  final String id;
  final String objectId;
  final String title;
  final String text;

  /// Link opcional para um vídeo ou tutorial (null se não houver).
  final String? videoUrl;

  factory Tip.fromJson(Map<String, dynamic> json) {
    return Tip(
      id: json['id'] as String,
      objectId: json['objectId'] as String,
      title: json['title'] as String,
      text: json['text'] as String,
      videoUrl: json['videoUrl'] as String?,
    );
  }
}
