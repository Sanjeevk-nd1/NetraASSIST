import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, FileText, MessageSquare, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { format } from 'date-fns';

export default function Downloads() {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewAll, setViewAll] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const loadDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const params = isAdmin && viewAll ? '?all=true' : '';
      const res = await api.get(`/api/downloads${params}`);
      setDownloads(res.data);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    }
    setLoading(false);
  }, [isAdmin, viewAll]);

  useEffect(() => { loadDownloads(); }, [loadDownloads]);

  const handleDownload = async (id, filename) => {
    try {
      const res = await api.get(`/api/downloads/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/downloads/${id}`);
      loadDownloads();
    } catch {
      alert('Delete failed');
    }
  };

  const getIcon = (type) => {
    if (type === 'chat_export') return <MessageSquare size={18} className="text-brand" />;
    return <FileText size={18} className="text-muted-light" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="page-section animate-fade-up">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="section-header mb-0">
              <div className="section-kicker">
                <Download size={15} />
                Exports
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-dark">Downloded Files</h1>
                <p className="mt-1 text-sm text-muted">Your exported files and chat history.</p>
              </div>
            </div>
            {isAdmin && (
              <div className="segment-wrap">
                <button
                  onClick={() => setViewAll(false)}
                  className={`segment-button ${!viewAll ? 'segment-button-active' : 'hover:text-dark-secondary'}`}
                >
                  My Files
                </button>
                <button
                  onClick={() => setViewAll(true)}
                  className={`segment-button ${viewAll ? 'segment-button-active' : 'hover:text-dark-secondary'}`}
                >
                  All Users
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={28} className="animate-spin text-muted-lighter" />
            </div>
          ) : downloads.length === 0 ? (
            <div className="panel-card py-20 text-center">
              <Download size={44} className="mx-auto mb-4 text-border" />
              <p className="text-base font-semibold text-dark-secondary">No files yet</p>
              <p className="mt-1 text-sm text-muted-light">Export chat conversations to see them here.</p>
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-border-lighter bg-surface-card">
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">File</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Type</th>
                  {viewAll && <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">User</th>}
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Size</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-lighter">
                {downloads.map((dl) => (
                  <tr key={dl.id} className="hover:bg-surface-card transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getIcon(dl.file_type)}
                        <span className="text-sm font-medium text-dark truncate max-w-[240px]">{dl.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold bg-surface text-muted rounded-full">
                        {dl.file_type === 'chat_export' ? 'Chat Export' : dl.file_type}
                      </span>
                    </td>
                    {viewAll && <td className="px-6 py-4 text-sm text-muted">{dl.user_email || '--'}</td>}
                    <td className="px-6 py-4 text-sm text-muted-light">{formatSize(dl.file_size)}</td>
                    <td className="px-6 py-4 text-sm text-muted-light">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {dl.created_at ? format(new Date(dl.created_at), 'MMM d, yyyy HH:mm') : '--'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(dl.id, dl.filename)}
                          className="icon-button h-10 w-10 text-muted-light hover:bg-brand-light hover:text-brand"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        {!viewAll && (
                          <button
                            onClick={() => handleDelete(dl.id)}
                            className="icon-button h-10 w-10 text-muted-light hover:bg-red-50 hover:text-danger"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
