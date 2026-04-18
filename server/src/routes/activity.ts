import { Router, Response } from "express";
import { AuthRequest, authMiddleware } from "../auth";
import pool from "../db";

const router = Router();

router.get("/activity/history", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, action, details, created_at
       FROM activity_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );
    res.json({ ok: true, activities: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch activity history" });
  }
});

export async function logActivity(userId: number, action: string, details?: string) {
  try {
    await pool.query(
      "INSERT INTO activity_history (user_id, action, details) VALUES ($1, $2, $3)",
      [userId, action, details || null]
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

export default router;
