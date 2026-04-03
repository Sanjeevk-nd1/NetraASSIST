import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, Loader2, Calendar, Trash2, RefreshCw, Database,
  CheckCircle, XCircle, ExternalLink, Save, RotateCcw, Globe,
  ChevronLeft, ChevronRight, Settings, HardDrive, Search, Filter, X, Clock,
  Copy, Mail, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const tabBase = [
  { id: 'documents', label: 'Document Library', icon: Database },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'prompt', label: 'System Prompts', icon: FileText },
  { id: 'logs', label: 'Audit Logs', icon: Globe },
];

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="panel-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-light">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-dark">{value}</p>
          {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light">
          <Icon size={20} className="text-brand" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-surface text-muted',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-blue-50 text-blue-700',
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${tones[tone]}`}>{children}</span>;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('documents');

  const renderTab = () => {
    switch (activeTab) {
      case 'documents': return <DocumentLibrary />;
      case 'users': return <UserManagement />;
      case 'prompt': return <SystemPrompt />;
      case 'logs': return <AuditLogs />;
      default: return <DocumentLibrary />;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="page-section animate-fade-up">
          <div className="section-header">
            <div className="section-kicker">
              <Settings size={15} />
              Administration
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-dark">Admin Panel</h1>
              <p className="mt-1 text-sm text-muted">
                Manage repository configuration, review synced files, control user access, and inspect system behavior.
              </p>
            </div>
          </div>

          <div className="segment-wrap mb-10 flex w-full overflow-x-auto">
            {tabBase.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`segment-button flex min-w-max items-center justify-center gap-2.5 whitespace-nowrap ${
                    activeTab === tab.id ? 'segment-button-active' : 'hover:text-dark-secondary'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="pt-1">
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const roleLabels = { user: 'Standard User', admin: 'Administrative User', super_admin: 'Super Admin' };

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const updateRole = async (userId, newRole) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/api/admin/users/${userId}/status`, { is_active: !currentStatus });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const deleteUser = async (userId) => {
    try {
      await api.delete(`/api/admin/users/${userId}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-lighter" /></div>;

  return (
    <div>
      <div className="mb-5">
        <div>
          <h2 className="text-lg font-bold text-dark">Registered Users</h2>
          <p className="mt-1 text-sm text-muted">Manage user accounts and permissions.</p>
        </div>
      </div>

      <div className="table-shell overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-border-lighter bg-surface-card">
              <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Username</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Role</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Created</th>
              <th className="text-right px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-lighter">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-card transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-dark">{user.full_name || '--'}</td>
                <td className="px-6 py-4 text-sm text-muted">
                  <div className="flex items-center gap-3">
                    <span>{user.email}</span>
                    {user.is_protected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-200 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-violet-900 dark:bg-purple-900/40 dark:text-purple-200">
                        <Shield size={10} /> Protected
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.role === 'super_admin' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-200 px-3 py-1.5 text-xs font-extrabold text-violet-900 dark:bg-purple-900/40 dark:text-purple-200">
                      <Shield size={12} /> Super Admin
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                      disabled={user.is_protected}
                      className="h-10 rounded-xl border border-border bg-input-bg px-3 text-sm text-dark-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">Administrative User</option>
                    </select>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted-light">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {user.created_at ? format(new Date(user.created_at), 'M/d/yyyy') : '--'}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.is_protected ? (
                      <span className="text-xs text-muted-lighter italic">No actions</span>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleStatus(user.id, user.is_active)}
                          className="button-secondary flex h-10 items-center gap-2 rounded-xl px-3 text-sm"
                          title={user.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.is_active ? <XCircle size={15} /> : <CheckCircle size={15} />}
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="icon-button h-10 w-10 text-muted-lighter hover:bg-red-50 hover:text-danger"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentLibrary() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  const emptyProfile = { repository_url: '', site_id: '', drive_id: '', folder_path: '', last_sync_at: null, label: '' };
  const [settings, setSettings] = useState({ knowledge: emptyProfile, policy: emptyProfile });
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeRepository, setActiveRepository] = useState('knowledge');

  const loadDocuments = useCallback(async () => {
    try {
      const [docsRes, configRes] = await Promise.all([
        api.get(`/api/admin/knowledge-source/documents?profile=${activeRepository}`),
        api.get('/api/admin/sharepoint-config'),
      ]);
      setDocuments(docsRes.data);
      setSettings({
        knowledge: { ...emptyProfile, ...(configRes.data.knowledge || {}) },
        policy: { ...emptyProfile, ...(configRes.data.policy || {}) },
      });
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
    setLoading(false);
  }, [activeRepository]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const loadCacheStats = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/cache/stats');
      setCacheStats(res.data);
    } catch { setCacheStats(null); }
  }, []);

  useEffect(() => { loadCacheStats(); }, [loadCacheStats]);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await api.post('/api/admin/cache/clear');
      setSyncMessage(res.data.message);
      loadCacheStats();
    } catch (err) {
      setSyncMessage(err.response?.data?.error || 'Failed to clear cache');
    }
    setClearingCache(false);
  };

  const handleSync = async (profile) => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await api.post('/api/admin/knowledge-source/sync', { profile });
      setSyncMessage(res.data.message);
      loadDocuments();
      loadCacheStats();
    } catch (err) {
      setSyncMessage(err.response?.data?.error || 'Sync failed');
    }
    setSyncing(false);
  };

  const handleSaveSettings = async (profile) => {
    setSavingSettings(true);
    try {
      const res = await api.put('/api/admin/sharepoint-config', {
        profile,
        repository_url: settings[profile]?.repository_url || '',
      });
      setSettings((prev) => ({
        ...prev,
        [profile]: { ...prev[profile], ...res.data },
      }));
      setSyncMessage(res.data.message || 'SharePoint configuration updated.');
      loadDocuments();
    } catch (err) {
      if (err.response?.data) {
        setSettings((prev) => ({
          ...prev,
          [profile]: { ...prev[profile], ...err.response.data },
        }));
      }
      setSyncMessage(err.response?.data?.error || 'Failed to save SharePoint configuration');
    }
    setSavingSettings(false);
  };

  const repositoryTabs = [
    { id: 'knowledge', label: 'SE Knowledge Base' },
    { id: 'policy', label: 'Infosec Knowledge Base' },
  ];
  const activeSettings = settings[activeRepository] || emptyProfile;
  const indexedCount = documents.filter((doc) => doc.status === 'indexed').length;
  const syncedOnlyCount = documents.filter((doc) => doc.status === 'synced_only').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-lighter" /></div>;

  return (
    <div className="space-y-8">
      <div className="panel-card">
        <div className="section-header">
          <div className="section-kicker">
            <Database size={15} />
            SharePoint Repositories
          </div>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-dark">Knowledge Source</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Select the correct repository below, paste a SharePoint folder URL, and click <strong className="text-dark-secondary">Save</strong>. Then click <strong className="text-dark-secondary">Sync</strong> to index all documents. Subsequent syncs only fetch changes.
              </p>
            </div>
            <div className="segment-wrap flex w-full overflow-x-auto xl:w-auto">
              {repositoryTabs.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => setActiveRepository(repo.id)}
                  className={`segment-button flex min-w-max items-center justify-center whitespace-nowrap ${
                    activeRepository === repo.id ? 'segment-button-active' : 'hover:text-dark-secondary'
                  }`}
                >
                  {repo.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.6rem] border border-border-light bg-surface-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-light">{activeSettings.label || 'Repository'}</p>
                <h3 className="mt-2 text-lg font-bold text-dark">Configuration</h3>
              </div>
            </div>

            {/* Repository warning */}
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                ⚠️ Make sure you select the correct repository tab above before saving. Each repository syncs independently.
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-dark-secondary">SharePoint Folder URL</label>
              <p className="mb-3 text-xs text-muted">Paste the full SharePoint URL of the folder you want to sync. The system will automatically extract the site, drive, and folder path.</p>
              <input
                value={activeSettings.repository_url || ''}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  [activeRepository]: { ...prev[activeRepository], repository_url: e.target.value },
                }))}
                placeholder="https://yourorg.sharepoint.com/sites/..."
                className="w-full rounded-2xl border border-border bg-input-bg px-5 py-4 text-sm text-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-border-light bg-card p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-light">Resolved Folder Path</p>
              <p className="mt-3 break-all text-sm leading-6 text-dark-secondary">{activeSettings.folder_path || 'Not configured — save a URL first'}</p>
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-border-light bg-card p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-light">Status</p>
            <h3 className="mt-2 text-lg font-bold text-dark">Repository Health</h3>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border-light bg-surface-card p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-light">Active Folder</p>
                <p className="mt-3 break-words text-sm leading-6 text-dark-secondary">{activeSettings.folder_path || 'Not configured'}</p>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-card p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-light">Last Sync</p>
                <p className="mt-3 text-sm leading-6 text-dark-secondary">
                  {activeSettings.last_sync_at ? format(new Date(activeSettings.last_sync_at), 'MMM d, yyyy HH:mm') : 'Never'}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-border-light bg-surface-card p-4">
              <p className="text-xs text-muted leading-5">
                <strong className="text-dark-secondary">How sync works:</strong> Clicking <strong>Save</strong> stores the URL and resolves the SharePoint folder. Clicking <strong>Sync</strong> uses Microsoft Graph delta API to fetch only changed files (new, edited, deleted) since the last sync and re-indexes them into searchable sections.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button onClick={() => handleSaveSettings(activeRepository)} disabled={savingSettings} className="button-primary flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm disabled:opacity-50">
                {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save
              </button>
              <button
                onClick={() => handleSync(activeRepository)}
                disabled={syncing || !activeSettings.repository_url}
                className="button-secondary flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm disabled:opacity-60"
              >
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                Sync
              </button>
              <button
                onClick={handleClearCache}
                disabled={clearingCache || !cacheStats?.total_entries}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-6 text-sm font-semibold text-orange-700 transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:transform-none dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
              >
                {clearingCache ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Clear Cache{cacheStats?.total_entries ? ` (${cacheStats.total_entries})` : ''}
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="panel-card">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-kicker">
              <HardDrive size={15} />
              Indexed Content
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-dark">Document Library</h2>
            <p className="mt-2 text-sm leading-6 text-muted">The current active repository and files which were converted into searchable sections.</p>
          </div>
          <div className="rounded-full bg-brand-light px-4 py-2 text-sm font-extrabold tracking-[0.16em] text-brand uppercase">
            {activeSettings.label || 'Repository'}
          </div>
        </div>

        {/* Supported Formats & Best Practices */}
        <details className="mt-6 group rounded-2xl border border-border-light bg-surface-card">
          <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 text-sm font-bold text-dark select-none">
            <FileText size={16} className="text-brand shrink-0" />
            Supported Formats, Sync Behavior &amp; Best Practices
            <span className="ml-auto text-muted-lighter text-xs group-open:rotate-90 transition-transform">▶</span>
          </summary>
          <div className="border-t border-border-lighter px-5 pb-5 pt-4 space-y-5">
            {/* Supported formats */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-light mb-2">Supported File Formats</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { ext: '.docx', label: 'Word' },
                  { ext: '.pdf', label: 'PDF' },
                  { ext: '.xlsx / .xls', label: 'Excel' },
                  { ext: '.pptx', label: 'PowerPoint' },
                  { ext: '.md', label: 'Markdown' },
                  { ext: '.txt', label: 'Plain Text' },
                ].map((f) => (
                  <span key={f.ext} className="rounded-lg border border-border-lighter bg-surface px-3 py-1.5 text-xs">
                    <strong className="text-dark">{f.ext}</strong> <span className="text-muted">({f.label})</span>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted leading-5">
                Files in other formats (e.g. <code className="rounded bg-surface px-1 py-0.5 text-[11px]">.zip</code>, <code className="rounded bg-surface px-1 py-0.5 text-[11px]">.png</code>, <code className="rounded bg-surface px-1 py-0.5 text-[11px]">.csv</code>) are recorded in the database but <strong className="text-dark-secondary">skipped during indexing</strong>. They appear as "Synced Only" in the table below.
              </p>
            </div>

            {/* Sync behavior */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-light mb-2">How Sync Works</p>
              <div className="space-y-1.5 text-xs leading-5 text-dark-secondary">
                <p>• <strong>Subfolders:</strong> All files within the configured folder are synced recursively — subfolders at any depth are included automatically.</p>
                <p>• <strong>New files:</strong> Downloaded, converted to markdown, and indexed into searchable sections.</p>
                <p>• <strong>Modified files:</strong> Re-downloaded and fully re-indexed. Old sections are replaced with new ones.</p>
                <p>• <strong>Deleted files:</strong> Marked as deleted in the database. Their sections are no longer used for retrieval.</p>
                <p>• <strong>Unchanged files:</strong> Detected via file fingerprint (eTag) and skipped entirely — no re-download or re-index.</p>
                <p>• <strong>Duplicate files:</strong> If the same document exists with different names, each copy is indexed independently.</p>
              </div>
            </div>

            {/* Best practices */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-light mb-2">Best Practices for Admins</p>
              <div className="space-y-1.5 text-xs leading-5 text-dark-secondary">
                <p>• <strong>Use headings in Word docs:</strong> Documents with proper Heading 1 / Heading 2 / Heading 3 styles produce the best section hierarchy for accurate retrieval.</p>
                <p>• <strong>Avoid duplicate files:</strong> Remove duplicate copies from the SharePoint folder to prevent redundant sections in the knowledge base.</p>
                <p>• <strong>Keep it updated:</strong> Keep the NetraAssist Knowledge source repository in SharePoint updated with the latest information for accurate responses.</p>
                <p>• <strong>Sync regularly:</strong> After uploading or editing documents in SharePoint, click Sync to pull in the latest changes. Only changed files are processed.</p>
                <p>• <strong>Check "Synced Only" count:</strong> If files show as "Synced Only" instead of "Indexed", they may be in an unsupported format or failed during conversion.</p>
                <p>• <strong>Prefer .docx over .pdf:</strong> Word documents with heading styles produce significantly better section structure than PDFs, leading to more accurate AI answers.</p>
              </div>
            </div>
          </div>
        </details>

        <div className="mt-7 grid gap-5 xl:grid-cols-3">
          <MetricCard icon={HardDrive} label="Total Files" value={documents.length} hint="Files currently represented for this repository." />
          <MetricCard icon={CheckCircle} label="Indexed" value={indexedCount} hint="Files with parsed sections ready for vectorless retrieval." />
          <MetricCard icon={Database} label="Synced Only" value={syncedOnlyCount} hint="Known in DB but not yet indexed into sections." />
        </div>

        {syncMessage && (
          <div className={`mt-7 rounded-2xl border px-5 py-4 text-sm font-medium leading-6 ${
            syncMessage.includes('failed') || syncMessage.includes('error')
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {syncMessage}
          </div>
        )}

        <div className="mt-7 table-shell overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-border-lighter bg-surface-card">
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Document</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Index Status</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Sections</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Path</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Modified</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Processed At</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-lighter">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-card transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-3">
                      <FileText size={17} className="mt-0.5 flex-shrink-0 text-brand" />
                      <div>
                        <p className="max-w-sm truncate text-sm font-semibold text-dark">{doc.name}</p>
                        <p className="mt-1 text-xs text-muted-light">{doc.source_file_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm uppercase tracking-[0.12em] text-muted-light">{doc.document_type || '--'}</td>
                  <td className="px-6 py-5">
                    {doc.status === 'indexed' && <StatusPill tone="success">Indexed</StatusPill>}
                    {doc.status === 'synced_only' && <StatusPill tone="warning">Synced Only</StatusPill>}
                    {doc.status === 'deleted' && <StatusPill tone="danger">Deleted</StatusPill>}
                  </td>
                  <td className="px-6 py-5 text-sm text-dark-secondary">{doc.section_count || 0}</td>
                  <td className="px-6 py-5 text-sm text-muted">{doc.path || '--'}</td>
                  <td className="px-6 py-5 text-sm text-muted-light">{doc.last_modified ? format(new Date(doc.last_modified), 'MMM d, yyyy HH:mm') : '--'}</td>
                  <td className="px-6 py-5 text-sm text-muted-light">{doc.processed_at ? format(new Date(doc.processed_at), 'MMM d, yyyy HH:mm') : '--'}</td>
                  <td className="px-6 py-5 text-right">
                    {doc.web_url && (
                      <a href={doc.web_url} target="_blank" rel="noopener noreferrer" className="inline-flex text-brand transition-colors hover:text-brand-hover">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SystemPrompt() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [activePromptTab, setActivePromptTab] = useState('docprocessing');

  const [docPrompt, setDocPrompt] = useState('');
  const [origDocPrompt, setOrigDocPrompt] = useState('');
  const [docLoading, setDocLoading] = useState(true);
  const [docSaving, setDocSaving] = useState(false);
  const [docSaved, setDocSaved] = useState(false);
  const [docCopied, setDocCopied] = useState(false);

  const [chatPrompt, setChatPrompt] = useState('');
  const [origChatPrompt, setOrigChatPrompt] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [chatSaving, setChatSaving] = useState(false);
  const [chatSaved, setChatSaved] = useState(false);
  const [chatCopied, setChatCopied] = useState(false);

  useEffect(() => {
    const loadDoc = async () => {
      try {
        const res = await api.get('/api/admin/system-prompt');
        setDocPrompt(res.data.prompt);
        setOrigDocPrompt(res.data.prompt);
      } catch (err) {
        console.error('Failed to load doc processing prompt:', err);
      }
      setDocLoading(false);
    };
    const loadChat = async () => {
      try {
        const res = await api.get('/api/admin/chat-system-prompt');
        setChatPrompt(res.data.prompt);
        setOrigChatPrompt(res.data.prompt);
      } catch (err) {
        console.error('Failed to load chat prompt:', err);
      }
      setChatLoading(false);
    };
    loadDoc();
    loadChat();
  }, []);

  const copyToClipboard = async (text, setCopied) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback ignored */
    }
  };

  const handleSaveDoc = async () => {
    setDocSaving(true);
    setDocSaved(false);
    try {
      await api.put('/api/admin/system-prompt', { prompt: docPrompt });
      setOrigDocPrompt(docPrompt);
      setDocSaved(true);
      setTimeout(() => setDocSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
    setDocSaving(false);
  };

  const handleSaveChat = async () => {
    setChatSaving(true);
    setChatSaved(false);
    try {
      await api.put('/api/admin/chat-system-prompt', { prompt: chatPrompt });
      setOrigChatPrompt(chatPrompt);
      setChatSaved(true);
      setTimeout(() => setChatSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
    setChatSaving(false);
  };

  const docHasChanges = docPrompt !== origDocPrompt;
  const chatHasChanges = chatPrompt !== origChatPrompt;

  const promptTabs = [
    { id: 'docprocessing', label: 'Document Processing' },
    { id: 'chatbot', label: 'Chatbot' },
  ];

  if (docLoading || chatLoading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-lighter" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-dark">System Prompts</h2>
        <p className="mt-1 text-sm text-muted">
          {isSuperAdmin
            ? 'Configure assistant behavior separately for document processing (batch/RFP) and the chatbot.'
            : 'View the system prompts that configure assistant behavior. Only the Super Admin can edit these.'}
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-gray-900 dark:bg-gray-800 px-5 py-4">
          <Mail size={18} className="mt-0.5 shrink-0 text-white/70" />
          <p className="text-sm text-white/90">
            To request changes to system prompts, please email{' '}
            <a href="mailto:infosec@netradyne.com" className="font-bold text-white underline hover:no-underline">infosec@netradyne.com</a>
          </p>
        </div>
      )}

      <div className="segment-wrap mb-6 flex w-full overflow-x-auto">
        {promptTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePromptTab(tab.id)}
            className={`segment-button flex min-w-max items-center justify-center gap-2.5 whitespace-nowrap ${
              activePromptTab === tab.id ? 'segment-button-active' : 'hover:text-dark-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activePromptTab === 'docprocessing' && (
        <div className="panel-card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-dark-secondary">Document Processing Prompt</p>
              <p className="mt-1 text-xs text-muted">Used for batch document processing, RFP responses, and the Doc Processing page.</p>
            </div>
            <button
              onClick={() => copyToClipboard(docPrompt, setDocCopied)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-light hover:text-dark transition-colors"
              title="Copy prompt to clipboard"
            >
              {docCopied ? <><CheckCircle size={14} className="text-emerald-500" /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <textarea
            value={docPrompt}
            onChange={(e) => isSuperAdmin && setDocPrompt(e.target.value)}
            readOnly={!isSuperAdmin}
            rows={14}
            className={`w-full resize-y rounded-2xl border border-border bg-input-bg px-4 py-3 text-sm font-mono text-dark-secondary transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand ${!isSuperAdmin ? 'cursor-default opacity-80' : ''}`}
            placeholder="Enter the system prompt for document processing..."
          />
          {isSuperAdmin && (
            <div className="mt-5 flex items-center justify-between">
              <div>
                {docSaved && (
                  <span className="flex items-center gap-2 text-sm font-semibold text-success-dark">
                    <CheckCircle size={16} /> Saved successfully
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {docHasChanges && (
                  <button onClick={() => setDocPrompt(origDocPrompt)} className="button-secondary flex h-11 items-center gap-2 rounded-2xl px-5 text-sm hover:bg-surface-light">
                    <RotateCcw size={15} /> Discard
                  </button>
                )}
                <button onClick={handleSaveDoc} disabled={!docHasChanges || docSaving} className="button-primary flex h-11 items-center gap-2 rounded-2xl px-5 text-sm disabled:opacity-40">
                  {docSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activePromptTab === 'chatbot' && (
        <div className="panel-card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-dark-secondary">Chatbot Prompt</p>
              <p className="mt-1 text-xs text-muted">Used for the conversational chatbot. This prompt instructs the assistant to maintain conversation context and history awareness.</p>
            </div>
            <button
              onClick={() => copyToClipboard(chatPrompt, setChatCopied)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-light hover:text-dark transition-colors"
              title="Copy prompt to clipboard"
            >
              {chatCopied ? <><CheckCircle size={14} className="text-emerald-500" /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <textarea
            value={chatPrompt}
            onChange={(e) => isSuperAdmin && setChatPrompt(e.target.value)}
            readOnly={!isSuperAdmin}
            rows={14}
            className={`w-full resize-y rounded-2xl border border-border bg-input-bg px-4 py-3 text-sm font-mono text-dark-secondary transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand ${!isSuperAdmin ? 'cursor-default opacity-80' : ''}`}
            placeholder="Enter the system prompt for the chatbot..."
          />
          {isSuperAdmin && (
            <div className="mt-5 flex items-center justify-between">
              <div>
                {chatSaved && (
                  <span className="flex items-center gap-2 text-sm font-semibold text-success-dark">
                    <CheckCircle size={16} /> Saved successfully
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {chatHasChanges && (
                  <button onClick={() => setChatPrompt(origChatPrompt)} className="button-secondary flex h-11 items-center gap-2 rounded-2xl px-5 text-sm hover:bg-surface-light">
                    <RotateCcw size={15} /> Discard
                  </button>
                )}
                <button onClick={handleSaveChat} disabled={!chatHasChanges || chatSaving} className="button-primary flex h-11 items-center gap-2 rounded-2xl px-5 text-sm disabled:opacity-40">
                  {chatSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState({ actions: [] });
  const [timeRange, setTimeRange] = useState('24h');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const perPage = 30;

  const TIME_PRESETS = [
    { id: '15m', label: '15 min' },
    { id: '30m', label: '30 min' },
    { id: '1h', label: '1 hour' },
    { id: '24h', label: '24 hours' },
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: 'custom', label: 'Custom' },
  ];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: perPage });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (actionFilter) params.set('action', actionFilter);
      if (timeRange === 'custom') {
        if (customFrom) params.set('from', new Date(customFrom).toISOString());
        if (customTo) params.set('to', new Date(customTo).toISOString());
        params.set('range', 'custom');
      } else {
        params.set('range', timeRange);
      }
      const res = await api.get(`/api/admin/audit-logs?${params}`);
      setLogs(res.data.logs);
      setTotal(res.data.total);
      if (res.data.filters) setFilterOptions(res.data.filters);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
    setLoading(false);
  }, [page, debouncedSearch, actionFilter, timeRange, customFrom, customTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / perPage);
  const hasActiveFilters = actionFilter || debouncedSearch || timeRange !== '24h';

  const clearAllFilters = () => {
    setSearch(''); setDebouncedSearch('');
    setActionFilter('');
    setTimeRange('24h'); setCustomFrom(''); setCustomTo('');
    setPage(1);
  };

  const ACTION_LABELS = {
    user_login: 'Signed In',
    user_registered: 'Registered',
    user_created: 'User Created',
    user_activated: 'User Activated',
    user_deactivated: 'User Deactivated',
    user_deleted: 'User Deleted',
    role_changed: 'Role Changed',
    profile_updated: 'Profile Updated',
    chat_message: 'Chat Message',
    chat_exported: 'Chat Exported',
    excel_uploaded: 'Excel Uploaded',
    batch_processing_started: 'Batch Started',
    batch_processing_stop_requested: 'Batch Stopped',
    batch_downloaded: 'Batch Downloaded',
    system_prompt_updated: 'Prompt Updated',
    chat_system_prompt_updated: 'Chat Prompt Updated',
    knowledge_source_synced: 'Knowledge Synced',
    sharepoint_config_updated: 'SharePoint Config Updated',
  };

  const getActionColor = (action) => {
    const colors = {
      user_login: 'bg-emerald-500/90 text-white dark:bg-emerald-900/30 dark:text-emerald-300',
      user_registered: 'bg-blue-500/90 text-white dark:bg-blue-900/30 dark:text-blue-300',
      user_created: 'bg-blue-500/90 text-white dark:bg-blue-900/30 dark:text-blue-300',
      user_activated: 'bg-green-500/90 text-white dark:bg-green-900/30 dark:text-green-300',
      user_deactivated: 'bg-red-400/90 text-white dark:bg-red-900/30 dark:text-red-300',
      user_deleted: 'bg-red-500/90 text-white dark:bg-red-900/30 dark:text-red-300',
      role_changed: 'bg-amber-500/90 text-white dark:bg-amber-900/30 dark:text-amber-300',
      profile_updated: 'bg-indigo-500/90 text-white dark:bg-indigo-900/30 dark:text-indigo-300',
      chat_message: 'bg-purple-500/90 text-white dark:bg-purple-900/30 dark:text-purple-300',
      chat_exported: 'bg-purple-500/90 text-white dark:bg-purple-900/30 dark:text-purple-300',
      excel_uploaded: 'bg-cyan-500/90 text-white dark:bg-cyan-900/30 dark:text-cyan-300',
      batch_processing_started: 'bg-blue-500/90 text-white dark:bg-blue-900/30 dark:text-blue-300',
      batch_processing_stop_requested: 'bg-orange-500/90 text-white dark:bg-orange-900/30 dark:text-orange-300',
      batch_downloaded: 'bg-teal-500/90 text-white dark:bg-teal-900/30 dark:text-teal-300',
      system_prompt_updated: 'bg-orange-500/90 text-white dark:bg-orange-900/30 dark:text-orange-300',
      chat_system_prompt_updated: 'bg-orange-500/90 text-white dark:bg-orange-900/30 dark:text-orange-300',
      knowledge_source_synced: 'bg-emerald-500/90 text-white dark:bg-emerald-900/30 dark:text-emerald-300',
      sharepoint_config_updated: 'bg-indigo-500/90 text-white dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    return colors[action] || 'bg-gray-500/90 text-white dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-dark">Audit Logs</h2>
        <p className="mt-1 text-sm text-muted">Activity log for the last 30 days. Older entries are automatically purged.</p>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-lighter" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full rounded-xl border border-border bg-input-bg pl-10 pr-4 py-2.5 text-sm text-dark placeholder:text-muted-lighter transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-lighter hover:text-dark">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-10 appearance-none rounded-xl border border-border bg-input-bg pl-3 pr-8 text-sm text-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">All Actions</option>
            {filterOptions.actions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] || a.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <Filter size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-lighter" />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-light hover:text-dark transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Time range selector */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Clock size={14} className="text-muted-lighter" />
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-input-bg p-0.5">
          {TIME_PRESETS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTimeRange(t.id); setPage(1); }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                timeRange === t.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-muted hover:text-dark'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {timeRange === 'custom' && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted">From</label>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-input-bg px-3 py-2 text-sm text-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted">To</label>
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-input-bg px-3 py-2 text-sm text-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="mb-3 text-xs font-medium text-muted">{total} log{total !== 1 ? 's' : ''}{hasActiveFilters ? ' matched' : ' total'}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-lighter" /></div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={32} className="mb-3 text-muted-lighter" />
          <p className="text-sm font-medium text-muted">No audit logs found</p>
          {hasActiveFilters && <p className="mt-1 text-xs text-muted-lighter">Try adjusting your search or time range</p>}
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-border-lighter bg-surface-card">
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Action</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Details</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-lighter">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-card transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-light whitespace-nowrap">{log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm:ss') : '--'}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-dark">{log.user_name || '--'}</p>
                    <p className="text-xs text-muted-light">{log.user_email || ''}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getActionColor(log.action)}`}>{ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="max-w-[260px] truncate px-6 py-4 text-sm text-muted-light" title={log.details || ''}>{log.details || '--'}</td>
                  <td className="px-6 py-4 text-sm text-muted-lighter">{log.ip_address || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-muted-light">Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="icon-button h-10 w-10 border border-border text-muted-light hover:bg-surface-light hover:text-dark-secondary disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium text-dark-secondary">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="icon-button h-10 w-10 border border-border text-muted-light hover:bg-surface-light hover:text-dark-secondary disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
