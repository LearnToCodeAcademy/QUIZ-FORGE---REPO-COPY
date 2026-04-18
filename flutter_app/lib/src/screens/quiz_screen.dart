import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/app_state.dart';

class QuizScreen extends StatelessWidget {
  const QuizScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final quiz = state.quiz;

    if (quiz == null) {
      return const Scaffold(
        body: Center(child: Text('No quiz generated yet.')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(quiz.quizTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Score: ${state.score}/${quiz.questions.length}'),
          const SizedBox(height: 16),
          for (final question in quiz.questions)
            Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(question.prompt, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    if (question.choices.isNotEmpty)
                      ...List.generate(question.choices.length, (index) {
                        return RadioListTile<int>(
                          value: index,
                          groupValue: state.selectedAnswers[question.id],
                          onChanged: (value) {
                            if (value == null) return;
                            context.read<AppState>().answerQuestion(question.id, value);
                          },
                          title: Text(question.choices[index]),
                        );
                      })
                    else
                      const Text('This question type is displayed in read-only mode.'),
                    if (state.selectedAnswers[question.id] != null && question.answerIndex != null)
                      Text(
                        state.selectedAnswers[question.id] == question.answerIndex
                            ? 'Correct'
                            : 'Incorrect • ${question.explanation}',
                        style: TextStyle(
                          color: state.selectedAnswers[question.id] == question.answerIndex
                              ? Colors.green
                              : Colors.red,
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
