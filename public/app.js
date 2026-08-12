import { RetellWebClient } from "https://cdn.jsdelivr.net/npm/retell-client-js-sdk@latest/+esm";

// DOM Elements - Navigation Tabs
const tabChat = document.querySelector("#tabChat");
const tabVoice = document.querySelector("#tabVoice");
const chatSection = document.querySelector("#chatSection");
const voiceSection = document.querySelector("#voiceSection");

// DOM Elements - Text Chat
const messages = document.querySelector("#messages");
const form = document.querySelector("#form");
const input = document.querySelector("#input");
const send = document.querySelector("#send");
const typing = document.querySelector("#typing");
const newChat = document.querySelector("#newChat");

// DOM Elements - Voice Call
const voiceStatusDot = document.querySelector("#voiceStatusDot");
const voiceStatusText = document.querySelector("#voiceStatusText");
const voiceOrb = document.querySelector("#voiceOrb");
const callStateLabel = document.querySelector("#callStateLabel");
const startCallBtn = document.querySelector("#startCall");
const endCallBtn = document.querySelector("#endCall");
const muteMicBtn = document.querySelector("#muteMic");
const voiceLog = document.querySelector("#voiceLog");
const clearVoiceLogBtn = document.querySelector("#clearVoiceLog");

// State Variables
let chatId = null;
let retellWebClient = null;
let isMuted = false;

// ----------------------------------------------------
// 1. Tab Switcher
// ----------------------------------------------------
tabChat.addEventListener("click", () => {
  tabChat.classList.add("active");
  tabVoice.classList.remove("active");
  chatSection.classList.remove("hidden");
  voiceSection.classList.add("hidden");
});

tabVoice.addEventListener("click", () => {
  tabVoice.classList.add("active");
  tabChat.classList.remove("active");
  voiceSection.classList.remove("hidden");
  chatSection.classList.add("hidden");
});

// ----------------------------------------------------
// 2. Text Chat Logic
// ----------------------------------------------------
function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `row ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function loadingChat(on) {
  typing.classList.toggle("hidden", !on);
  send.disabled = on;
  input.disabled = on;
}

async function createChatSession() {
  const r = await fetch("/api/chat/session", { method: "POST" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Could not create chat session.");
  chatId = data.chat_id;
  return data;
}

async function sendChatMessage(content) {
  if (!chatId) await createChatSession();

  const r = await fetch("/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, content })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Could not generate chat response.");

  const agentMessages = (data.messages || []).filter(m =>
    m.role === "agent" && typeof m.content === "string"
  );

  if (!agentMessages.length) {
    addMessage("agent", "I received the request but no response text was returned.");
    return;
  }

  agentMessages.forEach(m => addMessage("agent", m.content));
}

function resetChat() {
  chatId = null;
  messages.innerHTML = "";
  addMessage("agent", "Hi! 👋 How can I help you today?");
  input.focus();
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";
  loadingChat(true);

  try {
    await sendChatMessage(text);
  } catch (err) {
    console.error(err);
    addMessage("agent", `Sorry, something went wrong: ${err.message}`);
  } finally {
    loadingChat(false);
    input.focus();
  }
});

newChat.addEventListener("click", resetChat);

// ----------------------------------------------------
// 3. WebRTC Voice Call Logic
// ----------------------------------------------------
function logVoiceEvent(text, type = "info") {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  const now = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="time">[${now}]</span> ${text}`;
  voiceLog.appendChild(entry);
  voiceLog.scrollTop = voiceLog.scrollHeight;
}

function updateVoiceUIState(state) {
  switch (state) {
    case "disconnected":
      voiceStatusDot.className = "status-dot offline";
      voiceStatusText.textContent = "Disconnected";
      callStateLabel.textContent = "Ready to connect";
      voiceOrb.className = "voice-orb";
      startCallBtn.classList.remove("hidden");
      endCallBtn.classList.add("hidden");
      muteMicBtn.classList.add("hidden");
      muteMicBtn.classList.remove("active");
      muteMicBtn.textContent = "🎤 Mute Mic";
      isMuted = false;
      break;

    case "connecting":
      voiceStatusDot.className = "status-dot connecting";
      voiceStatusText.textContent = "Connecting...";
      callStateLabel.textContent = "Establishing WebRTC connection...";
      voiceOrb.className = "voice-orb active";
      startCallBtn.classList.add("hidden");
      endCallBtn.classList.remove("hidden");
      break;

    case "connected":
      voiceStatusDot.className = "status-dot active";
      voiceStatusText.textContent = "Call Active 🟢";
      callStateLabel.textContent = "Call Connected - Speak now!";
      voiceOrb.className = "voice-orb active";
      startCallBtn.classList.add("hidden");
      endCallBtn.classList.remove("hidden");
      muteMicBtn.classList.remove("hidden");
      break;

    case "agent_speaking":
      callStateLabel.textContent = "AI Agent is speaking... 🔊";
      voiceOrb.className = "voice-orb active speaking";
      break;

    case "user_speaking":
      callStateLabel.textContent = "Listening to you... 🎤";
      voiceOrb.className = "voice-orb active";
      break;
  }
}

function initRetellSDK() {
  if (retellWebClient) return retellWebClient;

  try {
    retellWebClient = new RetellWebClient();

    retellWebClient.on("call_started", () => {
      logVoiceEvent("WebRTC Call connected successfully!", "success");
      updateVoiceUIState("connected");
    });

    retellWebClient.on("call_ended", () => {
      logVoiceEvent("Call session ended.", "warn");
      updateVoiceUIState("disconnected");
    });

    retellWebClient.on("agent_start_talking", () => {
      logVoiceEvent("Agent started speaking", "info");
      updateVoiceUIState("agent_speaking");
    });

    retellWebClient.on("agent_stop_talking", () => {
      logVoiceEvent("Agent stopped speaking", "info");
      updateVoiceUIState("connected");
    });

    retellWebClient.on("update", update => {
      if (update?.transcript) {
        logVoiceEvent(`Transcript update: ${JSON.stringify(update.transcript)}`, "info");
      }
    });

    retellWebClient.on("error", err => {
      console.error("Retell WebRTC error:", err);
      logVoiceEvent(`Error: ${err?.message || err}`, "error");
      updateVoiceUIState("disconnected");
    });

    logVoiceEvent("Retell WebRTC SDK initialized.", "info");
    return retellWebClient;
  } catch (err) {
    console.error("Failed to initialize Retell SDK:", err);
    logVoiceEvent(`SDK Init Error: ${err.message}`, "error");
    return null;
  }
}

async function startVoiceCall() {
  const client = initRetellSDK();
  if (!client) return;

  try {
    updateVoiceUIState("connecting");
    logVoiceEvent("Requesting WebRTC session token from /api/voice/session...", "info");

    const response = await fetch("/api/voice/session", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create web call session.");
    }

    if (!data.access_token) {
      throw new Error("No access_token returned by server.");
    }

    logVoiceEvent(`Web call token received (Call ID: ${data.call_id})`, "success");
    logVoiceEvent("Starting WebRTC call...", "info");

    await client.startCall({ accessToken: data.access_token });
  } catch (err) {
    console.error("Failed to start voice call:", err);
    logVoiceEvent(`Call Error: ${err.message}`, "error");
    updateVoiceUIState("disconnected");
  }
}

function stopVoiceCall() {
  if (retellWebClient) {
    logVoiceEvent("Ending WebRTC call...", "warn");
    retellWebClient.stopCall();
  }
  updateVoiceUIState("disconnected");
}

function toggleMuteMic() {
  if (!retellWebClient) return;

  if (isMuted) {
    retellWebClient.unmute();
    isMuted = false;
    muteMicBtn.classList.remove("active");
    muteMicBtn.textContent = "🎤 Mute Mic";
    logVoiceEvent("Microphone unmuted", "info");
  } else {
    retellWebClient.mute();
    isMuted = true;
    muteMicBtn.classList.add("active");
    muteMicBtn.textContent = "🔇 Unmuted (Muted)";
    logVoiceEvent("Microphone muted", "warn");
  }
}

startCallBtn.addEventListener("click", startVoiceCall);
endCallBtn.addEventListener("click", stopVoiceCall);
muteMicBtn.addEventListener("click", toggleMuteMic);
clearVoiceLogBtn.addEventListener("click", () => {
  voiceLog.innerHTML = "";
});

// Initialize Chat
resetChat();
logVoiceEvent("App ready. Click 'Start Voice Call' to begin WebRTC testing.", "info");