import { Cpu, Database, Layers, GitBranch, Zap, Server, Shield, RefreshCw, ArrowRight, ArrowDown, Search, Brain, FileText, CheckCircle, XCircle, TreePine } from 'lucide-react';

/* ── reusable blocks ── */
function ArchBlock({ icon: Icon, title, children, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-light text-brand',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    purple: 'bg-purple-500/10 text-purple-600',
  };
  return (
    <div className="panel-card p-6">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <h3 className="text-base font-extrabold text-dark">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-7 text-dark-secondary">{children}</div>
    </div>
  );
}

function CompareCol({ title, icon: Icon, items, good }) {
  return (
    <div className={`flex-1 rounded-2xl border p-6 ${good ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${good ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}>
          <Icon size={20} />
        </div>
        <h4 className="text-base font-extrabold text-dark">{title}</h4>
      </div>
      <ul className="space-y-2.5 text-sm text-muted">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            {good
              ? <CheckCircle size={15} className="mt-0.5 flex-shrink-0 text-emerald-500" />
              : <XCircle size={15} className="mt-0.5 flex-shrink-0 text-red-400" />}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="space-y-12 animate-fade-up">

          {/* ═══════ Hero ═══════ */}
          <div className="page-section hero-section">
            <div className="section-kicker">
              <Cpu size={15} />
              Under the Hood
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-dark lg:text-4xl">
              How NetraASSIST Works
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              A deep dive into the technology that powers NetraASSIST — from document ingestion and the PageIndex vectorless RAG engine to the batch processing queue, LLM orchestration, and how it outperforms traditional vector-based retrieval.
            </p>
          </div>

          {/* ═══════ End-to-End Flow ═══════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><Layers size={15} /> Overview</div>
              <h2 className="text-2xl font-extrabold text-dark">End-to-End Data Flow</h2>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-bold">
              {[
                { label: 'SharePoint Documents', color: 'bg-purple-500/10 text-purple-700' },
                { label: 'Document Ingestion', color: 'bg-amber-500/10 text-amber-700' },
                { label: 'PageIndex Engine', color: 'bg-brand-light text-brand' },
                { label: 'PostgreSQL DB', color: 'bg-emerald-500/10 text-emerald-700' },
                { label: 'RAG Pipeline', color: 'bg-brand-light text-brand' },
                { label: 'LLM Generation', color: 'bg-purple-500/10 text-purple-700' },
                { label: 'User Response', color: 'bg-emerald-500/10 text-emerald-700' },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className={`rounded-xl px-4 py-2 ${item.color}`}>{item.label}</span>
                  {i < 6 && <ArrowRight size={16} className="text-muted-lighter" />}
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION A — THE PROBLEM WITH TRADITIONAL RAG
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><Search size={15} /> The Problem</div>
              <h2 className="text-2xl font-extrabold text-dark">Why Traditional Vector RAG Breaks on Complex Documents</h2>
            </div>

            <div className="mt-4 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                Most RAG systems today follow a standard pipeline: split documents into fixed-size chunks (300–500 tokens), embed each chunk into a dense vector, store them in a vector database (Pinecone, Weaviate, FAISS, pgvector), and at query time retrieve the top-k nearest vectors by cosine similarity.
              </p>
              <p>
                This works for short, generic text. It <strong className="text-dark">falls apart on long, structured documents</strong> like security questionnaires, RFPs, financial reports, and compliance filings — exactly the kind NetraASSIST handles.
              </p>

              {/* Visual: Traditional RAG pipeline */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                <h4 className="font-bold text-dark mb-4">Traditional Vector RAG Pipeline</h4>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                  <span className="rounded-lg bg-surface px-3 py-2 text-muted">Document</span>
                  <ArrowRight size={12} className="text-muted-lighter" />
                  <span className="rounded-lg bg-red-500/10 px-3 py-2 text-red-600">Hard Chunk (512 tokens)</span>
                  <ArrowRight size={12} className="text-muted-lighter" />
                  <span className="rounded-lg bg-red-500/10 px-3 py-2 text-red-600">Embed → Vectors</span>
                  <ArrowRight size={12} className="text-muted-lighter" />
                  <span className="rounded-lg bg-red-500/10 px-3 py-2 text-red-600">Vector DB</span>
                  <ArrowRight size={12} className="text-muted-lighter" />
                  <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700">Top-k Similarity</span>
                  <ArrowRight size={12} className="text-muted-lighter" />
                  <span className="rounded-lg bg-surface px-3 py-2 text-muted">LLM Answer</span>
                </div>
              </div>

              {/* Failure modes */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: 'Context Loss from Chunking',
                    desc: 'A policy table gets cut in half. The header row is in chunk 14, the data row you need is in chunk 15. Neither chunk alone answers the question.',
                    icon: FileText,
                  },
                  {
                    title: 'Similarity ≠ Relevance',
                    desc: 'A 200-page report may mention "access control" 60 times. Vector search ranks all 60 instances equally. The one that actually answers your question may never surface in the top-3.',
                    icon: Search,
                  },
                  {
                    title: 'Cross-Reference Blindness',
                    desc: 'Page 12 says "see Appendix B for details." Appendix B is on page 87. Vector RAG has no mechanism to follow that reference — it doesn\'t understand document structure.',
                    icon: GitBranch,
                  },
                  {
                    title: 'Query–Knowledge Mismatch',
                    desc: 'Queries express intent, not content. Asking "How do you handle incidents?" won\'t match the section titled "NIST 800-61 Compliance Matrix" even though that\'s the exact answer.',
                    icon: Brain,
                  },
                  {
                    title: 'No Chat Context',
                    desc: 'Each query is treated independently. The retriever doesn\'t know what was asked before — "What about liabilities?" after a revenue question gets no context.',
                    icon: Database,
                  },
                  {
                    title: 'Benchmark Reality',
                    desc: 'On FinanceBench (industry-standard QA benchmark), traditional vector RAG scores approximately 30–50% accuracy on complex documents. Not production-ready.',
                    icon: XCircle,
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                      <item.icon size={17} className="text-red-500" />
                    </div>
                    <h4 className="text-sm font-bold text-dark">{item.title}</h4>
                    <p className="mt-2 text-xs leading-5 text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION B — WHAT IS VECTORLESS RAG?
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><TreePine size={15} /> Core Innovation</div>
              <h2 className="text-2xl font-extrabold text-dark">What Is Vectorless RAG?</h2>
            </div>

            <div className="mt-4 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                Vectorless RAG is a retrieval approach that <strong className="text-dark">replaces semantic similarity search with LLM-powered reasoning over a structured document index</strong>. No embeddings, no vector database, no approximate nearest-neighbor search.
              </p>

              {/* Three pillars visual */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
                    <Database size={24} className="text-brand" />
                  </div>
                  <h4 className="font-extrabold text-dark">No Vector DB</h4>
                  <p className="mt-2 text-xs leading-5 text-muted">Document structure and LLM reasoning replace vector similarity search entirely.</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Layers size={24} className="text-emerald-600" />
                  </div>
                  <h4 className="font-extrabold text-dark">No Chunking</h4>
                  <p className="mt-2 text-xs leading-5 text-muted">Documents are organized into natural sections that reflect their actual structure, not arbitrary token windows.</p>
                </div>
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
                    <Brain size={24} className="text-purple-600" />
                  </div>
                  <h4 className="font-extrabold text-dark">Human-like Retrieval</h4>
                  <p className="mt-2 text-xs leading-5 text-muted">Simulates how a human expert navigates a book — check the table of contents, find the relevant section, read it.</p>
                </div>
              </div>

              {/* Vectorless RAG Architecture Diagram */}
              <div className="rounded-2xl border border-border-lighter bg-surface-card p-6">
                <h4 className="font-bold text-dark mb-6 text-xs uppercase tracking-wider text-center">Vectorless RAG Architecture Overview</h4>

                {/* Row 1: Document → Parse → Tree Index */}
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                  <div className="rounded-2xl border-2 border-blue-500/40 bg-blue-500/10 px-5 py-3.5 text-center min-w-[130px]">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">📄 Document</p>
                    <p className="text-[11px] text-blue-500/70 dark:text-blue-400/60">(DOCX / PDF / XLSX)</p>
                  </div>
                  <ArrowRight size={18} className="text-muted-lighter shrink-0" />
                  <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 px-5 py-3.5 text-center min-w-[120px]">
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Parse &</p>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Structure</p>
                  </div>
                  <ArrowRight size={18} className="text-muted-lighter shrink-0" />
                  <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 px-5 py-3.5 text-center min-w-[150px]">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">🌲 Tree Index</p>
                    <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60">(Hierarchical ToC)</p>
                  </div>
                </div>

                {/* Down arrow */}
                <div className="flex justify-center my-2">
                  <ArrowDown size={20} className="text-muted-lighter" />
                </div>

                {/* Row 2: User Query → LLM Reasoning → Retrieve */}
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                  <div className="rounded-2xl border-2 border-purple-500/40 bg-purple-500/10 px-5 py-3.5 text-center min-w-[130px]">
                    <p className="text-sm font-bold text-purple-700 dark:text-purple-400">❓ User Query</p>
                    <p className="text-[11px] text-purple-500/70 dark:text-purple-400/60">(Natural Language)</p>
                  </div>
                  <ArrowRight size={18} className="text-muted-lighter shrink-0" />
                  <div className="rounded-2xl border-[2.5px] border-amber-500/50 bg-amber-500/10 px-6 py-3.5 text-center min-w-[250px]">
                    <p className="text-sm font-extrabold text-amber-800 dark:text-amber-300">🧠 LLM Reasoning over Tree</p>
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70">"Which sections answer this question?"</p>
                  </div>
                  <ArrowRight size={18} className="text-muted-lighter shrink-0" />
                  <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 px-5 py-3.5 text-center min-w-[110px]">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">📋 Retrieve</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Sections</p>
                  </div>
                </div>

                {/* Down arrow */}
                <div className="flex justify-center my-2">
                  <ArrowDown size={20} className="text-muted-lighter" />
                </div>

                {/* Row 3: Answer */}
                <div className="flex justify-center">
                  <div className="rounded-2xl border-[2.5px] border-emerald-500/50 bg-emerald-500/10 px-8 py-3.5 text-center">
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">✅ Sourced Answer</p>
                  </div>
                </div>

                <p className="mt-5 text-center text-xs text-muted">
                  Documents are parsed into a hierarchical tree, then the LLM reasons over that tree structure to find and retrieve the most relevant sections.
                </p>
              </div>

              <div className="info-note">
                <p className="info-note-text text-sm">
                  <strong className="info-note-title">The key insight:</strong> Similarity does not equal relevance. A vector database finds the text most <em>similar</em> to your query. But relevance sometimes requires understanding structure, following references, and reasoning across sections. PageIndex achieves <strong>98.7% accuracy</strong> on FinanceBench vs ~50% for traditional vector RAG.
                </p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION C — HOW PAGEINDEX WORKS — ARCHITECTURE
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><Cpu size={15} /> Architecture</div>
              <h2 className="text-2xl font-extrabold text-dark">How PageIndex Works — The Two-Step Architecture</h2>
            </div>

            <div className="mt-4 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                PageIndex performs retrieval in exactly <strong className="text-dark">two steps</strong> — building a tree index and reasoning-based tree search. This is fundamentally different from the embed→store→search→retrieve pipeline of vector RAG.
              </p>
            </div>

            {/* STEP 1: Tree Index */}
            <div className="mt-8 rounded-2xl border border-brand/20 bg-surface-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">1</span>
                <h3 className="text-lg font-extrabold text-dark">Build the Tree Index</h3>
              </div>

              <div className="space-y-4 text-sm leading-7 text-dark-secondary">
                <p>
                  When a document is ingested, PageIndex does <strong className="text-dark">not</strong> embed it. Instead, it analyzes the document's structure and generates a <strong className="text-dark">hierarchical tree — an intelligent Table of Contents (ToC)</strong>. Each node in the tree has:
                </p>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Title', desc: 'The section name (e.g., "Incident Response")' },
                    { label: 'Summary', desc: 'What the section covers, auto-generated' },
                    { label: 'Page Range', desc: 'Which pages this node covers' },
                    { label: 'Child Nodes', desc: 'Subsections forming the hierarchy' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-surface-light px-4 py-3">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-brand">{item.label}</p>
                      <p className="mt-1 text-xs text-muted">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Visual tree representation */}
                <div className="rounded-2xl border border-border-lighter bg-surface p-5">
                  <h4 className="font-bold text-dark mb-4 text-xs uppercase tracking-wider">Example: Tree Index of a Security Policy Document</h4>
                  <div className="font-mono text-xs leading-6 text-dark-secondary overflow-x-auto">
                    <div className="text-brand font-bold">📄 Information Security Policy Manual</div>
                    <div className="ml-4">
                      <div>├── <span className="text-emerald-600 font-semibold">1. Introduction</span> <span className="text-muted-lighter">(pages 1-3)</span></div>
                      <div>│&nbsp;&nbsp; ├── 1.1 Purpose &amp; Scope</div>
                      <div>│&nbsp;&nbsp; └── 1.2 Definitions</div>
                      <div>├── <span className="text-emerald-600 font-semibold">2. Access Control</span> <span className="text-muted-lighter">(pages 4-12)</span></div>
                      <div>│&nbsp;&nbsp; ├── 2.1 User Authentication</div>
                      <div>│&nbsp;&nbsp; ├── 2.2 Role-Based Access</div>
                      <div>│&nbsp;&nbsp; └── 2.3 Privileged Access Management</div>
                      <div>├── <span className="text-emerald-600 font-semibold">3. Incident Response</span> <span className="text-muted-lighter">(pages 13-22)</span></div>
                      <div>│&nbsp;&nbsp; ├── 3.1 Detection &amp; Classification</div>
                      <div>│&nbsp;&nbsp; ├── 3.2 Response Procedures</div>
                      <div>│&nbsp;&nbsp; └── 3.3 Post-Incident Review</div>
                      <div>├── <span className="text-emerald-600 font-semibold">4. Data Protection</span> <span className="text-muted-lighter">(pages 23-31)</span></div>
                      <div>│&nbsp;&nbsp; ├── 4.1 Encryption Standards</div>
                      <div>│&nbsp;&nbsp; └── 4.2 Data Classification</div>
                      <div>└── <span className="text-emerald-600 font-semibold">Appendix A: Compliance Matrix</span> <span className="text-muted-lighter">(pages 32-40)</span></div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted">
                    This tree is stored as a JSON structure — not in a vector database. The full tree fits in a context window and can be inspected directly by the LLM.
                  </p>
                </div>
              </div>
            </div>

            {/* STEP 2: Reasoning-Based Search */}
            <div className="mt-6 rounded-2xl border border-purple-500/20 bg-surface-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">2</span>
                <h3 className="text-lg font-extrabold text-dark">Reasoning-Based Tree Search</h3>
              </div>

              <div className="space-y-4 text-sm leading-7 text-dark-secondary">
                <p>
                  When a query arrives, PageIndex passes the tree structure to the LLM and asks it to <strong className="text-dark">reason about which nodes are most likely to contain the answer</strong>. The LLM reads node titles and summaries, applies domain reasoning, and returns a ranked list of node IDs to retrieve.
                </p>

                {/* Reasoning Flow Diagram */}
                <div className="rounded-2xl border border-border-lighter bg-surface-card p-6">
                  <h4 className="font-bold text-dark mb-5 text-xs uppercase tracking-wider">The Iterative Retrieval Loop</h4>

                  {/* Top row: Question → Read ToC → Select Section */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
                    <div className="rounded-xl border-2 border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-center min-w-[110px]">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400">User</p>
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Question</p>
                    </div>
                    <ArrowRight size={16} className="text-blue-500/60 shrink-0" />
                    <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-center min-w-[120px]">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">① Read Table</p>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">of Contents</p>
                    </div>
                    <ArrowRight size={16} className="text-emerald-500/60 shrink-0" />
                    <div className="rounded-xl border-2 border-purple-500/40 bg-purple-500/10 px-4 py-2.5 text-center min-w-[130px]">
                      <p className="text-xs font-bold text-purple-700 dark:text-purple-400">② Select</p>
                      <p className="text-xs font-bold text-purple-700 dark:text-purple-400">Relevant Section</p>
                    </div>
                  </div>

                  {/* Down arrow */}
                  <div className="flex justify-center my-2">
                    <ArrowDown size={16} className="text-purple-500/60" />
                  </div>

                  {/* Extract */}
                  <div className="flex justify-center">
                    <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-center min-w-[130px]">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">③ Extract</p>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Information</p>
                    </div>
                  </div>

                  {/* Down arrow */}
                  <div className="flex justify-center my-2">
                    <ArrowDown size={16} className="text-emerald-500/60" />
                  </div>

                  {/* Decision diamond + branches */}
                  <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
                    {/* No → loop back label */}
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        No → Loop&nbsp;to&nbsp;①
                      </span>
                      <ArrowRight size={14} className="text-amber-500/50 rotate-180 shrink-0" />
                    </div>

                    {/* Diamond */}
                    <div className="relative flex h-[72px] w-[72px] items-center justify-center shrink-0" style={{ transform: 'rotate(45deg)' }}>
                      <div className="absolute inset-0 rounded-xl border-2 border-amber-500/50 bg-amber-500/10" />
                      <div className="text-center" style={{ transform: 'rotate(-45deg)' }}>
                        <p className="text-[10px] font-bold leading-tight text-amber-700 dark:text-amber-300">④</p>
                        <p className="text-[9px] font-bold leading-tight text-amber-700 dark:text-amber-300">Enough?</p>
                      </div>
                    </div>

                    {/* Yes → answer */}
                    <div className="flex items-center gap-2">
                      <ArrowRight size={14} className="text-emerald-500/60 shrink-0" />
                      <span className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        Yes →
                      </span>
                    </div>
                  </div>

                  {/* Down arrow */}
                  <div className="flex justify-center my-2">
                    <ArrowDown size={16} className="text-emerald-500/60" />
                  </div>

                  {/* Final answer */}
                  <div className="flex justify-center">
                    <div className="rounded-xl border-[2.5px] border-emerald-500/50 bg-emerald-500/10 px-6 py-3 text-center">
                      <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">⑤ Generate Complete Answer</p>
                    </div>
                  </div>

                  <p className="mt-4 text-center text-xs text-muted">
                    The LLM iterates through ToC → Section → Extract until it gathers sufficient context, then produces a sourced answer.
                  </p>
                </div>

                <p>
                  This is the key difference from vector RAG. A vector database computes cosine similarity scores for all chunks in parallel. PageIndex asks the LLM: <em>"Given this document structure and this question, where should I look?"</em>
                </p>
                <p>
                  The LLM can <strong className="text-dark">follow cross-references</strong> ("see Appendix B"), <strong className="text-dark">identify that a multi-part question requires two separate sections</strong>, and <strong className="text-dark">reason like a human analyst</strong> — returning a full reasoning trace showing exactly which nodes were visited and why.
                </p>
              </div>
            </div>

            {/* The JSON tree example */}
            <div className="mt-6 rounded-2xl border border-border-lighter bg-surface-card p-6">
              <h4 className="font-bold text-dark mb-3">The In-Context Index</h4>
              <p className="text-sm text-muted mb-4">
                Unlike a vector database which stores an external, static embeddings index, the JSON-based tree index resides <strong className="text-dark">within the LLM's active reasoning context</strong>. This enables in-context reasoning-driven retrieval — the model can directly reference, navigate, and reason over the index during inference.
              </p>
              <div className="rounded-xl bg-surface p-4 font-mono text-xs leading-6 text-dark-secondary overflow-x-auto">
                <pre className="whitespace-pre-wrap">{`{
  "node_id": "0006",
  "title": "Incident Response",
  "summary": "Procedures for detecting, classifying,
              and responding to security incidents...",
  "page_range": "13-22",
  "sub_nodes": [
    {
      "node_id": "0007",
      "title": "Detection & Classification",
      "summary": "How the organization monitors and
                  categorizes security events..."
    },
    {
      "node_id": "0008",
      "title": "Response Procedures",
      "summary": "Step-by-step incident response workflow
                  aligned with NIST 800-61..."
    }
  ]
}`}</pre>
              </div>
              <p className="mt-3 text-xs text-muted">
                Each <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-bold">node_id</code> maps directly to the raw content (text, tables, images). The LLM selects nodes by reasoning, then retrieves their full content for answer generation.
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION D — SIDE-BY-SIDE COMPARISON
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><Zap size={15} /> Comparison</div>
              <h2 className="text-2xl font-extrabold text-dark">Vectorless RAG vs Traditional Vector RAG</h2>
            </div>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row">
              <CompareCol
                title="Traditional Vector RAG"
                icon={Database}
                good={false}
                items={[
                  'Hard chunking (512 tokens) breaks semantic integrity',
                  'Relies on cosine similarity — similar ≠ relevant',
                  'Cannot follow in-document cross-references',
                  'Each query isolated — no chat context awareness',
                  'Approximate nearest-neighbor — results not reproducible',
                  'Requires embedding generation + vector DB infrastructure',
                  '~30–50% accuracy on complex document benchmarks',
                ]}
              />
              <CompareCol
                title="Vectorless RAG (PageIndex)"
                icon={TreePine}
                good={true}
                items={[
                  'Natural sections preserve full semantic context',
                  'LLM reasons about relevance, not just similarity',
                  'Follows "see Appendix B" references via tree navigation',
                  'Multi-turn context-aware retrieval across questions',
                  'Deterministic, auditable — full reasoning trace',
                  'No embeddings, no vector DB — just PostgreSQL + LLM',
                  '98.7% accuracy on FinanceBench benchmark',
                ]}
              />
            </div>

            {/* Detailed comparison table */}
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border-lighter">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-lighter bg-surface-card">
                    <th className="px-5 py-3.5 text-left font-bold text-dark">Challenge</th>
                    <th className="px-5 py-3.5 text-left font-bold text-red-500">Vector RAG</th>
                    <th className="px-5 py-3.5 text-left font-bold text-emerald-600">PageIndex RAG</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  {[
                    ['Query–Knowledge Mismatch', 'Matches surface-level similarity; often misses true context', 'Uses inference to identify the most relevant document sections'],
                    ['Semantic Similarity', 'Retrieves similar but irrelevant chunks', 'Retrieves contextually relevant information via reasoning'],
                    ['Hard Chunking', 'Fixed-length chunks fragment meaning', 'Coherent sections retrieved dynamically'],
                    ['Chat Context', 'Each query is isolated', 'Multi-turn reasoning considers prior context'],
                    ['Cross-References', 'Cannot follow internal document links', 'Follows in-text references via ToC tree navigation'],
                    ['Traceability', 'Returns a chunk — hard to trace to source', 'Returns exact section, page range, and reasoning trace'],
                    ['Infrastructure', 'Embedding model + Vector DB + retrieval service', 'PostgreSQL + LLM — simpler, fewer moving parts'],
                  ].map(([challenge, vector, pageindex], i) => (
                    <tr key={i} className="border-b border-border-lighter last:border-0">
                      <td className="px-5 py-3 font-semibold text-dark">{challenge}</td>
                      <td className="px-5 py-3">{vector}</td>
                      <td className="px-5 py-3">{pageindex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Benchmark visual */}
            <div className="mt-6 rounded-2xl border border-border-lighter bg-surface-card p-6">
              <h4 className="font-bold text-dark mb-4">FinanceBench Accuracy Benchmark</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-dark">PageIndex (Vectorless RAG)</span>
                    <span className="text-sm font-extrabold text-emerald-600">98.7%</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '98.7%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-dark">Traditional Vector RAG</span>
                    <span className="text-sm font-extrabold text-red-500">~50%</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400" style={{ width: '50%' }} />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted">
                FinanceBench is the industry standard for evaluating LLMs on financial document QA, using real SEC filings requiring exact answers from complex 10-K and 10-Q reports. The 48.7 percentage point gap is not a marginal improvement — it's a fundamentally different class of result.
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION E — HOW NETRAASSIST IMPLEMENTS THIS
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><GitBranch size={15} /> Implementation</div>
              <h2 className="text-2xl font-extrabold text-dark">How NetraASSIST Implements PageIndex RAG</h2>
            </div>

            <div className="mt-4 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                NetraASSIST uses a custom implementation of the PageIndex philosophy tailored for security questionnaires and RFP documents. Here's the step-by-step pipeline from question to answer:
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {[
                {
                  step: 'Document Parsing & Hierarchy',
                  detail: 'Every document (DOCX, PDF, XLSX, PPTX) is converted to structured Markdown. The parser builds a hierarchical section tree by detecting heading levels (H1 → H2 → H3). Each section gets a unique ID, parent reference, title, and content — creating a navigable tree structure.',
                  color: 'bg-brand',
                },
                {
                  step: 'Section-Level Storage (No Chunking)',
                  detail: 'Instead of splitting text into arbitrary 512-token chunks, PageIndex stores sections at their natural document boundaries. A section titled "Incident Response Procedures" stays intact as one unit, preserving full context and meaning.',
                  color: 'bg-purple-600',
                },
                {
                  step: 'Keyword Extraction',
                  detail: 'When a question is asked, the system extracts meaningful keywords by splitting the question, removing 300+ English stopwords, and filtering short or irrelevant tokens.',
                  color: 'bg-amber-600',
                },
                {
                  step: 'Structural Retrieval',
                  detail: 'Keywords are used to search the sections table using PostgreSQL full-text search (ILIKE pattern matching). Up to 24 candidate documents and 12 relevant sections are retrieved, ranked by relevance.',
                  color: 'bg-brand',
                },
                {
                  step: 'Tree Reasoning (LLM-Powered)',
                  detail: 'When enabled, the LLM analyzes the document\'s table of contents tree and selects the most relevant section IDs before retrieval. This provides smarter, context-aware section selection — the LLM can follow cross-references and reason about multi-part questions.',
                  color: 'bg-purple-600',
                },
                {
                  step: 'Context Assembly & Answer Generation',
                  detail: 'Top matching sections (up to 18,000 characters) are assembled into a context block. The context, question, and a crafted system prompt go to the LLM, which generates a structured answer with source citations linking back to specific documents and sections.',
                  color: 'bg-emerald-600',
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 rounded-2xl border border-border-lighter bg-surface-card p-5">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${item.color} text-xs font-bold text-white`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-dark">{item.step}</p>
                    <p className="mt-1 text-sm text-muted">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Why vectorless for NetraASSIST */}
            <div className="mt-6">
              <div className="info-note">
                <h4 className="info-note-title text-sm font-bold mb-2">Why Vectorless RAG Is Perfect for Security Questionnaires</h4>
                <ul className="info-note-text space-y-1.5 text-sm">
                  <li>• <strong>No embedding costs</strong> — No need to generate and store vector embeddings for millions of tokens</li>
                  <li>• <strong>No vector database</strong> — PostgreSQL handles both storage and retrieval, simplifying the stack</li>
                  <li>• <strong>Instant updates</strong> — New documents are searchable immediately after ingestion, no re-indexing or re-embedding needed</li>
                  <li>• <strong>Structural awareness</strong> — Section hierarchy preserves document context that flat vector chunks lose</li>
                  <li>• <strong>Deterministic retrieval</strong> — Results are reproducible and auditable, unlike approximate nearest-neighbor search</li>
                  <li>• <strong>Cross-reference following</strong> — "See Section 4.2 for encryption standards" can be resolved by the reasoning engine</li>
                  <li>• <strong>Full traceability</strong> — Every answer cites the exact document and section it came from</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION F — BATCH PROCESSING
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><Server size={15} /> Infrastructure</div>
              <h2 className="text-2xl font-extrabold text-dark">Batch Processing &amp; Task Queue</h2>
            </div>

            <div className="mt-4 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                When you upload an Excel file with hundreds of questions, NetraASSIST doesn't process them sequentially in the web server. It uses a <strong className="text-dark">distributed task queue</strong> for reliable, concurrent processing.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <ArchBlock icon={Server} title="Celery Workers" color="brand">
                  <p>Each question is dispatched as an independent Celery task to a Redis-backed queue. Up to 4 workers process questions concurrently.</p>
                </ArchBlock>
                <ArchBlock icon={Database} title="Redis Broker" color="amber">
                  <p>Redis serves as both message broker and result backend. Tasks are acknowledged only after completion, ensuring no work is lost.</p>
                </ArchBlock>
                <ArchBlock icon={RefreshCw} title="Auto-Retry & Recovery" color="emerald">
                  <p>Rate-limited requests trigger exponential backoff retries (15s → 30s → 60s). Hard timeouts at 2 minutes prevent stuck tasks.</p>
                </ArchBlock>
              </div>

              <div className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                <h4 className="font-bold text-dark mb-3">Task Lifecycle</h4>
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-2 text-xs font-bold min-w-max py-2">
                    <span className="rounded-lg bg-surface px-3 py-1.5 text-muted">Pending</span>
                    <ArrowRight size={12} className="text-muted-lighter" />
                    <span className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-700">Processing</span>
                    <ArrowRight size={12} className="text-muted-lighter" />
                    <span className="rounded-lg bg-brand-light px-3 py-1.5 text-brand">RAG Pipeline</span>
                    <ArrowRight size={12} className="text-muted-lighter" />
                    <span className="rounded-lg bg-purple-500/10 px-3 py-1.5 text-purple-700">LLM Call</span>
                    <ArrowRight size={12} className="text-muted-lighter" />
                    <span className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-emerald-700">Answered</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted">
                  Each question follows this lifecycle independently. The system checks for cancellation both before and after the LLM call. When all questions reach a terminal state, the job auto-finalizes.
                </p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION G — LLM SERVICE & CIRCUIT BREAKER
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><Zap size={15} /> AI Engine</div>
              <h2 className="text-2xl font-extrabold text-dark">LLM Service &amp; Circuit Breaker</h2>
            </div>

            <div className="mt-4 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                NetraASSIST connects to <strong className="text-dark">Azure OpenAI Enterprise</strong> with a <strong className="text-dark">multi-deployment fallback chain</strong> and <strong className="text-dark">circuit breaker pattern</strong> for maximum reliability.
              </p>

              {/* Enterprise security callout */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Shield size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-dark">Enterprise-Grade Data Privacy</h4>
                    <p className="mt-1 text-sm text-muted">
                      NetraASSIST uses <strong className="text-dark">Azure OpenAI Enterprise deployments</strong> — your data is <strong className="text-dark">never used to train or improve OpenAI models</strong>. All API calls are processed within Microsoft's Azure infrastructure with enterprise SLAs, data residency guarantees, and compliance certifications (SOC 2, ISO 27001, GDPR). No information leaves the secure Azure boundary.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                <h4 className="font-bold text-dark mb-3">Deployment Priority Chain</h4>
                <div className="space-y-2">
                  {[
                    { role: 'Primary', desc: 'Main production deployment with highest token limit (16K)', priority: 'emerald' },
                    { role: 'Fallback 1', desc: 'Alternative deployment, activates if primary is rate-limited', priority: 'amber' },
                    { role: 'Fallback 2', desc: 'Ultra-reliable backup with reduced token limit (8K)', priority: 'brand' },
                  ].map((dep) => (
                    <div key={dep.role} className="flex items-center gap-4 rounded-xl bg-surface-light px-4 py-3">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${dep.priority === 'emerald' ? 'bg-emerald-500/10 text-emerald-700' : dep.priority === 'amber' ? 'bg-amber-500/10 text-amber-700' : 'bg-brand-light text-brand'}`}>
                        {dep.role}
                      </span>
                      <p className="text-xs text-muted">{dep.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                <h4 className="font-bold text-dark mb-3">Circuit Breaker Pattern</h4>
                <p className="text-sm text-muted mb-3">Each deployment has an independent circuit breaker:</p>
                <ul className="space-y-1.5 text-sm text-muted">
                  <li>• <strong className="text-dark">Closed (healthy):</strong> All requests pass through normally</li>
                  <li>• <strong className="text-dark">Open (tripped):</strong> After 3 consecutive failures, the circuit opens for a 30-second cooldown</li>
                  <li>• <strong className="text-dark">Half-open (testing):</strong> After cooldown, allows one test request. Success resets; failure re-opens</li>
                  <li>• <strong className="text-dark">Retry-After aware:</strong> Reads the Retry-After header from Azure and respects the wait time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              SECTION H — SHAREPOINT SYNC
             ═══════════════════════════════════════════════ */}
          <div className="page-section">
            <div className="section-header">
              <div className="section-kicker"><Shield size={15} /> Integration</div>
              <h2 className="text-2xl font-extrabold text-dark">SharePoint Knowledge Base Sync</h2>
            </div>

            <div className="mt-4 space-y-5 text-sm leading-7 text-dark-secondary">
              <p>
                The knowledge base is automatically synchronized from SharePoint using <strong className="text-dark">Microsoft Graph API delta queries</strong> for efficient change detection.
              </p>

              <div className="space-y-3">
                {[
                  { step: 'Authentication', desc: 'OAuth 2.0 client credentials flow via MSAL against Azure AD, scoped to Microsoft Graph API.' },
                  { step: 'Delta Sync', desc: 'Uses Graph API delta links to detect only new, modified, or deleted files since the last sync.' },
                  { step: 'Format Conversion', desc: 'Each file (DOCX, XLSX, PDF, PPTX) is converted to standardized Markdown with heading detection and structure preservation.' },
                  { step: 'PageIndex Ingestion', desc: 'Converted Markdown is parsed into the section tree hierarchy and stored in PostgreSQL with full parent-child relationships.' },
                  { step: 'Deduplication', desc: 'Documents are tracked by SharePoint DriveItem ID. Re-syncing updates existing records rather than creating duplicates.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 rounded-xl bg-surface-card border border-border-lighter px-5 py-4">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                    <div>
                      <p className="font-bold text-dark">{item.step}</p>
                      <p className="mt-1 text-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tech stack summary */}
          <div className="page-section text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Technology Stack</p>
            <h2 className="mt-3 text-2xl font-extrabold text-dark">Built on Proven Infrastructure</h2>
            <div className="mx-auto mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {[
                'Flask (Python API)',
                'React + Vite',
                'Tailwind CSS',
                'PostgreSQL',
                'Celery + Redis',
                'Azure OpenAI (Enterprise)',
                'Microsoft Graph API',
                'PageIndex Engine',
              ].map((tech) => (
                <div key={tech} className="rounded-xl border border-border-lighter bg-surface-card px-4 py-3 text-sm font-semibold text-dark-secondary">
                  {tech}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
