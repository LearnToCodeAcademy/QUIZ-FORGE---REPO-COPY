import type { QuizType, Difficulty, ReviewerType, PreferResponse, AIModel } from "./types";

function getToken(): string {
  return localStorage.getItem("quizforge_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCustomApiKeys(): { grokKey: string; geminiKey: string } {
  try {
    const stored = localStorage.getItem("quizforge_api_keys");
    if (stored) return JSON.parse(stored);
  } catch {}
  return { grokKey: "", geminiKey: "" };
}

export async function generateQuiz(params: {
  files: File[];
  quizType: QuizType;
  questionCount: number;
  difficulty?: Difficulty;
  aiModel?: AIModel;
}) {
  const form = new FormData();
  params.files.forEach((f) => form.append("files", f));
  form.append("quizType", params.quizType);
  form.append("questionCount", String(params.questionCount));
  if (params.difficulty) form.append("difficulty", params.difficulty);
  if (params.aiModel) form.append("aiModel", params.aiModel);

  const keys = getCustomApiKeys();
  if (params.aiModel === "gemini" && keys.geminiKey) {
    form.append("customApiKey", keys.geminiKey);
  } else if (keys.grokKey) {
    form.append("customApiKey", keys.grokKey);
  }

  const resp = await fetch("/api/generate-quiz", { method: "POST", body: form });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Failed to generate quiz" }));
    return { ok: false, error: data.error || "Failed to generate quiz" };
  }
  return resp.json();
}

export async function generateFlashcards(params: {
  files: File[];
  cardCount: number;
  difficulty?: string;
  aiModel?: AIModel;
}) {
  const form = new FormData();
  params.files.forEach((f) => form.append("files", f));
  form.append("cardCount", String(params.cardCount));
  if (params.difficulty) form.append("difficulty", params.difficulty);
  if (params.aiModel) form.append("aiModel", params.aiModel);

  const keys = getCustomApiKeys();
  if (params.aiModel === "gemini" && keys.geminiKey) {
    form.append("customApiKey", keys.geminiKey);
  } else if (keys.grokKey) {
    form.append("customApiKey", keys.grokKey);
  }

  const resp = await fetch("/api/generate-flashcards", { method: "POST", body: form });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Failed to generate flashcards" }));
    return { ok: false, error: data.error || "Failed to generate flashcards" };
  }
  return resp.json();
}

export async function generateReviewer(params: {
  files: File[];
  reviewerType: ReviewerType;
  preferResponse: PreferResponse;
  aiModel?: AIModel;
}) {
  const form = new FormData();
  params.files.forEach((f) => form.append("files", f));
  form.append("reviewerType", params.reviewerType);
  form.append("preferResponse", params.preferResponse);
  if (params.aiModel) form.append("aiModel", params.aiModel);

  const keys = getCustomApiKeys();
  if (params.aiModel === "gemini" && keys.geminiKey) {
    form.append("customApiKey", keys.geminiKey);
  } else if (keys.grokKey) {
    form.append("customApiKey", keys.grokKey);
  }

  const resp = await fetch("/api/generate-reviewer", { method: "POST", body: form });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Failed to generate reviewer" }));
    return { ok: false, error: data.error || "Failed to generate reviewer" };
  }
  return resp.json();
}

export async function chatWithQuizForge(params: {
  files: File[];
  message: string;
  history: { role: string; content: string }[];
  aiModel?: AIModel;
}) {
  const form = new FormData();
  params.files.forEach((f) => form.append("files", f));
  form.append("message", params.message);
  form.append("history", JSON.stringify(params.history));
  if (params.aiModel) form.append("aiModel", params.aiModel);

  const keys = getCustomApiKeys();
  if (params.aiModel === "gemini" && keys.geminiKey) {
    form.append("customApiKey", keys.geminiKey);
  } else if (keys.grokKey) {
    form.append("customApiKey", keys.grokKey);
  }

  const resp = await fetch("/api/chat", { method: "POST", body: form });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Failed to establish chat" }));
    return { ok: false, error: data.error || "Failed to establish chat" };
  }
  return resp.json();
}

export async function remixQuiz(params: {
  quizData: any;
  quizType: string;
  questionCount: number;
  difficulty?: string;
  aiModel?: string;
}) {
  const keys = getCustomApiKeys();
  const body: any = { ...params };
  if (params.aiModel === "gemini" && keys.geminiKey) {
    body.customApiKey = keys.geminiKey;
  } else if (keys.grokKey) {
    body.customApiKey = keys.grokKey;
  }

  const resp = await fetch("/api/remix-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Failed to remix quiz" }));
    return { ok: false, error: data.error || "Failed to remix quiz" };
  }
  return resp.json();
}

export async function explainAnswer(params: {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  aiModel?: AIModel;
}) {
  const keys = getCustomApiKeys();
  const body: any = { ...params };
  if (params.aiModel === "gemini" && keys.geminiKey) {
    body.customApiKey = keys.geminiKey;
  } else if (keys.grokKey) {
    body.customApiKey = keys.grokKey;
  }

  const resp = await fetch("/api/explain-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "API is currently not working" }));
    return { ok: false, error: data.error || "API is currently not working" };
  }
  return resp.json();
}

export async function googleLogin(credential: string) {
  const resp = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return resp.json();
}

export async function getMe() {
  const resp = await fetch("/api/auth/me", { headers: authHeaders() });
  if (!resp.ok) return { ok: false };
  return resp.json();
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
  localStorage.removeItem("quizforge_token");
}

export async function deleteAccount() {
  const resp = await fetch("/api/auth/account", { method: "DELETE", headers: authHeaders() });
  localStorage.removeItem("quizforge_token");
  return resp.json();
}

export async function updateProfile(data: { name?: string; customAvatar?: string }) {
  const resp = await fetch("/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return resp.json();
}

export async function saveApiKeys(grokKey: string, geminiKey: string) {
  const resp = await fetch("/api/auth/api-keys", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ grokKey, geminiKey }),
  });
  return resp.json();
}

export async function saveQuiz(data: {
  title: string;
  quizData: any;
  answers: any;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  quizType: string;
  aiModel: string;
}) {
  const resp = await fetch("/api/quizzes/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return resp.json();
}

export async function getMyQuizzes() {
  const resp = await fetch("/api/quizzes/my", { headers: authHeaders() });
  return resp.json();
}

export async function getSharedQuiz(shareCode: string) {
  const resp = await fetch(`/api/quizzes/shared/${shareCode}`, { headers: authHeaders() });
  return resp.json();
}

export async function addBookmark(quizId: number) {
  const resp = await fetch("/api/bookmarks/add", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ quizId }),
  });
  return resp.json();
}

export async function removeBookmark(quizId: number) {
  const resp = await fetch(`/api/bookmarks/${quizId}`, { method: "DELETE", headers: authHeaders() });
  return resp.json();
}

export async function getMyBookmarks() {
  const resp = await fetch("/api/bookmarks/my", { headers: authHeaders() });
  return resp.json();
}

export async function uploadFiles(files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const resp = await fetch("/api/files/upload", {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return resp.json();
}

export async function getMyFiles() {
  const resp = await fetch("/api/files/my", { headers: authHeaders() });
  return resp.json();
}

export async function deleteFile(fileId: number) {
  const resp = await fetch(`/api/files/${fileId}`, { method: "DELETE", headers: authHeaders() });
  return resp.json();
}

export async function getRankings(page: number = 1) {
  const resp = await fetch(`/api/rankings?page=${page}`);
  return resp.json();
}

export async function getActivityHistory() {
  const resp = await fetch("/api/activity/history", { headers: authHeaders() });
  return resp.json();
}

export async function getChatConversations() {
  const resp = await fetch("/api/chat/conversations", { headers: authHeaders() });
  return resp.json();
}

export async function getChatMessages(conversationId: number) {
  const resp = await fetch(`/api/chat/conversations/${conversationId}/messages`, { headers: authHeaders() });
  return resp.json();
}

export async function createChatConversation(title: string) {
  const resp = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title }),
  });
  return resp.json();
}

export async function saveChatMessage(conversationId: number, role: string, content: string) {
  const resp = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role, content }),
  });
  return resp.json();
}

export async function deleteChatConversation(conversationId: number) {
  const resp = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return resp.json();
}
