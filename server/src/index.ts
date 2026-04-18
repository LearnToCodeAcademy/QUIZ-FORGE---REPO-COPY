import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import generateQuizRouter from "./routes/generateQuiz";
import remixQuizRouter from "./routes/remixQuiz";
import reviewerRouter from "./routes/reviewer";
import flashcardsRouter from "./routes/flashcards";
import chatRouter from "./routes/chat";
import explainRouter from "./routes/explain";
import authRouter from "./routes/auth";
import quizzesRouter from "./routes/quizzes";
import filesRouter from "./routes/files";
import activityRouter from "./routes/activity";
import chatConversationsRouter from "./routes/chatConversations";
import { initDatabase } from "./db";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser() as any);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "quizforge-prototype" });
});

app.use("/api", authRouter);
app.use("/api", quizzesRouter);
app.use("/api", filesRouter);
app.use("/api", generateQuizRouter);
app.use("/api", remixQuizRouter);
app.use("/api", reviewerRouter);
app.use("/api", flashcardsRouter);
app.use("/api", chatRouter);
app.use("/api", explainRouter);
app.use("/api", activityRouter);
app.use("/api", chatConversationsRouter);

const webDist = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`QuizForge server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    app.listen(port, () => {
      console.log(`QuizForge server listening on http://localhost:${port} (DB init failed)`);
    });
  });
