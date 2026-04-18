import { Router, Request, Response } from "express";
import { generateQuizFromSource, generateQuizWithGemini } from "../services/grokGenerate";
import { quizTypeSchema } from "../services/quizSchema";

const router = Router();

router.post("/remix-quiz", async (req: Request, res: Response) => {
  try {
    const { quizData, quizType, questionCount, difficulty, aiModel } = req.body;

    if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
      return res.status(400).json({ ok: false, error: "Valid quiz data is required for remix." });
    }

    const count = Number(questionCount);
    if (!Number.isInteger(count) || count < 1 || count > 30) {
      return res.status(400).json({ ok: false, error: "questionCount must be an integer from 1-30." });
    }

    const quizTypeResult = quizTypeSchema.safeParse(String(quizType || "mixed"));
    if (!quizTypeResult.success) {
      return res.status(400).json({ ok: false, error: "Invalid quizType." });
    }

    if (difficulty && !["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ ok: false, error: "difficulty must be easy|medium|hard." });
    }

    const sourcePack = buildSourceFromQuiz(quizData);

    let result;
    if (aiModel === "gemini") {
      result = await generateQuizWithGemini({
        sourcePack,
        quizType: quizTypeResult.data,
        questionCount: count,
        difficulty: difficulty as "easy" | "medium" | "hard" | undefined,
      });
    } else {
      result = await generateQuizFromSource({
        files: [],
        sourcePack,
        quizType: quizTypeResult.data,
        questionCount: count,
        difficulty: difficulty as "easy" | "medium" | "hard" | undefined,
      });
    }

    return res.status(result.ok ? 200 : 422).json(result);
  } catch (error) {
    const modelName = req.body.aiModel === "gemini" ? "Google Gemini" : "Grok";
    return res.status(500).json({
      ok: false,
      error: `Failed to remix quiz with ${modelName}: ${(error as Error).message}`,
    });
  }
});

function buildSourceFromQuiz(quizData: any): string {
  const lines: string[] = [];
  lines.push(`=== ORIGINAL QUIZ: ${quizData.quiz_title || "Untitled"} ===`);
  if (quizData.source_summary) {
    lines.push(`Topic Summary: ${quizData.source_summary}`);
  }
  lines.push("");

  for (const q of quizData.questions) {
    lines.push(`Question: ${q.prompt}`);
    if (q.choices && q.answer_index !== undefined) {
      lines.push(`Answer: ${q.choices[q.answer_index]}`);
    } else if (q.answers) {
      lines.push(`Answer: ${q.answers.join(" / ")}`);
    } else if (q.pairs) {
      lines.push(`Pairs: ${q.pairs.map((p: any) => `${p.left} = ${p.right}`).join("; ")}`);
    }
    if (q.explanation) {
      lines.push(`Context: ${q.explanation}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export default router;
