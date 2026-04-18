import type { Quiz, ScoreResult } from "./types";

const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

export function scoreQuiz(quiz: Quiz, answers: Record<string, any>): ScoreResult {
  let earned = 0;
  let possible = 0;
  const perQuestion: ScoreResult["perQuestion"] = [];

  for (const q of quiz.questions) {
    if (q.type === "matching") {
      const expected = q.pairs || [];
      const given = answers[q.id] || {};
      let qEarned = 0;
      expected.forEach((p, i) => {
        const ok = normalize(given[i] || "") === normalize(p.right);
        if (ok) qEarned += 1;
      });
      earned += qEarned;
      possible += expected.length;
      perQuestion.push({
        id: q.id,
        type: q.type,
        earned: qEarned,
        possible: expected.length,
        correct: qEarned === expected.length
      });
      continue;
    }

    possible += 1;
    let correct = false;
    if (q.type === "mcq" || q.type === "true_false") {
      correct = Number(answers[q.id]) === q.answer_index;
    } else if (q.type === "fill_blank") {
      const userArr: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [String(answers[q.id] || "")];
      const correctArr: string[] = q.answers || [];
      if (correctArr.length === 0) {
        correct = false;
      } else if (userArr.length >= correctArr.length) {
        correct = correctArr.every((ca, ci) => normalize(userArr[ci] || "") === normalize(ca));
      } else {
        const joined = normalize(userArr.join(" "));
        correct = correctArr.some((a) => normalize(a) === joined);
      }
    } else {
      const user = normalize(String(answers[q.id] || ""));
      correct = (q.answers || []).some((a) => normalize(a) === user);
    }
    if (correct) earned += 1;
    perQuestion.push({ id: q.id, type: q.type, earned: correct ? 1 : 0, possible: 1, correct });
  }

  return { earned, possible, percent: possible ? (earned / possible) * 100 : 0, perQuestion };
}
