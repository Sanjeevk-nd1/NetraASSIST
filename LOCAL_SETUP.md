# NetraASSIST - Local Setup Guide

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **PostgreSQL 14+** (running locally or remote)

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd netra-assist
```

### 2. Set Up PostgreSQL Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE netraassist;"

# Or with a specific user
psql -U postgres -c "CREATE USER netrauser WITH PASSWORD 'yourpassword';"
psql -U postgres -c "CREATE DATABASE netraassist OWNER netrauser;"
```

### 3. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example "pageindex_rag:/.env"
```

Open `pageindex_rag:/.env` and fill in your credentials:

| Variable | Where to Get It |
|---|---|
| `AZURE_OPENAI_API_KEY` | Azure Portal > Your OpenAI resource > Keys and Endpoint |
| `AZURE_OPENAI_ENDPOINT` | Azure Portal > Your OpenAI resource > Keys and Endpoint |
| `AZURE_OPENAI_DEPLOYMENT` | Azure Portal > Your OpenAI resource > Model deployments |
| `AZURE_TENANT_ID` | Azure Portal > Azure Active Directory > Overview |
| `AZURE_CLIENT_ID` | Azure Portal > App registrations > Your app > Overview |
| `AZURE_CLIENT_SECRET` | Azure Portal > App registrations > Your app > Certificates & secrets |
| `SHAREPOINT_SITE_ID` | Microsoft Graph API: `GET /sites/{hostname}:/{site-path}` |
| `SHAREPOINT_DRIVE_ID` | Microsoft Graph API: `GET /sites/{site-id}/drives` |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `JWT_SECRET_KEY` | Any random string (run `python -c "import secrets; print(secrets.token_hex(32))"`) |

### 4. Install Python Dependencies

```bash
pip install flask flask-cors flask-jwt-extended sqlalchemy psycopg2-binary \
  python-dotenv openai openpyxl pandas bcrypt requests werkzeug
```

### 5. Install Node.js Dependencies

```bash
npm install
```

### 6. Initialize the Database

The database schema is automatically created on first run. The app reads `backend/schema.sql` and executes it during startup.

A default admin account is created automatically:
- **Email**: `admin@netraassist.com`
- **Password**: `admin123`

### 7. Build the Frontend (Production)

```bash
npm run build
```

### 8. Run the Application

**Option A: Development mode (hot reload)**

```bash
# Terminal 1 - Backend
python main.py

# Terminal 2 - Frontend dev server
npm run dev -- --port 5000
```

**Option B: Production mode**

```bash
# Build frontend first
npm run build

# Run backend (serves built frontend)
python main.py
```

The app will be available at:
- Development: `http://localhost:5000` (Vite proxy forwards `/api` to port 5001)
- Production: `http://localhost:5001` (Flask serves built frontend)

### 9. Verify Everything Works

1. Open `http://localhost:5000` (dev) or `http://localhost:5001` (prod)
2. Log in with `admin@netraassist.com` / `admin123`
3. Go to Admin Panel > Document Library > click "Sync SharePoint" to import documents
4. Try Document Processing: upload an Excel file with a "Question" column
5. Try AI Assistant: ask a question about your knowledge base

## Project Structure

```
netra-assist/
├── backend/
│   ├── app.py                 # Flask app entry, routes, default admin creation
│   ├── config.py              # Configuration class
│   ├── database.py            # SQLAlchemy engine/session
│   ├── schema.sql             # Database schema (auto-executed on startup)
│   ├── api/
│   │   ├── auth.py            # Login, register, JWT
│   │   ├── chat.py            # Chat conversations and messages
│   │   ├── admin.py           # User management, knowledge source, system prompt, audit logs
│   │   ├── downloads.py       # File downloads
│   │   └── docprocess.py      # Excel batch Q&A processing
│   └── services/
│       ├── llm_service.py     # Multi-LLM with fallback (3 Azure OpenAI configs)
│       └── rag_service.py     # RAG pipeline: keyword search + LLM answer generation
├── frontend/
│   └── src/
│       ├── pages/             # Login, Chat, DocProcessing, Downloads, Admin
│       ├── components/        # Layout (navbar + tabs)
│       └── contexts/          # AuthContext, ThemeContext
├── pageindex_rag:/            # Legacy RAG codebase + .env file location
├── main.py                    # Entry point: python main.py
├── start.sh                   # Development startup script
└── .env.example               # Template for environment variables
```

## Architecture Notes

### Multi-LLM Fallback (`backend/services/llm_service.py`)
- Tries up to 3 Azure OpenAI deployments in sequence
- If one fails (rate limit, timeout, etc.), automatically falls back to the next
- On token limit errors, trims conversation history and retries
- Configure fallbacks via `AZURE_OPENAI_DEPLOYMENT_FALLBACK` and `AZURE_OPENAI_DEPLOYMENT_FALLBACK_2`

### RAG Pipeline (`backend/services/rag_service.py`)
- **Vectorless approach**: Uses PostgreSQL keyword search (ILIKE) against document sections
- Documents are synced from SharePoint and split into sections stored in the `sections` table
- Search extracts keywords from the query, finds matching sections, ranks by content length
- Matched sections are assembled into context and sent to the LLM with the user's question
- The LLM is instructed to answer ONLY from the provided context (grounded generation)
- Source citations are extracted and returned alongside answers

### Accuracy Management
- System prompt instructs the LLM to use ONLY provided context
- If no relevant context is found, the LLM is instructed to say so clearly
- Source citations let users verify answers against original documents
- Admins can customize the system prompt to tune behavior
- Per-question review in Document Processing allows human verification before accepting answers
