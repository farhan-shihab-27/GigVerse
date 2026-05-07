// src/lib/api.js — Centralized Axios instance for GigVerse API
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── JWT interceptor: attach token to every request ──────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-logout on 401 ────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gv_token');
      localStorage.removeItem('gv_user');
      if (window.location.pathname !== '/auth') window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
};

// ── User / Profile ──────────────────────────────────────────
export const userAPI = {
  getMyProfile:     ()     => api.get('/users/profile'),
  updateMyProfile:  (data) => api.put('/users/profile', data),
  getLeaderboard:   (limit = 100) => api.get(`/users/leaderboard?limit=${limit}`),
};

// ── Gigs ────────────────────────────────────────────────────
export const gigAPI = {
  getAll:  (limit = 20, offset = 0) => api.get(`/gigs?limit=${limit}&offset=${offset}`),
  getById: (id) => api.get(`/gigs/${id}`),
};

// ── Orders ──────────────────────────────────────────────────
export const orderAPI = {
  create:       (data)   => api.post('/orders', data),
  getMyOrders:  ()       => api.get('/orders/my'),
  getById:      (id)     => api.get(`/orders/${id}`),
  getContributorContact: (userId) => api.get(`/orders/contact/${userId}`),
};

export default api;
