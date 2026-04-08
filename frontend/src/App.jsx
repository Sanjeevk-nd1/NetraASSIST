import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import Layout from './components/Layout';

const Chat = lazy(() => import('./pages/Chat'));
const DocProcessing = lazy(() => import('./pages/DocProcessing'));
const Downloads = lazy(() => import('./pages/Downloads'));
const Admin = lazy(() => import('./pages/Admin'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const HowToUse = lazy(() => import('./pages/HowToUse'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
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
        <Route path="doc-processing" element={<Suspense fallback={<PageLoader />}><DocProcessing /></Suspense>} />
        <Route path="chat" element={<Suspense fallback={<PageLoader />}><Chat /></Suspense>} />
        <Route path="downloads" element={<Suspense fallback={<PageLoader />}><Downloads /></Suspense>} />
        <Route path="admin" element={<AdminRoute><Suspense fallback={<PageLoader />}><Admin /></Suspense></AdminRoute>} />
        <Route path="about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
        <Route path="contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
        <Route path="how-to-use" element={<Suspense fallback={<PageLoader />}><HowToUse /></Suspense>} />
        <Route path="how-it-works" element={<Suspense fallback={<PageLoader />}><HowItWorks /></Suspense>} />
      </Route>
    </Routes>
    </>
  );
}
