import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(express.json());

const API_KEY = process.env.RETELL_API_KEY;
const AGENT_ID = process.env.RETELL_AGENT_ID;

async function retell(pathname, body) {
  const r = await fetch(`https://api.retellai.com${pathname}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data?.message || "Retell API request failed");
    err.status = r.status;
    err.details = data;
    throw err;
  }
  return data;
}

app.post("/api/chat/session", async (req, res) => {
  try {
    const data = await retell("/create-chat", {
      agent_id: AGENT_ID,
      agent_version: "latest_published",
      metadata: req.body?.metadata || {},
      retell_llm_dynamic_variables: req.body?.retell_llm_dynamic_variables || {}
    });
    res.json(data);
  } catch (e) {
    console.error("create-chat:", e.details || e);
    res.status(e.status || 500).json({ error: e.message, details: e.details });
  }
});

app.post("/api/chat/message", async (req, res) => {
  try {
    const { chat_id, content } = req.body;
    if (!chat_id || !content?.trim()) {
      return res.status(400).json({ error: "chat_id and content are required." });
    }

    const data = await retell("/create-chat-completion", {
      chat_id,
      content: content.trim()
    });
    res.json(data);
  } catch (e) {
    console.error("create-chat-completion:", e.details || e);
    res.status(e.status || 500).json({ error: e.message, details: e.details });
  }
});

export default app;
