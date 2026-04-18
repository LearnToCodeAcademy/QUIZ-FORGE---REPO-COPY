import 'dart:io';

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/quiz_service.dart';

class AppState extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  late final AuthService _authService = AuthService(_api);
  late final QuizService _quizService = QuizService(_api);

  bool isLoading = true;
  User? user;
  Quiz? quiz;
  String? lastError;
  Map<String, int> selectedAnswers = {};

  bool get isAuthenticated => user != null;

  Future<void> bootstrap() async {
    try {
      await _authService.initGoogle();
      await _authService.loadToken();
      user = await _authService.getMe();
    } catch (err) {
      lastError = err.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loginWithGoogle() async {
    isLoading = true;
    lastError = null;
    notifyListeners();
    try {
      user = await _authService.loginWithGoogle();
    } catch (err) {
      lastError = err.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    user = null;
    quiz = null;
    selectedAnswers = {};
    notifyListeners();
  }

  Future<void> saveApiKeys({String? grokKey, String? geminiKey}) async {
    await _authService.saveApiKeys(grokKey: grokKey, geminiKey: geminiKey);
  }

  Future<void> generateQuiz({
    required List<File> files,
    required String quizType,
    required int questionCount,
    required AiModel aiModel,
    String? difficulty,
    String? customApiKey,
  }) async {
    isLoading = true;
    lastError = null;
    notifyListeners();

    try {
      quiz = await _quizService.generateQuiz(
        files: files,
        quizType: quizType,
        questionCount: questionCount,
        aiModel: aiModel,
        difficulty: difficulty,
        customApiKey: customApiKey,
      );
      selectedAnswers = {};
    } catch (err) {
      lastError = err.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void answerQuestion(String questionId, int answerIndex) {
    selectedAnswers[questionId] = answerIndex;
    notifyListeners();
  }

  int get score {
    if (quiz == null) return 0;
    var points = 0;

    for (final question in quiz!.questions) {
      final selected = selectedAnswers[question.id];
      if (selected != null && selected == question.answerIndex) {
        points += 1;
      }
    }

    return points;
  }
}
