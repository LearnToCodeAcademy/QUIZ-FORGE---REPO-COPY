import { Router, Response } from "express";
import { AuthRequest, authMiddleware } from "../auth";
import pool from "../db";

const router = Router();

router.get("/chat/conversations", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM chat_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [req.user!.id]
    );
    res.json({ ok: true, conversations: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/chat/conversations", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    const result = await pool.query(
      "INSERT INTO chat_conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at",
      [req.user!.id, title || "New Chat"]
    );
    res.json({ ok: true, conversation: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/chat/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const convCheck = await pool.query(
      "SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2",
      [parseInt(req.params.id), req.user!.id]
    );
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const result = await pool.query(
      "SELECT id, role, content, created_at FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [parseInt(req.params.id)]
    );
    res.json({ ok: true, messages: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/chat/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const convCheck = await pool.query(
      "SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2",
      [parseInt(req.params.id), req.user!.id]
    );
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const { role, content } = req.body;
    const result = await pool.query(
      "INSERT INTO chat_messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at",
      [parseInt(req.params.id), role, content]
    );

    await pool.query(
      "UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1",
      [parseInt(req.params.id)]
    );

    res.json({ ok: true, message: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to save message" });
  }
});

router.delete("/chat/conversations/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2",
      [parseInt(req.params.id), req.user!.id]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
