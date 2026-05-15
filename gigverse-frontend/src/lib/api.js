// src/lib/api.js — Centralized Axios instance for GigVerse API
// In development: Vite proxies /api → http://localhost:5000/api (see vite.config.js)
// In production:  Vercel routes  /api/* → server.js serverless function
// Result: baseURL is ALWAYS '/api' unless explicitly overridden.
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';


const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT to every request ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gv_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Response interceptor: only 401 from server = expired/invalid token ────────
// Network errors, CORS failures, and timeouts must NOT wipe the session.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response &&                         // server actually responded
      err.response.status === 401 &&          // token rejected
      window.location.pathname !== '/auth'    // avoid redirect loops
    ) {
      localStorage.removeItem('gv_token');
      localStorage.removeItem('gv_user');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:   (data) => api.post('/auth/register', data),
  login:      (data) => api.post('/auth/login', data),
  requestOtp: (data) => api.post('/auth/request-otp', data),
  verifyOtp:  (data) => api.post('/auth/verify-otp', data),
};

// ── User / Profile ────────────────────────────────────────────────────────────
export const userAPI = {
  getMyProfile:     ()        => api.get('/users/profile'),
  updateMyProfile:  (data)    => api.put('/users/profile', data),
  getLeaderboard:   (limit=100)=> api.get(`/users/leaderboard?limit=${limit}`),
  getProfileStatus: ()        => api.get('/users/profile/status'),
  completeProfile:  (data)    => api.post('/users/profile/complete', data),
  deleteAccount:    (payload) => api.delete('/users/account', { data: payload }),
};

// ── Gigs (Full CRUD) ─────────────────────────────────────────────────────────
export const gigAPI = {
  getAll:      (limit=20, offset=0) => api.get(`/gigs?limit=${limit}&offset=${offset}`),
  getById:     (id)                  => api.get(`/gigs/${id}`),
  getMyGigs:   ()                    => api.get('/gigs/my'),
  create:      (data)                => api.post('/gigs', data),
  update:      (id, data)            => api.put(`/gigs/${id}`, data),
  remove:      (id)                  => api.delete(`/gigs/${id}`),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderAPI = {
  create:              (data)       => api.post('/orders', data),
  getMyOrders:         ()           => api.get('/orders/my'),
  getById:             (id)         => api.get(`/orders/${id}`),
  getContributorContact: (userId)   => api.get(`/orders/contact/${userId}`),
  acceptOrder:         (id)         => api.patch(`/orders/${id}/accept`),
  deliverOrder:        (id)         => api.patch(`/orders/${id}/deliver`),
  requestRevision:     (id, data)   => api.patch(`/orders/${id}/revision`, data),
  updateMilestone:     (id, data)   => api.patch(`/orders/${id}/milestone`, data),
  createCustomOffer:   (data)       => api.post('/orders/custom-offer', data),
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchAPI = {
  autocomplete: (q)     => api.get(`/search/autocomplete?q=${encodeURIComponent(q)}`),
  contributors: (skill) => api.get(`/search/contributors?skill=${encodeURIComponent(skill)}`),
  skills:       ()      => api.get('/search/skills'),
};

// ── AI Smart Pricing ──────────────────────────────────────────────────────────
export const aiAPI = {
  estimateGig: (prompt) => api.post('/ai/estimate', { prompt }),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentAPI = {
  processEscrow:          (data) => api.post('/payments/escrow', data),
  releaseEscrow:          (data) => api.post('/payments/escrow/release', data),
  cancelWithCompensation: (data) => api.post('/payments/escrow/cancel', data),
  disputeOrder:           (data) => api.post('/payments/escrow/dispute', data),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:         (limit = 20) => api.get(`/notifications?limit=${limit}`),
  getUnreadCount: ()           => api.get('/notifications/unread-count'),
  markRead:       (id)         => api.patch(`/notifications/${id}/read`),
  markAllRead:    ()           => api.patch('/notifications/read-all'),
};

// ── Messages / Chat ──────────────────────────────────────────────────────────
export const messageAPI = {
  send:             (data)      => api.post('/messages', data),
  getConversations: ()          => api.get('/messages/conversations'),
  getConversation:  (userId)    => api.get(`/messages/conversation/${userId}`),
  getUnreadCount:   ()          => api.get('/messages/unread-count'),
  sendProposal:     (data)      => api.post('/messages/proposal', data),
  acceptProposal:   (messageId) => api.post(`/messages/proposal/${messageId}/accept`),
  declineProposal:  (messageId) => api.post(`/messages/proposal/${messageId}/decline`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats:   ()  => api.get('/dashboard/stats'),
  getMyStats: ()  => api.get('/dashboard/my-stats'),
};

export default api;
