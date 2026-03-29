import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import Layout from './components/Layout';
import Chat from './pages/Chat';
import DocProcessing from './pages/DocProcessing';
import Downloads from './pages/Downloads';
import Admin from './pages/Admin';
import About from './pages/About';
import Contact from './pages/Contact';
import HowToUse from './pages/HowToUse';
import HowItWorks from './pages/HowItWorks';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin' && user.role !== 'super_admin') return <Navigate to="/" />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted text-sm font-medium">Loading NetraASSIST...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/doc-processing" />} />
        <Route path="doc-processing" element={<DocProcessing />} />
        <Route path="chat" element={<Chat />} />
        <Route path="downloads" element={<Downloads />} />
        <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="how-to-use" element={<HowToUse />} />
        <Route path="how-it-works" element={<HowItWorks />} />
      </Route>
    </Routes>
    </>
  );
}
