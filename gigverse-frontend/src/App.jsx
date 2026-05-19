// src/App.jsx — GigVerse Router Configuration
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import GigDetails from './pages/GigDetails';
import OrderDashboard from './pages/OrderDashboard';
import UserList from './pages/UserList';
import PublicProfile from './pages/PublicProfile';
import MessagesPage from './pages/MessagesPage';
import WalletPage from './pages/WalletPage';

const isAuthenticated = () => Boolean(localStorage.getItem('gv_token'));
function PrivateRoute({ children }) { return isAuthenticated() ? children : <Navigate to="/auth" replace />; }

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: 'gv-toast', duration: 3500 }} />
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/home" element={<><Navbar /><Home /></>} />
        <Route path="/leaderboard" element={<><Navbar /><Leaderboard /></>} />
        <Route path="/search" element={<><Navbar /><UserList /></>} />
        <Route path="/gigs/:id" element={<><Navbar /><GigDetails /></>} />
        <Route path="/profile/:id" element={<><Navbar /><PublicProfile /></>} />
        <Route path="/profile" element={<PrivateRoute><Navbar /><Profile /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Navbar /><OrderDashboard /></PrivateRoute>} />
        {/* Advanced Messaging Hub — receives ?initiate=true from email magic link */}
        <Route path="/dashboard/messages" element={<PrivateRoute><Navbar /><MessagesPage /></PrivateRoute>} />
        <Route path="/wallet"  element={<PrivateRoute><Navbar /><WalletPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
