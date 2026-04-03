import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, MessageSquare, FolderOpen, Settings, LogOut, User, Sun, Moon, ArrowUp, Key, ChevronDown } from 'lucide-react';
import logo from "../assets/NetraDyne_id0zbN9jAQ_7.png";

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
  const { user, logout } = useAuth();
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
  const userMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    </div>
  );
}
