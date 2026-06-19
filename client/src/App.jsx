import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import ProjectorView from './pages/ProjectorView';
import CheckIn from './pages/CheckIn';
import AdminGeofence from './pages/AdminGeofence';
import { Toaster } from "@/components/ui/sonner"

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="animate-pulse" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'student' ? '/dashboard' : '/lecturer'} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to={user.role === 'student' ? '/dashboard' : '/lecturer'} replace />;
  }

  return children;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Check-in (needs auth but accessible to students) */}
        <Route path="/checkin" element={
          <ProtectedRoute allowedRoles={['student']}>
            <CheckIn />
          </ProtectedRoute>
        } />

        {/* Student routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />

        {/* Lecturer routes */}
        <Route path="/lecturer" element={
          <ProtectedRoute allowedRoles={['lecturer']}>
            <LecturerDashboard />
          </ProtectedRoute>
        } />

        <Route path="/projector" element={
          <ProtectedRoute allowedRoles={['lecturer']}>
            <ProjectorView />
          </ProtectedRoute>
        } />

        <Route path="/geofence" element={
          <ProtectedRoute allowedRoles={['lecturer']}>
            <AdminGeofence />
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path="/" element={
          user
            ? <Navigate to={user.role === 'student' ? '/dashboard' : '/lecturer'} replace />
            : <Navigate to="/login" replace />
        } />

        {/* 404 */}
        <Route path="*" element={
          <div className="container mx-auto py-32 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold">Page Not Found</h1>
            <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist.</p>
          </div>
        } />
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
