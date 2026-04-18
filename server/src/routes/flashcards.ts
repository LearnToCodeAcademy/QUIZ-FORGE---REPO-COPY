import { Router } from "express";
import { upload, formatMulterError } from "../services/fileUpload";
import { buildSourcePack, UploadedLocalFile } from "../services/textExtract";
import { cleanupLocalFiles } from "../services/tempCleanup";
import { getXaiClient } from "../xaiClient";
import { geminiGenerateContent } from "../geminiClient";

const router = Router();

const FLASHCARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["deck_title", "card_count", "source_summary", "cards"],
  properties: {
    deck_title: { type: "string" },
    card_count: { type: "number" },
    source_summary: { type: "string" },
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "front", "back", "hint"],
        properties: {
          id: { type: "string" },
          front: { type: "string" },
          back: { type: "string" },
          hint: { type: "string" }
        }
      }
    }
  }
};

function buildFlashcardPrompt(cardCount: number, difficulty: string): { system: string; user: string } {
  const system = [
    "You are a flashcard generator. Output ONLY valid JSON — no markdown, no code fences, no commentary.",
    "Create study flashcards from the provided source material.",
    "Each card has a FRONT (question/term) and a BACK (answer/definition).",
    "Each card also has a SHORT hint (2-5 words) to jog memory.",
    "Use ONLY information from the source material. Do not invent facts.",
    "Output must be JSON.parse()-able with no trailing commas or comments.",
    "Follow the exact JSON schema provided."
  ].join("\n");

  const difficultyGuide: Record<string, string> = {
    easy: "Use straightforward definitions and basic concepts.",
    medium: "Mix definitions, explanations, and application questions.",
    hard: "Focus on nuanced details, comparisons, and deeper understanding."
  };

  const schemaStr = JSON.stringify(FLASHCARD_SCHEMA, null, 2);

  const user = [
    `Generate exactly ${cardCount} study flashcards from the source material.`,
    `Difficulty: ${difficulty || "medium"} — ${difficultyGuide[difficulty] || difficultyGuide.medium}`,
    "",
    "Schema:",
    schemaStr,
    "",
    "Rules:",
    "- card_count must equal cards.length",
    "- front: a clear question or term (max 120 chars)",
    "- back: a clear, complete answer or definition (max 300 chars)",
    "- hint: 2-5 word memory jog (e.g., 'Greek word for light')",
    "- id: sequential string '1', '2', '3'...",
    "- deck_title: concise title based on the material",
    "- source_summary: 1 sentence about what the source covers",
    "",
    "Output JSON only."
  ].join("\n");

  return { system, user };
}

router.post("/generate-flashcards", (req, res) => {
  upload.array("files", 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ ok: false, error: formatMulterError(err) });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(400).json({ ok: false, error: "At least one file is required." });
    }

    const cardCount = Number(req.body.cardCount) || 10;
    const difficulty = String(req.body.difficulty || "medium");
    const aiModel = String(req.body.aiModel || "grok");
    const customApiKey = req.body.customApiKey || "";

    if (cardCount < 3 || cardCount > 40) {
      await cleanupLocalFiles(files.map((f) => f.path));
      return res.status(400).json({ ok: false, error: "cardCount must be between 3 and 40." });
    }

    const localFiles: UploadedLocalFile[] = files.map((file) => ({
      path: file.path,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    try {
      const { sourcePack } = await buildSourcePack(localFiles);
      const { system, user } = buildFlashcardPrompt(cardCount, difficulty);
      const fullUserPrompt = `${user}\n\n=== SOURCE MATERIAL ===\n${sourcePack}`;

      let rawText = "";

      if (aiModel === "gemini") {
        rawText = await geminiGenerateContent({ systemPrompt: system, userPrompt: fullUserPrompt, temperature: 0.4 });
      } else {
        const client = await getXaiClient(customApiKey);
        const response = await client.responses.create({
          model: process.env.XAI_MODEL ?? "grok-4",
          input: [
            { role: "system", content: system },
            { role: "user", content: fullUserPrompt }
          ],
          temperature: 0.4,
          store: false,
          text: { format: { type: "json_schema", name: "flashcard_deck", schema: FLASHCARD_SCHEMA, strict: true } }
        } as any);
        rawText = (response as any).output_text || "";
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
        }
      }

      if (!parsed || !Array.isArray(parsed.cards)) {
        return res.status(422).json({ ok: false, error: "Failed to generate valid flashcards. Try again.", raw: rawText });
      }

      return res.json({ ok: true, deck: parsed });
    } catch (error) {
      return res.status(500).json({ ok: false, error: `Failed to generate flashcards: ${(error as Error).message}` });
    } finally {
      await cleanupLocalFiles(files.map((f) => f.path));
    }
  });
});

export default router;
