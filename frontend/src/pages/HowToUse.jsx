import { BookOpen, Upload, Play, CheckCircle, Download, MessageSquare, Edit3, RotateCcw, Square, Eye, FileSpreadsheet, FolderOpen, Search, Send, Plus, Trash2, ArrowUp } from 'lucide-react';

/* ── Visual mockup illustrations (theme-aware, pure Tailwind) ── */
function UploadIllustration() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border-lighter bg-surface p-8 text-center animate-fade-up" style={{ animationDelay: '0.15s' }}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-light border-2 border-brand/30">
        <Upload size={22} className="text-brand" />
      </div>
      <p className="text-sm font-bold text-dark">Drag & drop your Excel file here</p>
      <p className="mt-1 text-xs text-muted">or click to browse — .xlsx, .xls up to 10MB</p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-light px-4 py-2">
        <FileSpreadsheet size={14} className="text-brand" />
        <span className="text-xs font-semibold text-brand">RFP_Questions.xlsx</span>
      </div>
    </div>
  );
}

function ProgressIllustration() {
  return (
    <div className="rounded-2xl border border-border-lighter bg-surface-card p-5 animate-fade-up" style={{ animationDelay: '0.2s' }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-dark">Processing: RFP_Questions.xlsx</p>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Running</span>
          <span className="rounded-md bg-red-500/15 px-2.5 py-1 text-[10px] font-bold text-red-600 dark:text-red-400">■ Stop</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-3 w-full rounded-full bg-surface-light overflow-hidden">
        <div className="h-full w-[65%] rounded-full bg-brand transition-all" />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>32 of 49 questions answered</span>
        <span>~3 min remaining</span>
      </div>
      {/* Sample rows */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-dark-secondary">Q1: What is the data retention policy?</span>
          <span className="ml-auto text-emerald-600 dark:text-emerald-400 font-semibold">✓ Answered</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
          <span className="text-dark-secondary">Q33: Describe encryption standards...</span>
          <span className="ml-auto text-brand font-semibold">⏳ Processing</span>
        </div>
      </div>
    </div>
  );
}

function ReviewIllustration() {
  return (
    <div className="rounded-2xl border border-border-lighter bg-surface-card p-5 animate-fade-up" style={{ animationDelay: '0.15s' }}>
      {/* Question header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border-lighter">
        <p className="text-xs font-bold text-dark">Q12: What is the incident response plan?</p>
        <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Answered</span>
      </div>
      {/* Answer preview */}
      <div className="mt-3 space-y-1 text-[11px] leading-5 text-dark-secondary">
        <p>The incident response plan follows a 6-phase approach:</p>
        <p>1. Preparation — Establish policies and tools...</p>
        <p>2. Identification — Detect and classify incidents...</p>
        <p className="text-muted">3. Containment — Limit the scope of the incident...</p>
      </div>
      {/* Action buttons */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">✓ Accept</button>
        <button className="rounded-lg border-2 border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[11px] font-bold text-blue-700 dark:text-blue-400">✎ Edit</button>
        <button className="rounded-lg border-2 border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">↻ Retry</button>
      </div>
    </div>
  );
}

function ChatIllustration() {
  return (
    <div className="rounded-2xl border border-border-lighter bg-surface-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.15s' }}>
      <div className="flex" style={{ minHeight: 200 }}>
        {/* Sidebar */}
        <div className="w-[130px] shrink-0 border-r border-border-lighter bg-surface p-3 hidden sm:block">
          <p className="text-[10px] font-bold text-dark mb-2">Conversations</p>
          <div className="rounded-md bg-brand-light px-2.5 py-1.5 text-center text-[10px] font-semibold text-brand mb-2">+ New Chat</div>
          <div className="space-y-1.5">
            {['Data retention policy', 'Encryption standards', 'Compliance checklist'].map((c) => (
              <div key={c} className="rounded-md border border-border-lighter bg-surface-card px-2 py-1.5 text-[9px] text-dark-secondary truncate">{c}</div>
            ))}
          </div>
        </div>
        {/* Chat main */}
        <div className="flex-1 flex flex-col p-4 gap-3">
          {/* User msg */}
          <div className="self-end max-w-[80%] rounded-xl bg-brand px-3.5 py-2">
            <p className="text-[11px] text-white font-medium">What is our PII data handling policy?</p>
          </div>
          {/* Bot msg */}
          <div className="self-start max-w-[85%] rounded-xl border border-border-lighter bg-surface p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-light text-[9px] font-bold text-brand">N</span>
              <span className="text-[10px] font-bold text-dark">NetraBOT</span>
            </div>
            <div className="text-[10px] leading-4 text-dark-secondary space-y-0.5">
              <p>Our PII handling policy follows a 3-tier classification system.</p>
              <p>Tier 1 (Sensitive): SSN, financial data — encrypted at rest...</p>
            </div>
            <p className="mt-1.5 text-[9px] text-muted">📋 Sources: Data Protection Policy §4.1</p>
          </div>
          {/* Input */}
          <div className="mt-auto flex items-center gap-2 rounded-lg border border-border-lighter bg-surface px-3 py-2">
            <span className="text-[10px] text-muted flex-1">Type your question...</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand text-white text-[10px]">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadIllustration() {
  return (
    <div className="rounded-2xl border border-border-lighter bg-surface-card p-4 overflow-x-auto animate-fade-up" style={{ animationDelay: '0.15s' }}>
      <table className="w-full text-[11px]" style={{ minWidth: 400 }}>
        <thead>
          <tr className="border-b border-border-lighter">
            <th className="py-2 px-3 text-left font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-tl-lg">Question</th>
            <th className="py-2 px-3 text-left font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">Answer</th>
            <th className="py-2 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">Status</th>
            <th className="py-2 px-3 text-left font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-tr-lg">Sources</th>
          </tr>
        </thead>
        <tbody className="text-dark-secondary">
          <tr className="border-b border-border-lighter/50">
            <td className="py-2 px-3">Data retention policy?</td>
            <td className="py-2 px-3">Our retention policy requires...</td>
            <td className="py-2 px-3 text-center"><span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Accepted</span></td>
            <td className="py-2 px-3 text-muted">§4.1, §4.2</td>
          </tr>
          <tr className="border-b border-border-lighter/50">
            <td className="py-2 px-3">Encryption standards?</td>
            <td className="py-2 px-3">AES-256 for data at rest...</td>
            <td className="py-2 px-3 text-center"><span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Accepted</span></td>
            <td className="py-2 px-3 text-muted">§3.1</td>
          </tr>
          <tr>
            <td className="py-2 px-3">Incident response plan?</td>
            <td className="py-2 px-3">The IR plan follows NIST...</td>
            <td className="py-2 px-3 text-center"><span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Answered</span></td>
            <td className="py-2 px-3 text-muted">§5.2, §5.3</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white shadow-md">
          {number}
        </div>
        <div className="mt-2 flex-1 w-px bg-border-light" />
      </div>
      <div className="pb-10">
        <h3 className="text-lg font-extrabold text-dark">{title}</h3>
        <div className="mt-3 space-y-3 text-sm leading-7 text-dark-secondary">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="rounded-xl border border-brand-light bg-brand-bg px-4 py-3 text-sm text-brand">
      <strong>Tip:</strong> {children}
    </div>
  );
}

export default function HowToUse() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-up">

          {/* Header */}
          <div className="page-section hero-section">
            <div className="section-kicker">
              <BookOpen size={15} />
              User Guide
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-dark lg:text-4xl">
              How to Use NetraASSIST
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              A complete step-by-step guide to all features. Follow these instructions to make the most of each feature — from uploading documents to exporting results.
            </p>
          </div>

          {/* Table of contents */}
          <div className="panel-card p-6">
            <h2 className="text-base font-extrabold text-dark mb-4">Quick Navigation</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { href: '#doc-processing', icon: FileSpreadsheet, label: '1. Document Processing' },
                { href: '#review-answers', icon: CheckCircle, label: '2. Review & Accept Answers' },
                { href: '#download-results', icon: Download, label: '3. Download Results' },
                { href: '#netrabot', icon: MessageSquare, label: '4. NetraBOT Chat' },
                { href: '#downloads-page', icon: FolderOpen, label: '5. Downloads Page' },
                { href: '#tips', icon: BookOpen, label: '6. Tips & Best Practices' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-dark-secondary transition-all hover:bg-surface-light hover:text-brand"
                >
                  <item.icon size={16} className="text-brand" />
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* ═══════════ Section 1: Document Processing ═══════════ */}
          <div id="doc-processing" className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <FileSpreadsheet size={15} />
                Feature 1
              </div>
              <h2 className="text-2xl font-extrabold text-dark">Document Processing</h2>
              <p className="text-sm text-muted">
                The core feature of NetraASSIST. Upload an Excel file containing questions, and the AI generates answers from your organization's knowledge base.
              </p>
            </div>

            {/* Visual: Upload Area */}
            <div className="mt-6">
              <UploadIllustration />
            </div>

            <div className="mt-8">
              <Step number={1} title="Prepare Your Excel File">
                <p>Your Excel file should contain a column with your questions. The system supports both <strong>.xlsx</strong> and <strong>.xls</strong> formats.</p>
                <div className="rounded-xl border border-border-lighter bg-surface-card p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-light mb-2">Column Detection Rules</p>
                  <ul className="space-y-1.5 text-sm text-muted">
                    <li>• The system auto-detects a column named <strong className="text-dark">"Question"</strong>, <strong className="text-dark">"Questions"</strong>, <strong className="text-dark">"Query"</strong>, or similar (case-insensitive)</li>
                    <li>• If no header row is found, the system treats each row's first non-empty cell as a question</li>
                    <li>• Multi-sheet files are fully supported — questions from all sheets are imported</li>
                    <li>• Maximum file size: <strong className="text-dark">10 MB</strong>, up to <strong className="text-dark">500 questions</strong></li>
                  </ul>
                </div>
                <Tip>Name your question column "Question" for the most reliable detection. If the wrong column is detected, rename it and re-upload.</Tip>
              </Step>

              <Step number={2} title="Upload the File">
                <p>Navigate to the <strong>Document Processing</strong> tab. You'll see an upload area at the top of the page.</p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Upload size={14} className="mt-1 flex-shrink-0 text-brand" />
                    <strong>Drag &amp; drop</strong> your file onto the upload zone, or <strong>click</strong> to browse
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="mt-1 flex-shrink-0 text-success" />
                    After upload, you'll see a confirmation showing how many questions were detected and which column was used per sheet
                  </li>
                </ul>
                <Tip>If the confirmation shows the wrong column, rename it to "Question" in your Excel and re-upload.</Tip>
              </Step>

              <Step number={3} title="Start Generation">
                <p>Once uploaded, your file appears in <strong>Previous Uploads</strong>. Click on it to open the job detail view.</p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Play size={14} className="mt-1 flex-shrink-0 text-brand" />
                    Click <strong>"Start Generating"</strong> to begin AI answer generation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 text-warning">⏳</span>
                    A progress bar shows real-time status. The page auto-refreshes every 2.5 seconds
                  </li>
                  <li className="flex items-start gap-2">
                    <Square size={14} className="mt-1 flex-shrink-0 text-danger" />
                    You can <strong>Stop</strong> at any time — already-answered questions are preserved
                  </li>
                </ul>
              </Step>

              {/* Visual: Progress & Generation */}
              <div className="ml-[3.75rem] -mt-4 mb-8">
                <ProgressIllustration />
              </div>

              <Step number={4} title="Stop & Resume">
                <p>Generation can be paused and resumed at any time:</p>
                <ul className="space-y-1.5">
                  <li>• Click <strong>"Stop"</strong> to halt processing. Questions in-flight will finish, pending ones are canceled.</li>
                  <li>• The job enters <strong>"Stopped"</strong> state. Click <strong>"Resume Generating"</strong> to continue where you left off.</li>
                  <li>• Already-answered questions are never re-processed — only pending and canceled ones are picked up on resume.</li>
                </ul>
              </Step>
            </div>
          </div>

          {/* ═══════════ Section 2: Review & Accept ═══════════ */}
          <div id="review-answers" className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <CheckCircle size={15} />
                Feature 2
              </div>
              <h2 className="text-2xl font-extrabold text-dark">Review &amp; Accept Answers</h2>
              <p className="text-sm text-muted">
                Every generated answer goes through a human review workflow before export.
              </p>
            </div>

            {/* Visual: Review Workflow */}
            <div className="mt-6">
              <ReviewIllustration />
            </div>

            <div className="mt-8">
              <Step number={1} title="Review Each Answer">
                <p>Each question card shows the question, AI-generated answer (with markdown formatting), status badge, and source documents used.</p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Eye size={14} className="mt-1 flex-shrink-0 text-brand" />
                    Click <strong>"View Sources"</strong> to see which documents and sections the AI used to generate the answer
                  </li>
                </ul>
              </Step>

              <Step number={2} title="Accept, Edit, or Retry">
                <p>For each answered question, you have three actions:</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-bold text-dark">Accept</p>
                      <p className="text-muted">Approve the answer as-is. It will be included in the export.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-blue-500/5 border border-blue-500/20 px-4 py-3">
                    <Edit3 size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
                    <div>
                      <p className="font-bold text-dark">Edit</p>
                      <p className="text-muted">Modify the answer text directly. Editing an accepted answer resets it to "Answered" for re-review.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                    <RotateCcw size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="font-bold text-dark">Retry</p>
                      <p className="text-muted">Regenerate the answer from scratch using the AI. Useful if the original answer missed key information.</p>
                    </div>
                  </div>
                </div>
              </Step>

              <Step number={3} title="Bulk Accept">
                <p>Click <strong>"Accept All"</strong> to approve all remaining "Answered" questions at once. This is useful after reviewing a batch where most answers are satisfactory.</p>
                <Tip>Review at least a sample of answers before using Accept All to ensure quality.</Tip>
              </Step>
            </div>
          </div>

          {/* ═══════════ Section 3: Download ═══════════ */}
          <div id="download-results" className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <Download size={15} />
                Feature 3
              </div>
              <h2 className="text-2xl font-extrabold text-dark">Download Results</h2>
            </div>

            {/* Visual: Download Excel */}
            <div className="mt-6">
              <DownloadIllustration />
            </div>

            <div className="mt-8">
              <Step number={1} title="Export to Excel">
                <p>From the job detail view, click the <strong>"Download"</strong> button (available once at least one answer exists).</p>
                <ul className="space-y-1.5">
                  <li>• The downloaded Excel file mirrors the original sheet structure</li>
                  <li>• Each sheet contains original questions plus new columns: <strong>Answer</strong>, <strong>Status</strong>, and <strong>Sources</strong></li>
                  <li>• Answers include full markdown formatting converted to rich text</li>
                  <li>• Multi-sheet files preserve all original sheets with their respective answers</li>
                </ul>
                <Tip>You can download at any point during processing — already-answered questions will be included even if the job isn't fully complete.</Tip>
              </Step>
            </div>
          </div>

          {/* ═══════════ Section 4: NetraBOT ═══════════ */}
          <div id="netrabot" className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <MessageSquare size={15} />
                Feature 4
              </div>
              <h2 className="text-2xl font-extrabold text-dark">NetraBOT — AI Chat Assistant</h2>
              <p className="text-sm text-muted">
                Ask any question in natural language and get comprehensive answers from your organization's knowledge base.
              </p>
            </div>

            {/* Visual: Chat Interface */}
            <div className="mt-6">
              <ChatIllustration />
            </div>

            <div className="mt-8">
              <Step number={1} title="Start a Conversation">
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Plus size={14} className="mt-1 flex-shrink-0 text-brand" />
                    Click <strong>"New Conversation"</strong> in the sidebar (or collapse the sidebar for more space)
                  </li>
                  <li className="flex items-start gap-2">
                    <Search size={14} className="mt-1 flex-shrink-0 text-brand" />
                    You can also click one of the <strong>suggested questions</strong> on the welcome screen to get started quickly
                  </li>
                </ul>
              </Step>

              <Step number={2} title="Ask Questions">
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Send size={14} className="mt-1 flex-shrink-0 text-brand" />
                    Type your question in the input box and press <strong>Enter</strong> (or click send)
                  </li>
                  <li>• The AI searches your entire knowledge base and responds with a detailed, structured answer</li>
                  <li>• Conversations maintain context — follow-up questions reference the conversation history</li>
                  <li>• Answers include markdown formatting (headings, bullet points, bold text)</li>
                </ul>
                <Tip>Be specific in your questions. Instead of "Tell me about security", ask "What is our policy for handling security incidents involving PII data?"</Tip>
              </Step>

              <Step number={3} title="Manage Conversations">
                <ul className="space-y-1.5">
                  <li>• All conversations are saved and accessible from the sidebar</li>
                  <li>• Click any conversation to resume it and view full history</li>
                  <li className="flex items-start gap-2">
                    <Trash2 size={14} className="mt-1 flex-shrink-0 text-danger" />
                    Hover over a conversation and click the <strong>delete</strong> icon to remove it
                  </li>
                  <li className="flex items-start gap-2">
                    <Download size={14} className="mt-1 flex-shrink-0 text-brand" />
                    Click the <strong>export</strong> button in the top bar to save the conversation as a file
                  </li>
                </ul>
              </Step>

              <Step number={4} title="Copy Answers">
                <p>Below each AI response, there's a <strong>copy icon</strong>. Click it to copy the full answer to your clipboard — useful for pasting into emails, documents, or tickets.</p>
              </Step>
            </div>
          </div>

          {/* ═══════════ Section 5: Downloads Page ═══════════ */}
          <div id="downloads-page" className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <FolderOpen size={15} />
                Feature 5
              </div>
              <h2 className="text-2xl font-extrabold text-dark">Downloads Page</h2>
            </div>

            <div className="mt-8">
              <Step number={1} title="View All Exported Files">
                <p>The <strong>Downloads</strong> tab shows all files you've exported — both batch processing results and chat conversation exports.</p>
                <ul className="space-y-1.5">
                  <li>• Files are listed with filename, type, size, and date</li>
                  <li>• Click the <strong>download icon</strong> to re-download any file</li>
                  <li>• Click the <strong>delete icon</strong> to remove files you no longer need</li>
                </ul>
              </Step>
            </div>
          </div>

          {/* ═══════════ Section 6: Tips ═══════════ */}
          <div id="tips" className="page-section">
            <div className="section-header">
              <div className="section-kicker">
                <BookOpen size={15} />
                Best Practices
              </div>
              <h2 className="text-2xl font-extrabold text-dark">Tips &amp; Best Practices</h2>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: 'Write Clear Questions',
                  desc: 'The more specific and well-formed your questions, the better the AI answers. Avoid vague or compound questions.',
                },
                {
                  title: 'Name Your Column "Question"',
                  desc: 'For reliable auto-detection, name the question column "Question" in your Excel file. This works across all sheets.',
                },
                {
                  title: 'Review Before Accepting',
                  desc: 'Always review AI-generated answers for accuracy. The system pulls from your knowledge base, but human verification is essential.',
                },
                {
                  title: 'Use Stop & Resume',
                  desc: 'For large batches (200+ questions), process in chunks. Stop, review the first batch of answers, then resume.',
                },
                {
                  title: 'Leverage the Chatbot',
                  desc: 'Use NetraBOT for ad-hoc questions during review. If an answer seems incomplete, ask the chatbot for more detail on that topic.',
                },
                {
                  title: 'Export Conversations',
                  desc: 'Useful research conversations can be exported as files for sharing with team members or archiving.',
                },
                {
                  title: 'Keep Sheets Organized',
                  desc: 'Multi-sheet Excel files preserve their structure on download. Use separate sheets for different categories (e.g., Security, Compliance, Technical).',
                },
                {
                  title: 'Check Source Documents',
                  desc: 'Click "View Sources" on any answer to verify which documents were used. This helps assess answer reliability.',
                },
              ].map((tip) => (
                <div key={tip.title} className="rounded-2xl border border-border-lighter bg-surface-card p-5">
                  <h4 className="text-sm font-bold text-dark">{tip.title}</h4>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
