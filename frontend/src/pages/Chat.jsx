import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Plus, Trash2, Download, MessageSquare, Loader2, Copy, Check, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCopy = async (id, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/api/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
    setLoadingConvs(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (convId) => {
    try {
      const res = await api.get(`/api/conversations/${convId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv);
    else setMessages([]);
  }, [activeConv, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = () => {
    setActiveConv(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput('');
    setSending(true);

    const tempUserMsg = { id: 'temp-user', role: 'user', content: question, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.post('/api/chat', { message: question, conversation_id: activeConv });
      if (!activeConv) {
        setActiveConv(res.data.conversation_id);
        loadConversations();
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'temp-user'),
        { ...tempUserMsg, id: `user-${Date.now()}` },
        res.data.message,
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: 'error', role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() },
      ]);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDelete = async (convId) => {
    try {
      await api.delete(`/api/conversations/${convId}`);
      if (activeConv === convId) { setActiveConv(null); setMessages([]); }
      loadConversations();
    } catch {}
  };

  const handleExport = async () => {
    if (!activeConv) return;
    try { await api.post(`/api/conversations/${activeConv}/export`); } catch {}
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-shell app-page">
        <div className="page-section flex min-h-[calc(100vh-17rem)] overflow-hidden p-0 animate-fade-up">
          {/* ── Collapsible Sidebar ── */}
          <aside
            className={`flex flex-col border-r border-border-light transition-all duration-300 ease-in-out overflow-hidden ${
              sidebarOpen ? 'w-[320px] min-w-[320px]' : 'w-0 min-w-0'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border-lighter px-5 py-4">
              <div>
                <div className="section-kicker">
                  <MessageSquare size={15} />
                  Assistant
                </div>
                <h2 className="mt-1 text-base font-extrabold text-dark">Conversations</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="icon-button h-9 w-9 text-muted-light hover:bg-surface-light hover:text-dark"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>

            <div className="px-4 py-3">
              <button
                onClick={handleNewConversation}
                className="button-primary flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm hover:-translate-y-0.5"
              >
                <Plus size={16} /> New Conversation
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {loadingConvs ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-muted-lighter" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <MessageSquare size={32} className="mx-auto mb-3 text-border" />
                  <p className="text-sm font-medium text-muted">No conversations yet</p>
                  <p className="mt-1 text-xs text-muted-light">Start by asking a question</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
                        activeConv === conv.id
                          ? 'bg-brand-light text-brand'
                          : 'text-dark-secondary hover:bg-surface-light'
                      }`}
                      onClick={() => setActiveConv(conv.id)}
                    >
                      <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
                      <span className="flex-1 truncate text-sm font-semibold">{conv.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                        className="icon-button h-7 w-7 text-muted-lighter opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ── Chat Area ── */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top bar with toggle */}
            <div className="flex items-center gap-3 border-b border-border-lighter px-5 py-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="icon-button h-9 w-9 text-muted-light hover:bg-surface-light hover:text-dark"
                  title="Show conversations"
                >
                  <PanelLeftOpen size={18} />
                </button>
              )}
              <h2 className="text-sm font-bold text-dark">
                {activeConv
                  ? conversations.find(c => c.id === activeConv)?.title || 'Conversation'
                  : 'New Conversation'}
              </h2>
              {activeConv && (
                <button
                  onClick={handleExport}
                  className="icon-button ml-auto h-9 w-9 text-muted-light hover:bg-brand-light hover:text-brand"
                  title="Export conversation"
                >
                  <Download size={16} />
                </button>
              )}
            </div>

            {/* Messages */}
            {messages.length === 0 && !activeConv ? (
              <div className="flex flex-1 items-center justify-center px-8 py-12 md:px-10">
                <div className="max-w-2xl text-center">
                  <div className="mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.75rem] bg-brand-light">
                    <MessageSquare size={32} className="text-brand" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-dark">Ask the assistant</h2>
                  <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted">
                    Search the knowledge base, inspect previous context, and get a usable in-depth response without leaving the workspace.
                  </p>
                  <div className="mt-8 grid gap-3 md:grid-cols-2">
                    {[
                      'What are our security policies?',
                      'Show me compliance requirements',
                      'Explain our incident response plan',
                      'What access controls do we have?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="rounded-2xl border border-border-light bg-card p-4 text-left text-sm font-semibold text-dark-secondary transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-7 md:px-8 md:py-8">
                <div className="mx-auto max-w-4xl space-y-5">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light">
                          <MessageSquare size={16} className="text-brand" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <div
                          className={`max-w-[82%] rounded-[1.5rem] px-5 py-4 ${
                            msg.role === 'user'
                              ? 'bg-chat-user text-white shadow-sm'
                              : 'border border-chat-bot-border bg-chat-bot-bg text-dark-secondary shadow-sm'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="mt-1 ml-2 text-muted-light transition-colors hover:text-brand"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light">
                        <MessageSquare size={16} className="text-brand" />
                      </div>
                      <div className="rounded-[1.5rem] border border-chat-bot-border bg-chat-bot-bg px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-1">
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="border-t border-border-light bg-card/80 px-6 py-5 md:px-8 md:py-5">
              <div className="mx-auto max-w-4xl">
                <div className="flex items-end gap-3">
                  <div className="relative flex-1">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question..."
                      rows={1}
                      className="w-full resize-none rounded-[1.5rem] border border-border bg-input-bg px-5 py-4 pr-16 text-sm text-dark transition-all placeholder:text-muted-lighter focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                      style={{ maxHeight: '120px' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="button-primary absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-40 disabled:transform-none"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-muted-lighter">
                  NetraASSIST answers from your organization&apos;s knowledge base only. Review outputs before use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
