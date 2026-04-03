import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, MessageSquare, FolderOpen, Settings, LogOut, User, Sun, Moon, ArrowUp, Key, ChevronDown, X, Loader2, CheckCircle, Pencil } from 'lucide-react';
import logo from "../assets/NetraDyne_id0zbN9jAQ_7.png";
import api from '../api';

function TypingText({ text, className = '', style, speed = 60 }) {
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
    <span className={className} style={style}>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[0.85em] bg-current align-middle ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

export default function Layout() {
  const { user, logout, checkAuth } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const navRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const isSuperAdmin = user?.role === 'super_admin';
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [navSticky, setNavSticky] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ full_name: '', current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChangePassword = async () => {
    setPwError('');
    const hasNewPw = pwForm.new_password || pwForm.confirm_password || pwForm.current_password;
    const hasNameChange = pwForm.full_name && pwForm.full_name !== (user?.full_name || '');
    if (!hasNewPw && !hasNameChange) { setPwError('Nothing to update'); return; }
    if (hasNewPw) {
      if (!pwForm.current_password) { setPwError('Current password is required to change password'); return; }
      if (!pwForm.new_password) { setPwError('New password is required'); return; }
      if (pwForm.new_password.length < 6) { setPwError('New password must be at least 6 characters'); return; }
      if (pwForm.new_password !== pwForm.confirm_password) { setPwError('New passwords do not match'); return; }
    }
    setPwSaving(true);
    try {
      const payload = {};
      if (hasNameChange) payload.full_name = pwForm.full_name;
      if (hasNewPw) { payload.current_password = pwForm.current_password; payload.new_password = pwForm.new_password; }
      await api.put('/api/auth/change-password', payload);
      setPwSuccess(true);
      if (hasNameChange) await checkAuth();
      setTimeout(() => { setShowPasswordModal(false); setPwSuccess(false); setPwForm({ full_name: '', current_password: '', new_password: '', confirm_password: '' }); }, 1500);
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to update profile');
    }
    setPwSaving(false);
  };

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      if (navRef.current) {
        const navTop = navRef.current.getBoundingClientRect().top;
        setNavSticky(navTop <= 0);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tabs = [
    { to: '/doc-processing', label: 'Document Processing', icon: FileText },
    { to: '/chat', label: 'NetraBOT', icon: MessageSquare },
    { to: '/downloads', label: 'Downloads', icon: FolderOpen },
  ];

  if (isAdmin) {
    tabs.push({ to: '/admin', label: 'Admin Panel', icon: Settings });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* ── Header ── */}
      <header className="border-b border-border-light/60 bg-header/90 backdrop-blur-xl animate-fade-down">
        <div className="page-shell py-3">
          <div className="flex min-h-[4.75rem] items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="logo-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light shadow-sm">
                <img src={logo} alt="Logo" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <span className="block text-lg font-extrabold tracking-tight text-dark">NetraASSIST</span>
                <TypingText text="AN INFOSEC INNOVATION" className="block text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#45B87F' }} speed={70} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="icon-button h-11 w-11 border border-border-light bg-card text-muted-light hover:-translate-y-0.5 hover:text-dark hover:shadow-md transition-all"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="hidden h-7 w-px bg-border-light md:block"></div>
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="hidden items-center gap-3 rounded-2xl border border-border-light bg-card px-3 py-2 md:flex hover:bg-surface-light transition-colors cursor-pointer"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface">
                    <User size={15} className="text-muted-light" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-light">Signed In</p>
                    <p className="text-sm font-semibold text-dark-secondary">{displayName}</p>
                  </div>
                  <ChevronDown size={14} className={`text-muted-light transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {isAdmin && (
                <span className="hidden rounded-full bg-brand-light px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-brand md:inline-flex">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── User dropdown (rendered outside header to avoid backdrop-blur) ── */}
      {userMenuOpen && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setUserMenuOpen(false)} />
          <div
            ref={userMenuRef}
            className="fixed z-[999] w-56 rounded-2xl border border-border-light bg-card shadow-2xl overflow-hidden animate-fade-up"
            style={{ top: '80px', right: '24px' }}
          >
            <div className="px-4 py-3 border-b border-border-lighter">
              <p className="text-sm font-semibold text-dark truncate">{displayName}</p>
              <p className="text-xs text-muted-light truncate">{user?.email}</p>
            </div>
            {!isSuperAdmin && (
              <button
                onClick={() => { setUserMenuOpen(false); setPwForm({ full_name: user?.full_name || '', current_password: '', new_password: '', confirm_password: '' }); setShowPasswordModal(true); }}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-dark-secondary hover:bg-surface-light transition-colors"
              >
                <Pencil size={15} className="text-muted-light" />
                Update Profile
              </button>
            )}
            <button
              onClick={() => { setUserMenuOpen(false); handleLogout(); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </>
      )}

      {/* ── Welcome Hero ── */}
      <div className="page-shell app-page animate-fade-up">
        <div className="page-section hero-section">
          <div className="flex items-center gap-5">
            <div className="hero-greeting-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-light">
              <span className="text-2xl">👋</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight text-dark lg:text-3xl">
                Welcome back, <span className="text-brand">{displayName}</span>
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Your AI-powered workspace for RFP &amp; security questionnaire automation. Pick a tab below to get started.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Nav Tabs ── */}
      <div ref={navRef} className={`sticky-nav-wrapper ${navSticky ? 'stuck' : ''}`}>
        <div className="page-shell">
          <div className="flex items-center gap-3">
            <nav className="nav-tabs-bar flex-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname.startsWith(tab.to);
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={`nav-tab-item ${isActive ? 'nav-tab-active' : ''}`}
                  >
                    <Icon size={17} />
                    {tab.label}
                  </NavLink>
                );
              })}
            </nav>
            {navSticky && (
              <button
                onClick={toggleTheme}
                className="icon-button h-9 w-9 shrink-0 border border-border-light bg-card text-muted-light hover:text-dark hover:shadow-md transition-all rounded-xl animate-fade-in"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="min-h-0 flex-1 pb-10 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border-light/60 bg-header/80 backdrop-blur-md mt-auto">
        <div className="page-shell py-10">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light">
                  <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <span className="block text-base font-extrabold tracking-tight text-dark">NetraASSIST</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#45B87F' }}>An InfoSec Innovation</span>
                </div>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
                AI-powered workspace for answering RFP/RFQ questionnaires with enterprise-grade accuracy and speed.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-light mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><Link to="/doc-processing" className="text-sm text-dark-secondary transition-colors hover:text-brand">Document Processing</Link></li>
                <li><Link to="/chat" className="text-sm text-dark-secondary transition-colors hover:text-brand">NetraBOT</Link></li>
                <li><Link to="/downloads" className="text-sm text-dark-secondary transition-colors hover:text-brand">Downloads</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-light mb-4">Resources</h4>
              <ul className="space-y-2.5">
                <li><Link to="/about" className="text-sm text-dark-secondary transition-colors hover:text-brand">About</Link></li>
                <li><Link to="/how-to-use" className="text-sm text-dark-secondary transition-colors hover:text-brand">How to Use</Link></li>
                <li><Link to="/how-it-works" className="text-sm text-dark-secondary transition-colors hover:text-brand">How it Works</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-light mb-4">Contact</h4>
              <ul className="space-y-2.5">
                <li><Link to="/contact" className="text-sm text-dark-secondary transition-colors hover:text-brand">Contact Us</Link></li>
                <li><a href="mailto:infosec@netradyne.com" className="text-sm text-dark-secondary transition-colors hover:text-brand">infosec@netradyne.com</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border-light/60 pt-6 md:flex-row">
            <p className="text-xs text-muted-light">
              &copy; {new Date().getFullYear()} NetraASSIST — <span style={{ color: '#45B87F' }}>An InfoSec Innovation</span> by Netradyne. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/about" className="text-xs text-muted-light transition-colors hover:text-brand">About</Link>
              <Link to="/how-to-use" className="text-xs text-muted-light transition-colors hover:text-brand">Guide</Link>
              <Link to="/how-it-works" className="text-xs text-muted-light transition-colors hover:text-brand">Technology</Link>
              <Link to="/contact" className="text-xs text-muted-light transition-colors hover:text-brand">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="scroll-top-btn"
          title="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* ── Update Profile Modal ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-border-light bg-card shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-lighter px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Pencil size={18} className="text-brand" />
                <h3 className="text-base font-bold text-dark">Update Profile</h3>
              </div>
              <button onClick={() => { setShowPasswordModal(false); setPwError(''); setPwSuccess(false); setPwForm({ full_name: '', current_password: '', new_password: '', confirm_password: '' }); }} className="icon-button h-8 w-8 text-muted-light hover:text-dark">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {pwError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">{pwError}</div>
              )}
              {pwSuccess ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <CheckCircle size={40} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Profile updated successfully!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={pwForm.full_name}
                      onChange={(e) => setPwForm({ ...pwForm, full_name: e.target.value })}
                      className="w-full h-11 rounded-xl border border-border bg-input-bg px-3 text-sm text-dark placeholder:text-muted-lighter focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      placeholder="Your display name"
                    />
                  </div>
                  <div className="border-t border-border-lighter pt-4">
                    <p className="text-xs font-semibold text-muted mb-3">Change Password <span className="font-normal text-muted-lighter">(optional)</span></p>
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={pwForm.current_password}
                        onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-input-bg px-3 text-sm text-dark placeholder:text-muted-lighter focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Current password"
                      />
                      <input
                        type="password"
                        value={pwForm.new_password}
                        onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-input-bg px-3 text-sm text-dark placeholder:text-muted-lighter focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="New password (min 6 chars)"
                      />
                      <input
                        type="password"
                        value={pwForm.confirm_password}
                        onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                        className="w-full h-11 rounded-xl border border-border bg-input-bg px-3 text-sm text-dark placeholder:text-muted-lighter focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => { setShowPasswordModal(false); setPwError(''); setPwForm({ full_name: '', current_password: '', new_password: '', confirm_password: '' }); }} className="button-secondary flex h-10 items-center gap-2 rounded-xl px-4 text-sm">
                      Cancel
                    </button>
                    <button onClick={handleChangePassword} disabled={pwSaving} className="button-primary flex h-10 items-center gap-2 rounded-xl px-4 text-sm disabled:opacity-40">
                      {pwSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                      Save Changes
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
