import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const app = express();
const port = process.env.PORT || 3000;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/openai/echo", async (req, res) => {
  const input = normalizeEchoInput(req.body);
  if (!input.answerText) {
    res.status(400).json({ error: "answerText is required" });
    return;
  }

  if (!openai) {
    res.json(createFallbackEcho(input));
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write gentle Chinese observation echoes for an ambiguous card-reflection app. Never diagnose, therapize, optimize, or explain the user. Preserve ambiguity. Return only JSON with echoText and tags. tags must be an array of objects with family and label.",
        },
        {
          role: "user",
          content: JSON.stringify({
            answerText: input.answerText,
            promptText: input.promptText,
            cardId: input.cardId,
            cardTitle: input.cardTitle,
            mode: input.mode,
          }),
        },
      ],
    });
    const parsed = parseEchoJson(completion.choices[0]?.message?.content);
    res.json({
      echoText: parsed.echoText || createFallbackEcho(input).echoText,
      tags: normalizeTags(parsed.tags),
      source: "openai",
    });
  } catch (error) {
    console.error("OpenAI echo failed", error);
    res.json(createFallbackEcho(input));
  }
});

app.use(express.static(distDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Presence server listening on ${port}`);
});

function normalizeEchoInput(body = {}) {
  return {
    answerText: String(body.answerText ?? "").trim().slice(0, 800),
    promptText: String(body.promptText ?? "").trim().slice(0, 240),
    cardId: String(body.cardId ?? "").trim().slice(0, 80),
    cardTitle: String(body.cardTitle ?? "").trim().slice(0, 120),
    mode: String(body.mode ?? "journal").trim().slice(0, 40),
  };
}

function createFallbackEcho(input) {
  const promptText = input.promptText ? `在“${input.promptText}”旁边，` : "";
  const inputHint = input.answerText.length > 18 ? "这句话" : `“${input.answerText}”`;
  return {
    echoText: `${promptText}${inputHint}像是把一点还没完全说清的东西轻轻放在海面上。它不急着给出答案，只是让这个片刻先被看见。`,
    tags: [
      { family: "related", label: "先看见" },
      { family: "opposite", label: "慢一点" },
      { family: "resonance", label: "轻轻停留" },
    ],
    source: "fallback",
  };
}

function parseEchoJson(content = "") {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return createFallbackEcho({ answerText: "" }).tags;
  return tags
    .map((tag) => {
      if (typeof tag === "string") return { family: "related", label: tag };
      return { family: String(tag.family ?? "related"), label: String(tag.label ?? "").trim() };
    })
    .filter((tag) => tag.label && !/[a-z]/i.test(tag.label))
    .slice(0, 9);
}
