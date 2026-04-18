class User {
  final int id;
  final String name;
  final String email;
  final String avatarUrl;
  final bool hasGrokKey;
  final bool hasGeminiKey;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.avatarUrl,
    required this.hasGrokKey,
    required this.hasGeminiKey,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String? ?? '',
      hasGrokKey: json['hasGrokKey'] as bool? ?? false,
      hasGeminiKey: json['hasGeminiKey'] as bool? ?? false,
    );
  }
}

enum AiModel { grok, gemini }

class QuizQuestion {
  final String id;
  final String type;
  final String prompt;
  final List<String> choices;
  final int? answerIndex;
  final String explanation;

  const QuizQuestion({
    required this.id,
    required this.type,
    required this.prompt,
    required this.choices,
    required this.answerIndex,
    required this.explanation,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: json['id'].toString(),
      type: json['type']?.toString() ?? 'mcq',
      prompt: json['prompt']?.toString() ?? '',
      choices: (json['choices'] as List<dynamic>? ?? const [])
          .map((e) => e.toString())
          .toList(),
      answerIndex: json['answer_index'] as int?,
      explanation: json['explanation']?.toString() ?? '',
    );
  }
}

class Quiz {
  final String quizTitle;
  final String quizType;
  final int questionCount;
  final String sourceSummary;
  final List<QuizQuestion> questions;

  const Quiz({
    required this.quizTitle,
    required this.quizType,
    required this.questionCount,
    required this.sourceSummary,
    required this.questions,
  });

  factory Quiz.fromJson(Map<String, dynamic> json) {
    return Quiz(
      quizTitle: json['quiz_title']?.toString() ?? 'Quiz',
      quizType: json['quiz_type']?.toString() ?? 'mcq',
      questionCount: json['question_count'] as int? ?? 0,
      sourceSummary: json['source_summary']?.toString() ?? '',
      questions: (json['questions'] as List<dynamic>? ?? const [])
          .map((e) => QuizQuestion.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
