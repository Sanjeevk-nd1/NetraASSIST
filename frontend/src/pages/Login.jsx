import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, AlertCircle, Sun, Moon } from 'lucide-react';
import logo from "../assets/NetraDyne_id0zbN9jAQ_7.png";

function TypingText({ text, className = '', speed = 60 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <p className={className}>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-brand align-middle ml-0.5 animate-pulse" />
      )}
    </p>
  );
}

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [emailLocal, setEmailLocal] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        const fullEmail = emailLocal.trim().toLowerCase() + '@netradyne.com';
        await register(fullEmail, password, fullName);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || (mode === 'signin' ? 'Invalid credentials.' : 'Registration failed. Please try again.'));
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-5 py-10 md:px-8 md:py-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(75,131,240,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_24%)]" />
      <button
        onClick={toggleTheme}
        className="icon-button absolute right-5 top-5 z-10 h-11 w-11 border border-border-light bg-card text-muted-light hover:-translate-y-0.5 hover:text-dark hover:shadow-md md:right-8 md:top-8"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="relative z-10 w-full max-w-6xl animate-scale-in">
        <div className="grid items-stretch gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="page-section flex flex-col justify-between animate-fade-up">
            <div>
              <div className="section-kicker">
                <FileText size={15} />
                Netradyne's Intelligence
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.75rem] bg-brand-light">
                  <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
                </div>
                <h1 className="max-w-md text-4xl font-extrabold tracking-tight text-dark lg:text-5xl">
                  NetraASSIST
                </h1>
              </div>
              <TypingText text="AN INFOSEC INNOVATION" className="mt-5 text-sm font-semibold uppercase tracking-widest text-brand" speed={70} />
              <p className="mt-4 max-w-lg text-base leading-7 text-muted">
                AI powered workspace for answering RFP/RFQ Questionnaires and controlled review system.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {[
                'Structured Excel processing',
                'Review and accept responses',
                'Context-aware assistant Chatbot',
                'Exported deliverables',
              ].map((item) => (
                <div key={item} className="rounded-[1.35rem] border border-border-light bg-card px-5 py-4 text-sm font-semibold text-dark-secondary shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-2xl font-extrabold text-dark">Access Workspace</h2>
            <p className="mt-2 text-sm text-muted">Sign in to your account or create a new one.</p>

            <div className="segment-wrap mt-8 mb-8 flex w-full">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className={`segment-button flex-1 ${mode === 'signin' ? 'segment-button-active' : 'hover:text-dark-secondary'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); }}
                className={`segment-button flex-1 ${mode === 'signup' ? 'segment-button-active' : 'hover:text-dark-secondary'}`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-snug text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'signup' && (
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-dark-secondary">Username</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-dark transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand bg-input-bg"
                    placeholder="Choose a username"
                    required
                  />
                </div>
              )}

              {mode === 'signin' ? (
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-dark-secondary">Email or Username</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-dark transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand bg-input-bg"
                    placeholder="Enter email or username"
                    required
                    autoComplete="username"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-dark-secondary">Email</label>
                  <div className="flex items-center rounded-2xl border border-border bg-input-bg transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                    <input
                      type="text"
                      value={emailLocal}
                      onChange={(e) => setEmailLocal(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                      className="flex-1 rounded-l-2xl border-0 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-muted-lighter focus:outline-none"
                      placeholder="your.name"
                      required
                      autoComplete="email"
                    />
                    <span className="shrink-0 pr-4 text-sm font-semibold text-muted select-none">@netradyne.com</span>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-dark-secondary">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-dark transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand bg-input-bg"
                  placeholder="Enter your password"
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={mode === 'signup' ? 6 : undefined}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="button-primary flex h-12 w-full items-center justify-center rounded-2xl text-sm hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none"
              >
                {loading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
