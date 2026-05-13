// src/lib/api.js — Centralized Axios instance for GigVerse API
// Dynamically switches between localhost (dev proxy) and production URL (Vercel).
import axios from 'axios';

// In development, Vite proxies /api → http://localhost:5000 (see vite.config.js).
// In production (Vercel), set VITE_API_BASE_URL to the full backend URL, e.g.
// https://gigverse-api.vercel.app/api
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||   // production — full URL
  import.meta.env.VITE_API_URL      ||   // legacy env var compat
  '/api';                                  // dev — uses Vite proxy

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

// ── Gigs ──────────────────────────────────────────────────────────────────────
export const gigAPI = {
  getAll:  (limit=20, offset=0) => api.get(`/gigs?limit=${limit}&offset=${offset}`),
  getById: (id)                  => api.get(`/gigs/${id}`),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderAPI = {
  create:                (data)   => api.post('/orders', data),
  getMyOrders:           ()       => api.get('/orders/my'),
  getById:               (id)     => api.get(`/orders/${id}`),
  getContributorContact: (userId) => api.get(`/orders/contact/${userId}`),
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchAPI = {
  autocomplete: (q)     => api.get(`/search/autocomplete?q=${encodeURIComponent(q)}`),
  contributors: (skill) => api.get(`/search/contributors?skill=${encodeURIComponent(skill)}`),
  skills:       ()      => api.get('/search/skills'),
};

export default api;
