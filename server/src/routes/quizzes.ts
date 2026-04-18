import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest, authMiddleware, optionalAuth } from "../auth";
import pool from "../db";
import { logActivity } from "./activity";

const router = Router();

router.post("/quizzes/save", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, quizData, answers, score, totalQuestions, timeSpent, quizType, aiModel } = req.body;
    const shareCode = uuidv4().replace(/-/g, "").substring(0, 12);

    const result = await pool.query(
      `INSERT INTO quizzes (user_id, share_code, title, quiz_data, answers, score, total_questions, time_spent, quiz_type, ai_model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, share_code`,
      [req.user!.id, shareCode, title, JSON.stringify(quizData), JSON.stringify(answers), score, totalQuestions, timeSpent, quizType, aiModel]
    );

    logActivity(req.user!.id, "quiz_saved", title || "Untitled Quiz");
    res.json({ ok: true, quizId: result.rows[0].id, shareCode: result.rows[0].share_code });
  } catch (err: any) {
    console.error("Save quiz error:", err);
    res.status(500).json({ error: "Failed to save quiz" });
  }
});

router.get("/quizzes/my", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, share_code, title, score, total_questions, time_spent, quiz_type, ai_model, created_at
       FROM quizzes WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ ok: true, quizzes: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});

router.get("/quizzes/shared/:shareCode", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT q.*, u.name as author_name, u.avatar_url as author_avatar, u.custom_avatar as author_custom_avatar
       FROM quizzes q JOIN users u ON q.user_id = u.id
       WHERE q.share_code = $1`,
      [req.params.shareCode]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    const q = result.rows[0];
    res.json({
      ok: true,
      quiz: {
        id: q.id,
        shareCode: q.share_code,
        title: q.title,
        quizData: q.quiz_data,
        score: q.score,
        totalQuestions: q.total_questions,
        timeSpent: q.time_spent,
        quizType: q.quiz_type,
        aiModel: q.ai_model,
        createdAt: q.created_at,
        author: { name: q.author_name, avatar: q.author_custom_avatar || q.author_avatar },
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch shared quiz" });
  }
});

router.post("/bookmarks/add", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.body;
    await pool.query(
      "INSERT INTO bookmarks (user_id, quiz_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.user!.id, quizId]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to bookmark" });
  }
});

router.delete("/bookmarks/:quizId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM bookmarks WHERE user_id = $1 AND quiz_id = $2",
      [req.user!.id, parseInt(req.params.quizId)]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

router.get("/bookmarks/my", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT q.id, q.share_code, q.title, q.score, q.total_questions, q.time_spent, q.quiz_type, q.ai_model, q.quiz_data, q.created_at, b.created_at as bookmarked_at
       FROM bookmarks b JOIN quizzes q ON b.quiz_id = q.id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [req.user!.id]
    );
    res.json({ ok: true, bookmarks: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

router.get("/rankings", async (_req, res) => {
  try {
    const { page = "1" } = _req.query;
    const pageNum = parseInt(page as string) || 1;
    const limit = 10;
    const offset = (pageNum - 1) * limit;

    const result = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.custom_avatar,
              COUNT(DISTINCT uf.id) as file_count,
              COUNT(DISTINCT q.id) as quiz_count
       FROM users u
       LEFT JOIN user_files uf ON u.id = uf.user_id
       LEFT JOIN quizzes q ON u.id = q.user_id
       GROUP BY u.id
       ORDER BY file_count DESC, quiz_count DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM users");
    const total = parseInt(countResult.rows[0].count);

    res.json({
      ok: true,
      rankings: result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        avatar: r.custom_avatar || r.avatar_url,
        fileCount: parseInt(r.file_count),
        quizCount: parseInt(r.quiz_count),
      })),
      hasMore: offset + limit < total,
      total,
    });
  } catch (err) {
    console.error("Rankings error:", err);
    res.status(500).json({ error: "Failed to fetch rankings" });
  }
});

export default router;
