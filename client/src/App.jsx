import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProfessorDashboard from './pages/ProfessorDashboard';
import QuizGenerator from './pages/QuizGenerator';
import QuizEdit from './pages/QuizEdit';
import StudentSession from './pages/StudentSession';
import StudentDashboard from './pages/StudentDashboard';
import StudentReview from './pages/StudentReview';
import HostSession from './pages/HostSession';
import TakeQuiz from './pages/TakeQuiz';
import StudentQuizBrowser from './pages/StudentQuizBrowser';
import QuizAnalytics from './pages/QuizAnalytics';

import './App.css';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'professor' ? '/dashboard' : '/student/dashboard'} replace />;
  }

  return children;
};

/**
 * Guard for /session route.
 * Allows access if the user is authenticated OR has a valid room code
 * in React Router location state (guest quick-join from Home page).
 * Otherwise redirects to the landing page.
 */
const SessionGuard = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const hasRoomCode = Boolean(location.state?.roomCode);

  if (!user && !hasRoomCode) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * Layout wrapper that conditionally renders Navbar.
 * The Home page has its own integrated nav, so we skip the global Navbar on '/'.
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
            <Navbar />
            <Login />
          </div>
        }
      />
      <Route
        path="/signup"
        element={
          <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
            <Navbar />
            <Signup />
          </div>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="professor">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <ProfessorDashboard />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/generator"
        element={
          <ProtectedRoute allowedRole="professor">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <QuizGenerator />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/edit/:id"
        element={
          <ProtectedRoute allowedRole="professor">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <QuizEdit />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/analytics/:id"
        element={
          <ProtectedRoute allowedRole="professor">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <QuizAnalytics />
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/host-session"
        element={
          <ProtectedRoute allowedRole="professor">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <HostSession />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Student Quiz Browser */}
      <Route
        path="/quizzes"
        element={
          <ProtectedRoute allowedRole="student">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <StudentQuizBrowser />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Self-assessment Quiz Player */}
      <Route
        path="/quiz/:id/take"
        element={
          <ProtectedRoute allowedRole="student">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <TakeQuiz />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Student Dashboard */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRole="student">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <StudentDashboard />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Student Performance Review */}
      <Route
        path="/student/review/:attemptId"
        element={
          <ProtectedRoute allowedRole="student">
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <StudentReview />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Session – requires either auth OR a room code from the Home page */}
      <Route
        path="/session"
        element={
          <SessionGuard>
            <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
              <Navbar />
              <StudentSession />
            </div>
          </SessionGuard>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
