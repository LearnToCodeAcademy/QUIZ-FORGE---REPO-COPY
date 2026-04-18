import { Router, Response } from "express";
import multer from "multer";
import { AuthRequest, authMiddleware } from "../auth";
import pool from "../db";
import { logActivity } from "./activity";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/files/upload", authMiddleware, upload.array("files", 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const results = [];
    for (const file of files) {
      const result = await pool.query(
        `INSERT INTO user_files (user_id, filename, original_name, file_type, file_data, file_size)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, original_name, file_type, file_size, created_at`,
        [req.user!.id, file.originalname, file.originalname, file.mimetype, file.buffer, file.size]
      );
      results.push(result.rows[0]);
    }

    logActivity(req.user!.id, "file_uploaded", `${results.length} file(s) uploaded`);
    res.json({ ok: true, files: results });
  } catch (err: any) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

router.get("/files/my", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, original_name, file_type, file_size, created_at
       FROM user_files WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ ok: true, files: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

router.get("/files/:id/download", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_files WHERE id = $1 AND user_id = $2",
      [parseInt(req.params.id), req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }
    const file = result.rows[0];
    res.setHeader("Content-Disposition", `attachment; filename="${file.original_name}"`);
    res.setHeader("Content-Type", file.file_type || "application/octet-stream");
    res.send(file.file_data);
  } catch {
    res.status(500).json({ error: "Failed to download file" });
  }
});

router.delete("/files/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM user_files WHERE id = $1 AND user_id = $2",
      [parseInt(req.params.id), req.user!.id]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
