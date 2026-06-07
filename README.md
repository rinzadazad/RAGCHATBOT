# RAG Chatbot — Production-Ready AI Knowledge Assistant

A full-stack Retrieval-Augmented Generation chatbot built with FastAPI, React 19, ChromaDB, and Groq LLM.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, ShadCN UI, TanStack Query, Zustand |
| **Backend** | FastAPI, SQLAlchemy, PostgreSQL, Alembic, Pydantic |
| **LLM** | Groq API (Llama 3.3 70B, Llama 3.1 8B, DeepSeek R1) |
| **Embeddings** | sentence-transformers / BAAI/bge-small-en-v1.5 |
| **Vector DB** | ChromaDB (local persistent) |
| **Auth** | JWT (python-jose) + bcrypt |

---

## Features

- **ChatGPT-like chat interface** with streaming responses
- **Document upload** — PDF, DOCX, TXT with drag & drop
- **RAG pipeline** — automatic chunking, embedding, retrieval
- **RAG debug panel** — view retrieved chunks, scores, token usage
- **Chat history** — persistent conversations with rename/delete
- **Chat search** — full-text search across all conversations
- **Settings** — configurable LLM params (temp, tokens) and RAG params (chunk size, top-k)
- **Dark/Light mode**
- **JWT authentication** with register/login

---

## Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **PostgreSQL** running locally
- **Groq API key** — get one free at https://console.groq.com

---

## Quick Start (Local Development)

### 1. Clone & set up environment

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE rag_chatbot;"
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your GROQ_API_KEY
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/rag_chatbot
GROQ_API_KEY=gsk_your_key_here
SECRET_KEY=your_random_secret_key_here
```

### 3. Initialize database

```bash
# Run Alembic migrations (or let the app auto-create tables)
cd backend
alembic upgrade head

# OR just start the server — tables are auto-created on startup
```

### 4. Start the backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Visit: http://localhost:8000/docs for the interactive API docs.

### 5. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Visit: http://localhost:5173

---

## Docker Deployment

```bash
# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your GROQ_API_KEY

# Build and start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## Project Structure

```
RAG CHATBOT/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── auth/         # JWT handler, password hashing
│   │   ├── database/     # SQLAlchemy engine & session
│   │   ├── models/       # ORM models (User, Document, Conversation, Message, Settings)
│   │   ├── rag/          # Chunker, embeddings, ChromaDB retriever, pipeline
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic (auth, document, RAG, LLM)
│   │   ├── utils/        # File extraction utilities
│   │   └── main.py       # FastAPI app factory
│   ├── uploads/          # Uploaded documents
│   ├── chroma_db/        # ChromaDB vector store
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── components/   # Reusable UI components
        ├── pages/        # Route-level page components
        ├── services/     # API client functions
        ├── store/        # Zustand state stores
        ├── layouts/      # Main & Auth layouts
        ├── routes/       # Protected/public route guards
        ├── types/        # TypeScript interfaces
        └── App.tsx       # Router & providers
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, receive JWT |
| GET | `/documents` | List all documents |
| POST | `/documents/upload` | Upload files (multipart) |
| DELETE | `/documents/{id}` | Delete document + vectors |
| POST | `/documents/reindex` | Re-process documents |
| GET | `/documents/stats` | Dashboard statistics |
| POST | `/chat` | Send message, get RAG answer |
| POST | `/chat/stream` | Streaming SSE response |
| GET | `/chat/history` | All conversations |
| GET | `/chat/{id}` | Conversation + messages |
| DELETE | `/chat/{id}` | Delete conversation |
| GET | `/search/chats` | Full-text search |
| GET | `/settings` | Get user settings |
| PUT | `/settings` | Update settings |
| GET | `/settings/models` | Available LLM models |

---

## Supported Models (Groq)

| Model ID | Description |
|---|---|
| `llama-3.3-70b-versatile` | Best quality, general-purpose |
| `llama-3.1-8b-instant` | Fastest, lightweight |
| `deepseek-r1-distill-llama-70b` | Reasoning-focused |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `GROQ_API_KEY` | — | **Required** Groq API key |
| `SECRET_KEY` | — | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime (24h) |
| `CHROMA_DB_PATH` | `./chroma_db` | Vector store path |
| `UPLOAD_DIR` | `./uploads` | Document storage path |
| `MAX_FILE_SIZE_MB` | `50` | Max upload size |
| `ALLOWED_ORIGINS` | `localhost:5173` | CORS allowed origins |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

---

## Security

- JWT tokens with configurable expiry
- bcrypt password hashing
- CORS protection
- File type & size validation
- API rate limiting via slowapi
- Input sanitization

---

## License

MIT
# RAGCHATBOT
