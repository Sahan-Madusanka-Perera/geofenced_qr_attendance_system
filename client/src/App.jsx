import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import ProjectorView from './pages/ProjectorView';
import CheckIn from './pages/CheckIn';
import AdminGeofence from './pages/AdminGeofence';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';

const home = (role) => (role === 'student' ? '/dashboard' : '/lecturer');

function Booting() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-board">
      <span className="animate-gate-pulse font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
        Loading
      </span>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Booting />;
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${back}`} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={home(user.role)} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Booting />;
  if (user) return <Navigate to={home(user.role)} replace />;
  return children;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6">
      <h1 className="font-board text-3xl font-bold uppercase tracking-[0.04em] text-char">
        No such page
      </h1>
      <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-char-dim">
        Nothing is scheduled at this address. If you got here from a QR code,
        scan the one currently on the projector — codes rotate every ten
        seconds and old links stop resolving.
      </p>
      <Button variant="outline" size="lg" className="mt-8" asChild>
        <Link to="/">Back to the board</Link>
      </Button>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  // The projector owns the whole screen; a nav rail on a lecture-hall wall
  // is noise nobody in the room can use.
  const bare = location.pathname === '/projector';

  return (
    <>
      {!bare && <Navbar />}
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route path="/checkin" element={
          <ProtectedRoute allowedRoles={['student']}><CheckIn /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>
        } />

        <Route path="/lecturer" element={
          <ProtectedRoute allowedRoles={['lecturer']}><LecturerDashboard /></ProtectedRoute>
        } />
        <Route path="/projector" element={
          <ProtectedRoute allowedRoles={['lecturer']}><ProjectorView /></ProtectedRoute>
        } />
        <Route path="/geofence" element={
          <ProtectedRoute allowedRoles={['lecturer']}><AdminGeofence /></ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to={user ? home(user.role) : '/login'} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
