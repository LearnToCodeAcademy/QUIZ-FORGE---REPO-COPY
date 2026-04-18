import { GoogleGenAI } from "@google/genai";

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Google Gemini API key is not configured. Please set GOOGLE_API_KEY.");
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

export async function geminiGenerateContent(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}): Promise<string> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: `${params.systemPrompt}\n\n${params.userPrompt}` }] }
    ],
    config: {
      temperature: params.temperature ?? 0.3,
    }
  });
  return response.text ?? "";
}

export async function geminiChat(params: {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  temperature?: number;
}): Promise<string> {
  const client = getGeminiClient();
  const contents = params.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      temperature: params.temperature ?? 0.5,
      systemInstruction: params.systemPrompt,
    }
  });
  return response.text ?? "";
}

export async function geminiGenerateQuiz(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: `${params.systemPrompt}\n\n${params.userPrompt}` }] }
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    }
  });
  return response.text ?? "";
}
