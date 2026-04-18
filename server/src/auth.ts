import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import pool from "./db";

const JWT_SECRET = process.env.SESSION_SECRET || "quizforge_secret_key_" + (process.env.REPL_ID || "dev");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token");
  return {
    googleId: payload.sub!,
    email: payload.email!,
    name: payload.name || payload.email!,
    avatarUrl: payload.picture || "",
  };
}

export async function findOrCreateUser(googleData: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
}) {
  let result = await pool.query("SELECT * FROM users WHERE google_id = $1", [googleData.googleId]);
  if (result.rows.length > 0) {
    await pool.query(
      "UPDATE users SET name = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3",
      [googleData.name, googleData.avatarUrl, result.rows[0].id]
    );
    return result.rows[0];
  }

  result = await pool.query(
    "INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *",
    [googleData.googleId, googleData.email, googleData.name, googleData.avatarUrl]
  );
  return result.rows[0];
}

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }
  req.user = { id: decoded.userId, email: "", name: "" };
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = { id: decoded.userId, email: "", name: "" };
    }
  }
  next();
}
