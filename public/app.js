const messages = document.querySelector("#messages");
const form = document.querySelector("#form");
const input = document.querySelector("#input");
const send = document.querySelector("#send");
const typing = document.querySelector("#typing");
const newChat = document.querySelector("#newChat");

let chatId = null;

function add(role, text) {
  const row = document.createElement("div");
  row.className = `row ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function loading(on) {
  typing.classList.toggle("hidden", !on);
  send.disabled = on;
  input.disabled = on;
}

async function createSession() {
  const r = await fetch("/api/chat/session", { method: "POST" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Could not create chat.");
  chatId = data.chat_id;
  return data;
}

async function complete(content) {
  if (!chatId) await createSession();

  const r = await fetch("/api/chat/message", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ chat_id: chatId, content })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Could not generate response.");

  const agentMessages = (data.messages || []).filter(m =>
    m.role === "agent" && typeof m.content === "string"
  );

  if (!agentMessages.length) {
    add("agent", "I received the request but no text response was returned.");
    return;
  }

  agentMessages.forEach(m => add("agent", m.content));
}

function reset() {
  chatId = null;
  messages.innerHTML = "";
  add("agent", "Hi! 👋 How can I help you today?");
  input.focus();
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  add("user", text);
  input.value = "";
  loading(true);

  try {
    await complete(text);
  } catch (err) {
    console.error(err);
    add("agent", `Sorry, something went wrong: ${err.message}`);
  } finally {
    loading(false);
    input.focus();
  }
});

newChat.addEventListener("click", reset);
reset();