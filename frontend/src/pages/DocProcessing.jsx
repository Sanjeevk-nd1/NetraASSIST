import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Play, Download, CheckCircle, CheckCheck, Edit3, X,
  ExternalLink, Loader2, Trash2, Info, ChevronDown, ChevronUp, Eye, Save,
  Clock, RotateCcw, Square
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import api from '../api';

export default function DocProcessing() {
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);
  const fileInputRef = useRef(null);


  const loadJobs = useCallback(async () => {
    try {
      const res = await api.get('/api/docprocess/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
    setLoading(false);
  }, []);

  const loadJobDetail = useCallback(async (jobId) => {
    try {
      const res = await api.get(`/api/docprocess/jobs/${jobId}`);
      setJobDetail(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to load job detail:', err);
      return null;
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  useEffect(() => {
    if (!activeJob) {
      setJobDetail(null);
      return;
    }
    loadJobDetail(activeJob);
  }, [activeJob, loadJobDetail]);

  useEffect(() => {
    if (!jobDetail || !['processing', 'canceling'].includes(jobDetail.status)) {
      setPolling(false);
      return;
    }

    setPolling(true);
    const interval = setInterval(async () => {
      const data = await loadJobDetail(jobDetail.id);
      if (data && !['processing', 'canceling'].includes(data.status)) {
        setPolling(false);
        loadJobs();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [jobDetail?.id, jobDetail?.status, loadJobDetail, loadJobs]);

  const uploadFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      alert('Only Excel files (.xlsx, .xls) are supported');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/docprocess/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadJobs();
      setActiveJob(res.data.batch_id);
      // Show column detection summary
      const cols = res.data.detected_columns;
      if (cols && Object.keys(cols).length > 0) {
        setUploadNotice({
          type: 'success',
          filename: res.data.filename,
          total: res.data.total_questions,
          sheets: cols,
        });
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.sheet_errors?.length) {
        setUploadNotice({
          type: 'error',
          message: data.error,
          errors: data.sheet_errors,
        });
      } else {
        alert(data?.error || 'Upload failed');
      }
    }
    setUploading(false);
  };

  const handleFileChange = (e) => {
    uploadFile(e.target.files?.[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    uploadFile(e.dataTransfer?.files?.[0]);
  };

  const handleProcess = async (jobId) => {
    try {
      await api.post(`/api/docprocess/jobs/${jobId}/process`);
      await loadJobDetail(jobId);
      loadJobs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start generation');
    }
  };

  const handleStop = async (jobId) => {
    try {
      await api.post(`/api/docprocess/jobs/${jobId}/stop`);
      await loadJobDetail(jobId);
      loadJobs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to stop generation');
    }
  };

  const handleAcceptAll = async (jobId) => {
    try {
      await api.post(`/api/docprocess/jobs/${jobId}/accept-all`);
      await loadJobDetail(jobId);
      loadJobs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept all answers');
    }
  };

  const handleDownload = async (jobId) => {
    try {
      const res = await api.get(`/api/docprocess/jobs/${jobId}/download`, { responseType: 'blob' });
      const contentDisposition = res.headers['content-disposition'];
      let filename = 'results.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)(?:"|$)/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      loadJobs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to download results');
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await api.delete(`/api/docprocess/jobs/${jobId}`);
      if (activeJob === jobId) {
        setActiveJob(null);
        setJobDetail(null);
      }
      loadJobs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete job');
    }
  };

  if (activeJob && jobDetail) {
    return (
      <JobDetailView
        job={jobDetail}
        polling={polling}
        onStart={() => handleProcess(jobDetail.id)}
        onStop={() => handleStop(jobDetail.id)}
        onAcceptAll={() => handleAcceptAll(jobDetail.id)}
        onDownload={() => handleDownload(jobDetail.id)}
        onRefresh={() => loadJobDetail(jobDetail.id)}
        onBack={() => setActiveJob(null)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="page-section animate-fade-up">
          <div className="section-header">
            <div className="section-kicker">
              <Upload size={15} />
              UPLOAD
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-dark">Document Processing</h2>
              <p className="mt-1 text-sm text-muted">
                Upload question sheets below, start generation explicitly, and review answers before export.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-dark-secondary">File Type</label>
            <div className="relative">
              <select className="w-full cursor-pointer appearance-none rounded-2xl border border-border bg-input-bg px-4 py-3 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand">
                <option>Excel (.xlsx)</option>
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-light" />
            </div>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-[1.75rem] border-2 border-dashed px-8 py-16 text-center transition-all ${
              dragActive ? 'border-brand bg-brand-light/50' : 'border-border hover:border-brand hover:bg-surface-light'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={36} className="animate-spin text-brand" />
                <p className="text-base font-medium text-dark-secondary">Uploading file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
                  <Upload size={28} className="text-brand" />
                </div>
                <div>
                  <p className="text-base font-semibold text-dark">Drag and drop your file here</p>
                  <p className="mt-1.5 text-sm text-muted-light">or click to browse. Excel files only.</p>
                </div>
              </div>
            )}
          </div>

          {uploadNotice && uploadNotice.type === 'success' && (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 animate-fade-up">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-dark">
                    <CheckCircle size={14} className="mr-1.5 inline text-emerald-500" />
                    Uploaded — {uploadNotice.total} question{uploadNotice.total !== 1 ? 's' : ''} detected
                  </p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(uploadNotice.sheets).map(([sheet, col]) => (
                      <p key={sheet} className="text-xs text-muted">
                        <span className="font-semibold text-dark-secondary">{sheet}</span>
                        {' — using column '}
                        <span className="rounded bg-surface-light px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand">"{col}"</span>
                      </p>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-light">
                    Wrong column? Rename it to <strong>"Question"</strong> in your Excel and re-upload.
                  </p>
                </div>
                <button onClick={() => setUploadNotice(null)} className="mt-0.5 flex-shrink-0 text-muted-light hover:text-dark transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {uploadNotice && uploadNotice.type === 'error' && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/5 px-5 py-4 animate-fade-up">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-danger">
                    Upload failed — please fix the following issues:
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {uploadNotice.errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-dark-secondary">
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-danger">{i + 1}</span>
                        {err}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-xl bg-surface-light px-3 py-2">
                    <p className="text-[11px] font-semibold text-dark-secondary">How to fix:</p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-muted">
                      <li>• Each sheet must have a header row with a column named <strong>"Question"</strong></li>
                      <li>• Or if there's no header, each row should contain one question per cell</li>
                      <li>• Remove empty sheets or sheets without question data</li>
                    </ul>
                  </div>
                </div>
                <button onClick={() => setUploadNotice(null)} className="mt-0.5 flex-shrink-0 text-muted-light hover:text-dark transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="info-note mt-8">
            <div className="mb-3 flex items-center gap-2">
              <Info size={16} className="info-note-title" />
              <h4 className="info-note-title text-sm font-bold">How It Works</h4>
            </div>
            <div className="info-note-text space-y-4 text-sm">
              <div>
                <p className="font-semibold text-dark-secondary mb-1">Upload</p>
                <ul className="ml-5 space-y-1">
                  <li className="list-disc">Excel files only (.xlsx, .xls) — max <strong>10 MB</strong>, up to <strong>500 questions</strong>.</li>
                  <li className="list-disc">The system auto-detects a column named <strong>"Question"</strong> or similar (case-insensitive). After upload, you'll see which column was detected per sheet — if it's wrong, rename the column and re-upload.</li>
                  <li className="list-disc">Multi-sheet files are fully supported — questions from <strong>all sheets</strong> are imported and the downloaded results preserve the same sheet structure.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-dark-secondary mb-1">Generate &amp; Review</p>
                <ul className="ml-5 space-y-1">
                  <li className="list-disc">Click <strong>Start Generating</strong> to begin. You can <strong>Stop</strong> at any time and <strong>Resume</strong> later — already-answered questions are kept.</li>
                  <li className="list-disc">Review each response, then <strong>Accept</strong>, <strong>Edit</strong>, or <strong>Retry</strong> individually. Use <strong>Accept All</strong> to approve remaining answers in bulk.</li>
                  <li className="list-disc">Editing an accepted answer resets it to "Answered" so you can re-review before accepting again.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-dark-secondary mb-1">Download</p>
                <ul className="ml-5 space-y-1">
                  <li className="list-disc">Download the results as an Excel file at any time. The file mirrors the original sheet layout with answers, status, and sources.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Previous Uploads (inside the same section) ── */}
          {loading ? (
            <div className="flex justify-center py-16 mt-8">
              <Loader2 size={28} className="animate-spin text-muted-lighter" />
            </div>
          ) : jobs.length > 0 ? (
            <div className="mt-10 border-t border-border-light pt-8">
              <div className="section-header">
                <div className="section-kicker">
                  <Clock size={15} />
                  Queue
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-dark">Previous Uploads</h3>
                  <p className="mt-1 text-sm text-muted">Open a batch to start, stop, review, or export generation results.</p>
                </div>
              </div>

              <div className="space-y-3 stagger-enter">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="panel-card panel-card-hover flex cursor-pointer items-center justify-between gap-4 px-5 py-4"
                    onClick={() => setActiveJob(job.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light">
                        <FileSpreadsheet size={20} className="text-brand" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-dark">{job.filename}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          <StatusBadge status={job.status} />
                          <span className="text-xs text-muted-light">{job.processed_count}/{job.total_questions} processed</span>
                          {job.created_at && <span className="text-xs text-muted-light">{format(new Date(job.created_at), 'MMM d, yyyy HH:mm')}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}
                      className="icon-button h-10 w-10 text-muted-lighter hover:bg-red-50 hover:text-danger"
                      title="Delete batch"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    uploaded: 'bg-surface text-muted',
    processing: 'bg-amber-50 text-amber-700',
    canceling: 'bg-amber-50 text-amber-700',
    canceled: 'bg-red-50 text-red-700',
    completed: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    pending: 'bg-surface text-muted-light',
    answered: 'bg-blue-50 text-blue-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    error: 'bg-red-50 text-red-700',
  };
  const labels = {
    uploaded: 'Uploaded',
    processing: 'Generating',
    canceling: 'Stopping',
    canceled: 'Stopped',
    completed: 'Completed',
    failed: 'Failed',
    pending: 'Pending',
    answered: 'Answered',
    accepted: 'Accepted',
    error: 'Error',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${styles[status] || 'bg-surface text-muted'}`}>{labels[status] || status}</span>;
}

function normalizeMarkdown(text) {
  if (!text) return '';

  // If text already contains markdown line breaks with bullets or headings, return as-is
  if (/\n\s*[-*]\s/.test(text) || /\n\s*#{1,4}\s/.test(text)) {
    return text;
  }

  // Otherwise, try to convert plain-text to markdown
  const lines = text.split('\n');
  const result = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    const prev = i > 0 ? lines[i - 1].trim() : '';

    // Bullet char conversion
    if (/^[•]\s/.test(trimmed)) {
      if (result.length > 0 && result[result.length - 1] !== '') result.push('');
      result.push('- ' + trimmed.slice(2));
      inList = true;
      continue;
    }

    // Line after a colon-ending line — treat as list item
    if (prev.endsWith(':') && trimmed && !/^[-*•#]/.test(trimmed)) {
      if (result.length > 0 && result[result.length - 1] !== '') result.push('');
      result.push('- ' + trimmed);
      inList = true;
      continue;
    }

    // Continuation of an implicit list
    if (inList && trimmed && !trimmed.endsWith(':') && !trimmed.endsWith('.') && trimmed.length < 200) {
      result.push('- ' + trimmed);
      continue;
    }
    if (inList && trimmed) inList = false;

    // Bold-only line — ensure spacing
    if (/^\*\*[^*]+\*\*$/.test(trimmed) && result.length > 0 && result[result.length - 1] !== '') {
      result.push('');
    }

    result.push(line);
  }
  return result.join('\n');
}

function JobDetailView({ job, polling, onStart, onStop, onAcceptAll, onDownload, onRefresh, onBack }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [regeneratingIds, setRegeneratingIds] = useState(new Set());
  const [expandedSources, setExpandedSources] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');

  const answeredCount = job.questions?.filter((q) => ['answered', 'accepted'].includes(q.status)).length || 0;
  const acceptedCount = job.questions?.filter((q) => q.status === 'accepted').length || 0;
  const pendingCount = job.questions?.filter((q) => q.status === 'pending').length || 0;
  const answeredOnlyCount = job.questions?.filter((q) => q.status === 'answered').length || 0;
  const errorCount = job.questions?.filter((q) => q.status === 'error').length || 0;
  const totalQuestions = job.questions?.length || 0;
  const unreviewedCount = totalQuestions - acceptedCount;
  const progress = totalQuestions > 0 ? Math.round((job.processed_count / totalQuestions) * 100) : 0;
  const canStart = ['uploaded', 'failed', 'canceled'].includes(job.status);
  const canStop = ['processing', 'canceling'].includes(job.status);
  const canAcceptAll = job.questions?.some((q) => q.status === 'answered');
  const canDownload = answeredCount > 0;
  const hasUnanswered = job.questions?.some((q) => ['pending', 'error', 'canceled'].includes(q.status));
  const isResume = canStart && job.status === 'canceled' && hasUnanswered;
  const sheetNames = [...new Set(job.questions?.map((q) => q.sheet_name).filter(Boolean) || [])];
  const hasMultipleSheets = sheetNames.length > 1;

  const filteredQuestions = statusFilter === 'all'
    ? job.questions
    : job.questions?.filter((q) => q.status === statusFilter) || [];

  const handleDownloadClick = () => {
    if (unreviewedCount > 0) {
      if (window.confirm(`${unreviewedCount} of ${totalQuestions} responses are unreviewed. Download anyway?`)) {
        onDownload();
      }
    } else {
      onDownload();
    }
  };

  const handleEdit = (question) => {
    setEditingId(question.id);
    setEditValue(normalizeMarkdown(question.answer || ''));
  };

  const handleSaveEdit = async (questionId) => {
    try {
      await api.put(`/api/docprocess/questions/${questionId}/edit`, { answer: editValue });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save edit');
    }
  };

  const handleRegenerate = (questionId) => {
    setRegeneratingIds((prev) => new Set(prev).add(questionId));
    api.post(`/api/docprocess/questions/${questionId}/regenerate`)
      .then(() => onRefresh())
      .catch((err) => alert(err.response?.data?.error || 'Failed to regenerate'))
      .finally(() => setRegeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      }));
  };

  const handleAcceptOne = async (questionId) => {
    try {
      await api.post(`/api/docprocess/questions/${questionId}/accept`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="space-y-8">
          <div className="pb-2 animate-fade-up">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-hover">
              &larr; Back to uploads
            </button>
          </div>

          <div className="page-section animate-fade-up" style={{ animationDelay: '40ms' }}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-brand-light">
                  <FileSpreadsheet size={24} className="text-brand" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-dark">{job.filename}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <StatusBadge status={job.status} />
                    <span className="text-sm text-muted-light">{totalQuestions} questions</span>
                    {hasMultipleSheets && <span className="text-sm text-muted-light">{sheetNames.length} sheets</span>}
                    {job.created_at && <span className="text-sm text-muted-light">{format(new Date(job.created_at), 'MMM d, yyyy HH:mm')}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {canStart && (
                  <button onClick={onStart} className="button-primary flex h-11 items-center gap-2 rounded-2xl px-5 text-sm hover:-translate-y-0.5">
                    <Play size={15} /> {isResume ? 'Resume Generating' : 'Start Generating'}
                  </button>
                )}
                {canStop && (
                  <button onClick={onStop} className="flex h-11 items-center gap-2 rounded-2xl bg-red-600/80 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-600">
                    <Square size={14} /> Stop
                  </button>
                )}
                {canAcceptAll && (
                  <button onClick={onAcceptAll} className="flex h-11 items-center gap-2 rounded-2xl bg-emerald-600/80 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-600">
                    <CheckCheck size={15} /> Accept All
                  </button>
                )}
                {canDownload && (
                  <button onClick={handleDownloadClick} className="button-secondary flex h-11 items-center gap-2 rounded-2xl px-5 text-sm hover:-translate-y-0.5 hover:bg-surface-light">
                    <Download size={15} /> Download
                  </button>
                )}
                {(polling || job.status === 'canceling') && (
                  <span className="flex items-center gap-2 text-sm font-medium text-warning">
                    <Loader2 size={15} className="animate-spin" />
                    {job.status === 'canceling' ? 'Stopping active requests...' : 'Generating answers...'}
                  </span>
                )}
              </div>
            </div>

            {(job.processed_count > 0 || ['processing', 'canceling'].includes(job.status)) && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-light">
                  <span>Generation Progress</span>
                  <span>{job.processed_count} / {totalQuestions} ({progress}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-border-light">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${['processing', 'canceling'].includes(job.status) ? 'bg-brand progress-shimmer' : job.status === 'canceled' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {job.detected_columns && Object.keys(job.detected_columns).length > 0 && (
            <div className="rounded-2xl border border-border-lighter bg-surface-card px-5 py-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-light">Column Detection</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {Object.entries(job.detected_columns).map(([sheet, col]) => (
                  <p key={sheet} className="text-xs text-muted">
                    <span className="font-semibold text-dark-secondary">{sheet}</span>
                    {' → '}
                    <span className="font-mono text-[11px] font-bold text-brand">{col}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'All', count: totalQuestions },
              { key: 'pending', label: 'Pending', count: pendingCount },
              { key: 'answered', label: 'Answered', count: answeredOnlyCount },
              { key: 'accepted', label: 'Accepted', count: acceptedCount },
              { key: 'error', label: 'Error', count: errorCount },
            ].filter(tab => tab.key === 'all' || tab.count > 0).map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                  statusFilter === tab.key
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-surface-light text-muted hover:bg-surface hover:text-dark-secondary'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                  statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-border-light text-muted-light'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-6 stagger-enter">
            {filteredQuestions?.map((question, index) => {
              const originalIndex = job.questions?.indexOf(question) ?? index;
              return (<div
                key={question.id}
                className={`panel-card transition-all ${
                  question.status === 'accepted'
                    ? 'border-emerald-200'
                    : question.status === 'error'
                      ? 'border-red-200'
                      : 'border-border-light'
                }`}
              >
                <div className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">{originalIndex + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-relaxed text-dark">{question.question}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge status={question.status} />
                            {hasMultipleSheets && question.sheet_name && (
                              <span className="rounded-lg bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">{question.sheet_name}</span>
                            )}
                            {question.sources?.length ? <span className="text-xs text-muted-light">{question.sources.length} source{question.sources.length > 1 ? 's' : ''}</span> : null}
                          </div>
                        </div>
                      </div>

                      {question.status === 'processing' ? (
                        <div className="ml-10 flex items-center gap-2.5 text-sm text-warning">
                          <Loader2 size={15} className="animate-spin" />
                          <span>Generating answer...</span>
                        </div>
                      ) : question.status === 'pending' ? (
                        <p className="ml-10 text-sm italic text-muted-light">Waiting to start generation</p>
                      ) : question.status === 'canceled' ? (
                        <p className="ml-10 text-sm italic text-red-600">Generation stopped before this question finished.</p>
                      ) : editingId === question.id ? (
                        <div className="ml-10">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full resize-y rounded-2xl border border-border bg-input-bg px-4 py-3 text-sm text-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                            rows={5}
                          />
                          <div className="mt-3 flex items-center gap-2.5">
                            <button onClick={() => handleSaveEdit(question.id)} className="button-primary flex h-10 items-center gap-1.5 rounded-2xl px-4 text-sm hover:-translate-y-0.5">
                              <Save size={14} /> Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="button-secondary flex h-10 items-center gap-1.5 rounded-2xl px-4 text-sm hover:bg-surface-light">
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : question.answer ? (
                        <div className="answer-prose ml-10 rounded-2xl border border-border-lighter bg-surface-card px-5 py-4 text-dark-secondary max-w-none">
                          <ReactMarkdown>{normalizeMarkdown(question.answer)}</ReactMarkdown>
                        </div>
                      ) : null}

                      {question.error_details && question.status === 'error' && (
                        <p className="ml-10 mt-3 text-xs text-red-600">{question.error_details}</p>
                      )}

                      {question.sources && question.sources.length > 0 && !['pending', 'processing', 'canceled'].includes(question.status) && (
                        <div className="ml-10 mt-4">
                          <button
                            onClick={() => setExpandedSources((prev) => ({ ...prev, [question.id]: !prev[question.id] }))}
                            className="flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
                          >
                            <Eye size={14} />
                            {expandedSources[question.id] ? 'Hide' : 'View'} Sources ({question.sources.length})
                            {expandedSources[question.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {expandedSources[question.id] && (
                            <div className="mt-2 space-y-2">
                              {question.sources.map((source, sourceIndex) => (
                                <div key={sourceIndex} className="flex items-center gap-2.5 rounded-2xl bg-surface-light px-4 py-3 text-sm text-muted">
                                  <FileSpreadsheet size={14} className="flex-shrink-0 text-brand" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-dark-secondary">{source.document}</p>
                                    {source.section && <p className="truncate text-xs text-muted-light">{source.section}</p>}
                                  </div>
                                  {source.url && (
                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="ml-auto flex-shrink-0 text-brand hover:text-brand-hover">
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2">
                      {['answered', 'accepted', 'error'].includes(question.status) && editingId !== question.id && (
                        <>
                          <button
                            onClick={() => handleRegenerate(question.id)}
                            disabled={regeneratingIds.has(question.id)}
                            className="flex h-8 items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 text-xs font-semibold text-amber-600 dark:text-amber-400 transition-all hover:bg-amber-500/20"
                            title="Regenerate answer"
                          >
                            {regeneratingIds.has(question.id) ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                            Retry
                          </button>
                          <button onClick={() => handleEdit(question)} className="flex h-8 items-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-all hover:bg-blue-500/20" title="Edit answer">
                            <Edit3 size={13} /> Edit
                          </button>
                        </>
                      )}
                      {question.status === 'answered' && editingId !== question.id && (
                        <button onClick={() => handleAcceptOne(question.id)} className="flex h-8 items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-500/20" title="Accept answer">
                          <CheckCircle size={13} /> Accept
                        </button>
                      )}
                      {question.status === 'accepted' && editingId !== question.id && (
                        <span className="flex h-8 items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle size={14} /> Accepted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
