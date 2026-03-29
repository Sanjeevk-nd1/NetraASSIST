CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_file_id TEXT UNIQUE NOT NULL,
  repository_key TEXT DEFAULT 'knowledge',
  document_type TEXT,
  name TEXT NOT NULL,
  web_url TEXT,
  etag TEXT,
  last_modified TIMESTAMP NOT NULL,
  drive_id TEXT,
  site_id TEXT,
  path TEXT,
  is_deleted BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  index_version INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  parent_id UUID,
  title TEXT,
  level INT,
  summary TEXT,
  content TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id TEXT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(500) NOT NULL,
  original_filepath TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed', 'canceling', 'canceled')),
  total_questions INT DEFAULT 0,
  processed_count INT DEFAULT 0,
  accepted_count INT DEFAULT 0,
  cached_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  cancel_requested BOOLEAN DEFAULT false,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  result_filepath TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batch_jobs(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  sources JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'answered', 'accepted', 'error', 'canceled')),
  cached BOOLEAN DEFAULT false,
  llm_model TEXT,
  retrieval_strategy TEXT,
  latency_ms INT,
  error_details TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answer_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_hash TEXT UNIQUE NOT NULL,
  normalized_question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  model TEXT,
  retrieval_strategy TEXT,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS repository_key TEXT DEFAULT 'knowledge';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS index_version INT DEFAULT 0;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS cached_count INT DEFAULT 0;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN DEFAULT false;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE batch_questions ADD COLUMN IF NOT EXISTS cached BOOLEAN DEFAULT false;
ALTER TABLE batch_questions ADD COLUMN IF NOT EXISTS llm_model TEXT;
ALTER TABLE batch_questions ADD COLUMN IF NOT EXISTS retrieval_strategy TEXT;
ALTER TABLE batch_questions ADD COLUMN IF NOT EXISTS latency_ms INT;
ALTER TABLE batch_questions ADD COLUMN IF NOT EXISTS error_details TEXT;
ALTER TABLE batch_questions ADD COLUMN IF NOT EXISTS sheet_name TEXT DEFAULT 'Sheet1';
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS detected_columns JSONB DEFAULT '{}';
ALTER TABLE batch_jobs DROP CONSTRAINT IF EXISTS batch_jobs_status_check;
ALTER TABLE batch_jobs ADD CONSTRAINT batch_jobs_status_check CHECK (status IN ('uploaded', 'processing', 'completed', 'failed', 'canceling', 'canceled'));
ALTER TABLE batch_questions DROP CONSTRAINT IF EXISTS batch_questions_status_check;
ALTER TABLE batch_questions ADD CONSTRAINT batch_questions_status_check CHECK (status IN ('pending', 'processing', 'answered', 'accepted', 'error', 'canceled'));

CREATE INDEX IF NOT EXISTS idx_batch_jobs_user ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_questions_batch ON batch_questions(batch_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_document ON sections(document_id);
CREATE INDEX IF NOT EXISTS idx_sections_content ON sections USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_sections_title_content ON sections USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')));
CREATE INDEX IF NOT EXISTS idx_documents_repository_key ON documents(repository_key);
CREATE INDEX IF NOT EXISTS idx_answer_cache_hash ON answer_cache(question_hash);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
