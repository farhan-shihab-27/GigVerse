// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';

// ── Route guard placeholder ──────────────────────────────────
// TODO (Phase 3): Replace with real auth check (JWT in localStorage / AuthContext)
const isAuthenticated = () => {
  return Boolean(localStorage.getItem('gv_token'));
};

// ── Protected Route wrapper (ready for Phase 3) ─────────────
function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      {/*
        Layout: Navbar is visible on all pages EXCEPT the Auth page.
        The Auth page uses its own full-screen centered layout.
      */}
      <Routes>
        {/* ── Public routes with Navbar ───────────────────── */}
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <Home />
            </>
          }
        />

        {/* ── Auth page (no Navbar — full-screen layout) ──── */}
        <Route path="/auth" element={<Auth />} />

        {/* ── Future protected routes (Phase 3) ──────────── */}
        {/*
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Navbar />
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/gigs/:id" element={<><Navbar /><GigDetail /></>} />
        <Route path="/orders"   element={<PrivateRoute><Navbar /><Orders /></PrivateRoute>} />
        */}

        {/* ── 404 fallback ────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
