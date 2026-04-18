import { Router, Response } from "express";
import { verifyGoogleToken, findOrCreateUser, generateToken, AuthRequest, authMiddleware } from "../auth";
import pool from "../db";

const router = Router();

router.post("/auth/google", async (req: AuthRequest, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const googleData = await verifyGoogleToken(credential);
    const user = await findOrCreateUser(googleData);
    const token = generateToken(user.id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.custom_avatar || user.avatar_url,
      },
      token,
    });
  } catch (err: any) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Authentication failed" });
  }
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query("SELECT id, name, email, avatar_url, custom_avatar, grok_api_key, gemini_api_key FROM users WHERE id = $1", [req.user!.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const u = result.rows[0];
    res.json({
      ok: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.custom_avatar || u.avatar_url,
        hasGrokKey: !!u.grok_api_key,
        hasGeminiKey: !!u.gemini_api_key,
      },
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
});

router.delete("/auth/account", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user!.id]);
    res.clearCookie("token", { path: "/" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

router.put("/auth/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, customAvatar } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (customAvatar !== undefined) {
      updates.push(`custom_avatar = $${idx++}`);
      values.push(customAvatar);
    }
    updates.push(`updated_at = NOW()`);
    values.push(req.user!.id);

    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.put("/auth/api-keys", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { grokKey, geminiKey } = req.body;
    await pool.query(
      "UPDATE users SET grok_api_key = $1, gemini_api_key = $2, updated_at = NOW() WHERE id = $3",
      [grokKey || null, geminiKey || null, req.user!.id]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save API keys" });
  }
});

export default router;
