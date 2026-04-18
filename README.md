# ChatGPT Lite

English | [简体中文](./README.zh-CN.md)

ChatGPT Lite is a feature-rich, self-hostable ChatGPT app. The **frontend** is built with Next.js. An optional **FastAPI backend** in [`backend/`](./backend/) powers RAG features: knowledge folders, document uploads, embeddings stored in ChromaDB, chat through [Ollama](https://ollama.com/), and server-side transcription with WhisperX.

## Demo

Try the [ChatGPT Lite Demo Site](https://gptlite.vercel.app).

| Light Theme | Dark Theme |
|:-----------:|:----------:|
| ![ChatGPT Lite Light Theme](./docs/images/demo.jpg) | ![ChatGPT Lite Dark Theme](./docs/images/demo-dark.jpg) |

## Features

**Features:**

- **Real-time Streaming Responses** - Instant token-by-token output via Server-Sent Events
- **Rich Markdown Rendering** - Full markdown support with syntax highlighting
- **Persona System** - Create and switch between custom AI personalities with different system prompts
- **Multi-conversation Management** - Organize and switch between multiple chat threads
- **Persistent Chat History** - Conversations persisted in the browser; no account database for the UI (RAG mode adds local vector storage on the backend—see below)
- **File Attachments** - Upload images, PDFs, spreadsheets (XLSX/CSV), and text files directly in chat
- **RAG & Knowledge Workspace** (optional) - Folders, document ingestion, and retrieval-augmented chat when the FastAPI backend and Ollama are running
- **Voice Input** - Dictate messages using Web Speech API; optional backend path uses WhisperX for transcription
- **Web Search Integration** - Models can search the web when needed, with source citations
- **Supports OpenAI, Azure OpenAI, and OpenAI-compatible providers**
- **40+ UI Themes**
- **Responsive Design** - Desktop and mobile friendly with collapsible sidebar

This project is built on top of [ChatGPT Minimal](https://github.com/blrchen/chatgpt-minimal), extending it with themes, personas, file attachments, voice input, and more. Want something lighter? Check out ChatGPT Minimal. Small codebase, easy to understand, hack, and extend.

## Deployment

For required environment variables, see [Environment Variables](#environment-variables).

### Deploy to Vercel

Deploy instantly by clicking the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fblrchen%2Fchatgpt-lite&project-name=chatgpt-lite&framework=nextjs&repository-name=chatgpt-lite)

### Deploy with Docker

The published image runs the **Next.js** app only. **RAG features** need the FastAPI service running separately (see [Development](#development)), reachable from the app via `RAG_BACKEND_URL` and matching reverse-proxy or rewrite rules for `/api/rag/*`.

For OpenAI account users:

```bash
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY="<YOUR_OPENAI_API_KEY>" \
  blrchen/chatgpt-lite
```

For Azure OpenAI account users:

```bash
docker run -d -p 3000:3000 \
  -e AZURE_OPENAI_RESOURCE_NAME="<YOUR_AZURE_RESOURCE_NAME>" \
  -e AZURE_OPENAI_API_KEY="<YOUR_AZURE_OPENAI_API_KEY>" \
  -e AZURE_OPENAI_DEPLOYMENT="<YOUR_AZURE_OPENAI_DEPLOYMENT_NAME>" \
  blrchen/chatgpt-lite
```

## Development

### Run locally (frontend only)

1. Install Node.js 22+.
2. Clone this repository.
3. Install dependencies using `npm install`.
4. Copy `.env.example` to `.env.local` and update environment variables.
5. Start the application with `npm run dev`.
6. Open `http://localhost:3000` in your browser.

This is enough for standard chat with OpenAI or Azure. RAG routes under `/api/rag/*` expect the backend (see below).

### Run with the RAG backend (full stack)

1. Install and run [Ollama](https://ollama.com/), and pull the model you set in `OLLAMA_CHAT_MODEL` (see [`backend/.env.example`](./backend/.env.example)).
2. Install **Python 3.11+** and create a virtual environment in `backend/`.
3. From `backend/`: `pip install -r requirements.txt` (embedding models, WhisperX, and ChromaDB can be large; ensure enough disk and RAM).
4. Copy [`backend/.env.example`](./backend/.env.example) to `backend/.env` and adjust values.
5. Start the API: from `backend/`, run `python run.py` (listens on `HOST`/`PORT`, default `http://127.0.0.1:8000`).
6. In the project root, set `RAG_BACKEND_URL` in `.env.local` if the backend is not at `http://127.0.0.1:8000`.
7. Run `npm run dev` and open `http://localhost:3000`.

**Startup order:** Ollama → FastAPI → Next.js. In development, `next.config.ts` rewrites `/api/rag/*` to `http://127.0.0.1:8000/api/v1/*`; the chat API route uses `RAG_BACKEND_URL` for server-side calls to `/api/v1/chat`.

## Environment Variables

### Next.js (root)

The following environment variables are required for cloud LLM usage:

For OpenAI account:

| Name                | Description                                                                                      | Default Value            |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------ |
| OPENAI_API_BASE_URL | (Optional) Use this if you plan to use a reverse proxy for `api.openai.com`.                     | `https://api.openai.com` |
| OPENAI_API_KEY      | Secret key obtained from the [OpenAI API website](https://platform.openai.com/account/api-keys). |                          |
| OPENAI_MODEL        | (Optional) GPT model to use                                                                      | `gpt-4o-mini`          |

For Azure OpenAI account:

| Name                       | Description                                    |
| -------------------------- | ---------------------------------------------- |
| AZURE_OPENAI_RESOURCE_NAME | Azure resource name (e.g., "my-openai-resource"). |
| AZURE_OPENAI_API_KEY       | API Key.                                       |
| AZURE_OPENAI_DEPLOYMENT    | Model deployment name (not the model name). |

**RAG integration (optional):**

| Name              | Description                                                                 | Default                 |
| ----------------- | ----------------------------------------------------------------------------- | ----------------------- |
| RAG_BACKEND_URL   | Base URL of the FastAPI server used by the Next.js chat route (`/api/chat`). | `http://127.0.0.1:8000` |

### FastAPI backend

See [`backend/.env.example`](./backend/.env.example) for Ollama, embedding model, WhisperX, upload limits, ChromaDB persistence, and server `HOST` / `PORT`.

## Acknowledgments

- Theme code from [tweakcn](https://github.com/jnsahaj/tweakcn)

## Contribution

PRs of all sizes are welcome.
