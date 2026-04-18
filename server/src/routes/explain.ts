import { Router } from "express";
import { getXaiClient } from "../xaiClient";
import { geminiGenerateContent } from "../geminiClient";

const router = Router();

router.post("/explain-answer", async (req, res) => {
  const { question, userAnswer, correctAnswer, isCorrect, aiModel } = req.body;

  if (!question) {
    return res.status(400).json({ ok: false, error: "question is required." });
  }

  try {
    const systemPrompt = [
      "You are a concise quiz explanation assistant.",
      "Explain why the answer is correct or incorrect in 2-3 sentences max.",
      "Be educational but brief.",
      "Do not use markdown formatting.",
      "Do not repeat the question or answer in full."
    ].join("\n");

    const userPrompt = [
      `Question: ${question}`,
      `User's answer: ${userAnswer}`,
      `Correct answer: ${correctAnswer}`,
      `Was the user correct: ${isCorrect ? "Yes" : "No"}`,
      "",
      isCorrect
        ? "Briefly explain why this answer is correct."
        : "Briefly explain why the user's answer is wrong and why the correct answer is right."
    ].join("\n");

    let explanation = "";
    const model = String(aiModel || "grok");

    if (model === "gemini") {
      explanation = await geminiGenerateContent({
        systemPrompt,
        userPrompt,
        temperature: 0.3
      });
    } else {
      const client = await getXaiClient();
      const response = await client.responses.create({
        model: process.env.XAI_MODEL ?? "grok-4",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        store: false
      } as any);

      explanation = (response as any).output_text || extractText(response);
    }

    return res.json({ ok: true, explanation });
  } catch (error) {
    const modelName = (aiModel === "gemini") ? "Google Gemini" : "Grok";
    return res.status(500).json({
      ok: false,
      error: `API is currently not working (${modelName}): ${(error as Error).message}`
    });
  }
});

function extractText(response: any): string {
  if (!response?.output || !Array.isArray(response.output)) return "";
  const parts: string[] = [];
  for (const item of response.output) {
    if (!item?.content || !Array.isArray(item.content)) continue;
    for (const seg of item.content) {
      if (typeof seg?.text === "string") parts.push(seg.text);
    }
  }
  return parts.join("\n").trim();
}

export default router;
