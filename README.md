# Retell Chat Agent Client Demo

This project follows Retell's current Chat API flow:

1. `POST /create-chat` creates a chat session and returns `chat_id`.
2. `POST /create-chat-completion` sends each user message using that `chat_id`.
3. Retell stores the conversation history for the chat.

Retell documentation:
https://docs.retellai.com/api-references/create-chat
https://docs.retellai.com/api-references/create-chat-completion

## Setup

1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Add your rotated Retell API key.
4. Keep the supplied agent ID.
5. Run:

npm install
npm start

6. Open http://localhost:3000

## Environment

RETELL_API_KEY=your_new_retell_api_key
RETELL_AGENT_ID=agent_7c9f1607072877ccd1869c7a3e
PORT=3000

The API key is server-side only. Never put it in `public/app.js`.

## Deploy

Deploy this Node/Express project to a Node-compatible host such as Render, Railway, Fly.io, or your own server. Add `RETELL_API_KEY` and `RETELL_AGENT_ID` as server environment variables. The resulting public URL can be sent to your client.

## Notes

The UI displays all `agent` messages returned by the completion endpoint, which is useful when the agent response includes multiple messages or tool-related output.