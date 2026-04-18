import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import 'quiz_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<File> _files = [];
  String _quizType = 'mcq';
  int _questionCount = 10;
  String _difficulty = 'medium';
  AiModel _model = AiModel.grok;
  final _customApiKeyController = TextEditingController();

  @override
  void dispose() {
    _customApiKeyController.dispose();
    super.dispose();
  }

  Future<void> _pickFiles() async {
    final result = await FilePicker.platform.pickFiles(allowMultiple: true);
    if (result == null) return;

    final files = result.paths
        .whereType<String>()
        .map((path) => File(path))
        .toList();

    setState(() {
      _files = files;
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('QuizForge'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AppState>().logout(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Hi, ${state.user?.name ?? 'User'}', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _pickFiles,
            icon: const Icon(Icons.upload_file),
            label: Text(_files.isEmpty ? 'Upload learning files' : '${_files.length} file(s) selected'),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _quizType,
            decoration: const InputDecoration(labelText: 'Quiz Type'),
            items: const [
              DropdownMenuItem(value: 'mcq', child: Text('Multiple Choice')),
              DropdownMenuItem(value: 'true_false', child: Text('True/False')),
              DropdownMenuItem(value: 'mixed', child: Text('Mixed')),
            ],
            onChanged: (value) => setState(() => _quizType = value ?? 'mcq'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            initialValue: _questionCount,
            decoration: const InputDecoration(labelText: 'Question Count'),
            items: const [5, 10, 20, 30]
                .map((count) => DropdownMenuItem(value: count, child: Text('$count')))
                .toList(),
            onChanged: (value) => setState(() => _questionCount = value ?? 10),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _difficulty,
            decoration: const InputDecoration(labelText: 'Difficulty'),
            items: const [
              DropdownMenuItem(value: 'easy', child: Text('Easy')),
              DropdownMenuItem(value: 'medium', child: Text('Medium')),
              DropdownMenuItem(value: 'hard', child: Text('Hard')),
            ],
            onChanged: (value) => setState(() => _difficulty = value ?? 'medium'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<AiModel>(
            initialValue: _model,
            decoration: const InputDecoration(labelText: 'AI model'),
            items: const [
              DropdownMenuItem(value: AiModel.grok, child: Text('Grok')),
              DropdownMenuItem(value: AiModel.gemini, child: Text('Gemini')),
            ],
            onChanged: (value) => setState(() => _model = value ?? AiModel.grok),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _customApiKeyController,
            decoration: InputDecoration(
              labelText: _model == AiModel.gemini ? 'Gemini API Key (optional)' : 'Grok API Key (optional)',
            ),
            obscureText: true,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: state.isLoading || _files.isEmpty
                ? null
                : () async {
                    await context.read<AppState>().generateQuiz(
                          files: _files,
                          quizType: _quizType,
                          questionCount: _questionCount,
                          difficulty: _difficulty,
                          aiModel: _model,
                          customApiKey: _customApiKeyController.text.trim(),
                        );
                    if (!context.mounted) return;
                    if (context.read<AppState>().quiz != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const QuizScreen()),
                      );
                    }
                  },
            child: Text(state.isLoading ? 'Generating...' : 'Generate Quiz'),
          ),
          if (state.lastError != null) ...[
            const SizedBox(height: 12),
            Text(state.lastError!, style: const TextStyle(color: Colors.red)),
          ],
        ],
      ),
    );
  }
}
