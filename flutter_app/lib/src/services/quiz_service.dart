import 'dart:io';

import 'package:dio/dio.dart';

import '../models/models.dart';
import 'api_client.dart';

class QuizService {
  QuizService(this._api);

  final ApiClient _api;

  Future<Quiz> generateQuiz({
    required List<File> files,
    required String quizType,
    required int questionCount,
    required AiModel aiModel,
    String? difficulty,
    String? customApiKey,
  }) async {
    final form = FormData();

    for (final file in files) {
      form.files.add(
        MapEntry(
          'files',
          await MultipartFile.fromFile(file.path, filename: file.uri.pathSegments.last),
        ),
      );
    }

    form.fields
      ..add(MapEntry('quizType', quizType))
      ..add(MapEntry('questionCount', questionCount.toString()))
      ..add(MapEntry('aiModel', aiModel.name));

    if (difficulty != null && difficulty.isNotEmpty) {
      form.fields.add(MapEntry('difficulty', difficulty));
    }

    if (customApiKey != null && customApiKey.isNotEmpty) {
      form.fields.add(MapEntry('customApiKey', customApiKey));
    }

    final response = await _api.multipart('/generate-quiz', data: form);
    final data = response.data as Map<String, dynamic>;

    if (data['ok'] != true || data['quiz'] == null) {
      throw Exception(data['error']?.toString() ?? 'Failed to generate quiz.');
    }

    return Quiz.fromJson(data['quiz'] as Map<String, dynamic>);
  }
}
