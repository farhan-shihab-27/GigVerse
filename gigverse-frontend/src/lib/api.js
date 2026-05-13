// src/lib/api.js — Centralized Axios instance for GigVerse API
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── JWT interceptor: attach token to every request ────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gv_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Response interceptor: ONLY redirect on genuine 401 (invalid/expired token)
// Do NOT wipe the session on network errors or other server errors.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only auto-logout when server explicitly rejects the token (401)
    // AND the error comes with a response (not a network timeout/offline error)
    if (err.response?.status === 401) {
      const pathname = window.location.pathname;
      // Don't redirect if already on the auth page to avoid loops
      if (pathname !== '/auth') {
        localStorage.removeItem('gv_token');
        localStorage.removeItem('gv_user');
        window.location.href = '/auth';
      }
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
  getMyProfile:     ()     => api.get('/users/profile'),
  updateMyProfile:  (data) => api.put('/users/profile', data),
  getLeaderboard:   (limit = 100) => api.get(`/users/leaderboard?limit=${limit}`),
  getProfileStatus: ()     => api.get('/users/profile/status'),
  completeProfile:  (data) => api.post('/users/profile/complete', data),
  // Axios DELETE with a JSON body requires { data: payload } in the config object
  deleteAccount:    (payload) => api.delete('/users/account', { data: payload }),
};

// ── Gigs ──────────────────────────────────────────────────────────────────────
export const gigAPI = {
  getAll:  (limit = 20, offset = 0) => api.get(`/gigs?limit=${limit}&offset=${offset}`),
  getById: (id)                      => api.get(`/gigs/${id}`),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderAPI = {
  create:               (data)   => api.post('/orders', data),
  getMyOrders:          ()       => api.get('/orders/my'),
  getById:              (id)     => api.get(`/orders/${id}`),
  getContributorContact:(userId) => api.get(`/orders/contact/${userId}`),
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchAPI = {
  autocomplete: (q)     => api.get(`/search/autocomplete?q=${encodeURIComponent(q)}`),
  contributors: (skill) => api.get(`/search/contributors?skill=${encodeURIComponent(skill)}`),
  skills:       ()      => api.get('/search/skills'),
};

export default api;
