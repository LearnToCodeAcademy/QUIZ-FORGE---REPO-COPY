import { Router } from "express";
import { upload, formatMulterError } from "../services/fileUpload";
import { buildSourcePack, UploadedLocalFile } from "../services/textExtract";
import { cleanupLocalFiles } from "../services/tempCleanup";
import { getXaiClient } from "../xaiClient";
import { geminiGenerateContent } from "../geminiClient";

const router = Router();

router.post("/generate-reviewer", (req, res) => {
  upload.array("files", 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ ok: false, error: formatMulterError(err) });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(400).json({ ok: false, error: "At least one file is required." });
    }

    const reviewerType = String(req.body.reviewerType || "concise");
    const preferResponse = String(req.body.preferResponse || "normal");
    const aiModel = String(req.body.aiModel || "grok");

    if (!["short", "concise", "detailed"].includes(reviewerType)) {
      await cleanupLocalFiles(files.map((f) => f.path));
      return res.status(400).json({ ok: false, error: "reviewerType must be short|concise|detailed." });
    }

    if (!["short", "normal", "long"].includes(preferResponse)) {
      await cleanupLocalFiles(files.map((f) => f.path));
      return res.status(400).json({ ok: false, error: "preferResponse must be short|normal|long." });
    }

    const localFiles: UploadedLocalFile[] = files.map((file) => ({
      path: file.path,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    try {
      const { sourcePack } = await buildSourcePack(localFiles);

      const detailMap: Record<string, string> = {
        short: "Provide only the most critical key points. Use bullet points. Keep it very brief — no more than 1 page worth of content.",
        concise: "Provide a balanced overview covering all major topics. Use headings, bullet points, and short paragraphs. Aim for 2-3 pages of content.",
        detailed: "Provide comprehensive coverage of all topics. Include detailed explanations, examples, tables for comparisons, and thorough bullet points. Aim for 4-6 pages of content."
      };

      const lengthMap: Record<string, string> = {
        short: "Keep responses brief. Each section should be 1-3 sentences max.",
        normal: "Use moderate length. Each section should be a short paragraph.",
        long: "Be thorough and detailed. Include extended explanations and examples."
      };

      const systemPrompt = [
        "You are a study reviewer generator. Create a well-structured study reviewer from the provided source material.",
        "Use markdown formatting: # for main headings, ## for subheadings, ### for sub-subheadings.",
        "Use bullet points (- ) for lists.",
        "Use | col1 | col2 | for tables when comparing concepts.",
        "Use **bold** for key terms and *italic* for emphasis.",
        "Use --- for section dividers.",
        "Do NOT include any JSON. Output plain markdown text only.",
        "Base your content ONLY on the provided source material. Do not invent facts.",
        detailMap[reviewerType],
        lengthMap[preferResponse]
      ].join("\n");

      const userPrompt = `Generate a study reviewer from the following source material:\n\n${sourcePack}`;

      let content = "";

      if (aiModel === "gemini") {
        content = await geminiGenerateContent({
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

        content = (response as any).output_text || extractText(response);
      }

      return res.json({ ok: true, content });
    } catch (error) {
      const modelName = aiModel === "gemini" ? "Google Gemini" : "Grok";
      return res.status(500).json({
        ok: false,
        error: `Failed to generate reviewer with ${modelName}: ${(error as Error).message}`
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
