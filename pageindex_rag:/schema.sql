CREATE TABLE documents (
  id UUID PRIMARY KEY,
  source_file_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  last_modified TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE sections (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  parent_id UUID,
  title TEXT,
  level INT,
  summary TEXT,
  content TEXT
);