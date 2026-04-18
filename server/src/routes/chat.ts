import { Router } from "express";
import { upload, formatMulterError } from "../services/fileUpload";
import { buildSourcePack, UploadedLocalFile } from "../services/textExtract";
import { cleanupLocalFiles } from "../services/tempCleanup";
import { getXaiClient } from "../xaiClient";
import { geminiChat } from "../geminiClient";

const router = Router();

router.post("/chat", (req, res) => {
  upload.array("files", 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ ok: false, error: formatMulterError(err) });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const message = String(req.body.message || "");
    const aiModel = String(req.body.aiModel || "grok");
    let history: { role: string; content: string }[] = [];

    try {
      history = JSON.parse(req.body.history || "[]");
    } catch {
      history = [];
    }

    if (!message.trim()) {
      await cleanupLocalFiles(files.map((f) => f.path));
      return res.status(400).json({ ok: false, error: "Message is required." });
    }

    const localFiles: UploadedLocalFile[] = files.map((file) => ({
      path: file.path,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    try {
      let sourcePack = "";
      if (files.length > 0) {
        const result = await buildSourcePack(localFiles);
        sourcePack = result.sourcePack;
      }

      const systemPrompt = [
        "You are QuizForge AI, a helpful study assistant.",
        "Answer questions based on the provided study materials.",
        "Be concise, clear, and helpful.",
        "If the question is not related to the materials, politely note that but still try to help.",
        "Use simple formatting. Keep answers focused and educational.",
        "Do not use markdown code fences unless showing code.",
        sourcePack ? `\n\nReference Material:\n${sourcePack}` : ""
      ].join("\n");

      let reply = "";

      if (aiModel === "gemini") {
        const recentHistory = history.slice(-10);
        const allMessages = [
          ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
        ];
        if (allMessages[allMessages.length - 1]?.content !== message) {
          allMessages.push({ role: "user", content: message });
        }
        reply = await geminiChat({
          systemPrompt,
          messages: allMessages,
          temperature: 0.5
        });
      } else {
        const messages: any[] = [
          { role: "system", content: systemPrompt }
        ];
        const recentHistory = history.slice(-10);
        for (const msg of recentHistory) {
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
        if (messages[messages.length - 1]?.content !== message) {
          messages.push({ role: "user", content: message });
        }

        const client = await getXaiClient();
        const response = await client.responses.create({
          model: process.env.XAI_MODEL ?? "grok-4",
          input: messages,
          temperature: 0.5,
          store: false
        } as any);

        reply = (response as any).output_text || extractText(response);
      }

      return res.json({ ok: true, reply });
    } catch (error) {
      const modelName = aiModel === "gemini" ? "Google Gemini" : "Grok";
      return res.status(500).json({
        ok: false,
        error: `Failed to establish a chat to ${modelName}: ${(error as Error).message}`
      });
    } finally {
      await cleanupLocalFiles(files.map((f) => f.path));
    }
  });
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
