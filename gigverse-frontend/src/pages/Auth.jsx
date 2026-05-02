// src/pages/Auth.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap, Mail, Lock, Eye, EyeOff,
  User, BookOpen, ArrowRight, CheckCircle2
} from 'lucide-react';

// ── UIU Department list (mirrors Departments table) ─────────
const DEPARTMENTS = [
  { id: 1, name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 2, name: 'Electrical & Electronic Engineering', code: 'EEE' },
  { id: 3, name: 'Business Administration', code: 'BBA' },
  { id: 4, name: 'Economics', code: 'ECO' },
  { id: 5, name: 'Civil Engineering', code: 'CE' },
];

const ROLES = [
  { id: 1, name: 'Student' },
  { id: 2, name: 'Alumni' },
  { id: 3, name: 'Faculty' },
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Toggle: 'login' | 'signup'
  const [mode, setMode] = useState(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Login form state ─────────────────────────────────────
  const [loginForm, setLoginForm] = useState({ uiuEmail: '', password: '' });

  // ── Sign-up form state ───────────────────────────────────
  const [signupForm, setSignupForm] = useState({
    name: '', uiuEmail: '', personalEmail: '',
    password: '', roleId: '1', deptId: '1', dob: '',
  });

  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [mode]);

  // ────────────────────────────────────────────────────────
  //  HANDLER: Login
  //  TODO (Phase 3): POST /api/auth/login → receive JWT token
  //  → store in localStorage/context → redirect to dashboard
  // ────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginForm.uiuEmail || !loginForm.password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    console.log('[Auth] Login payload:', loginForm);
    // ── Phase 3 integration point ──────────────────────────
    // const res = await fetch('/api/auth/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ uiuEmail: loginForm.uiuEmail, password: loginForm.password }),
    // });
    // const data = await res.json();
    // if (!data.success) { setError(data.message); setIsLoading(false); return; }
    // localStorage.setItem('gv_token', data.token);
    // navigate('/dashboard');
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg('✓ Mock login successful! (API not yet connected)');
    }, 1000);
  };

  // ────────────────────────────────────────────────────────
  //  HANDLER: Sign Up
  //  TODO (Phase 3): POST /api/auth/register → auto-login
  // ────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    const { name, uiuEmail, personalEmail, password, roleId, deptId } = signupForm;
    if (!name || !uiuEmail || !personalEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!uiuEmail.endsWith('uiu.ac.bd')) {
      setError('Please use your official UIU email address (e.g., @bss.uiu.ac.bd).');
      return;
    }
    setIsLoading(true);
    console.log('[Auth] Sign-up payload:', signupForm);
    // ── Phase 3 integration point ──────────────────────────
    // const res = await fetch('/api/auth/register', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name, uiuEmail, personalEmail, password, roleId: +roleId, deptId: +deptId }),
    // });
    // const data = await res.json();
    // if (!data.success) { setError(data.message); setIsLoading(false); return; }
    // localStorage.setItem('gv_token', data.token);
    // navigate('/dashboard');
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg('✓ Mock sign-up successful! (API not yet connected)');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-orange-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">

        {/* ── Brand Header ─────────────────────────────────── */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-shadow">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <span className="text-2xl font-extrabold">
              <span className="text-gradient">Gig</span>
              <span className="text-gray-900">Verse</span>
            </span>
          </Link>
          <p className="text-gray-500 text-sm">UIU Campus Freelance Platform</p>
        </div>

        {/* ── Card ─────────────────────────────────────────── */}
        <div className="card p-8 shadow-brand">

          {/* ── Mode Toggle ───────────────────────────────── */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-7">
            <button
              id="auth-tab-login"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'login'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Log In
            </button>
            <button
              id="auth-tab-signup"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'signup'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Sign Up
            </button>
          </div>

          {/* ── Error / Success banner ─────────────────────── */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-slide-up">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2 animate-slide-up">
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/*  LOGIN FORM                                       */}
          {/* ════════════════════════════════════════════════ */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-slide-up" noValidate>
              <h2 className="text-xl font-bold text-gray-900">Welcome back 👋</h2>

              <div className="space-y-1">
                <label htmlFor="login-email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  UIU Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="yourname@bss.uiu.ac.bd"
                    value={loginForm.uiuEmail}
                    onChange={(e) => setLoginForm({ ...loginForm, uiuEmail: e.target.value })}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="login-password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="input-field pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-xs text-brand-600 hover:underline font-medium">
                  Forgot password?
                </button>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full !py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Log In <ArrowRight size={15} />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/*  SIGN-UP FORM                                     */}
          {/* ════════════════════════════════════════════════ */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4 animate-slide-up" noValidate>
              <h2 className="text-xl font-bold text-gray-900">Join GigVerse 🚀</h2>

              {/* Full Name */}
              <div className="space-y-1">
                <label htmlFor="signup-name" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Your full name"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              {/* UIU Email */}
              <div className="space-y-1">
                <label htmlFor="signup-uiu-email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  UIU Email <span className="text-brand-500 normal-case font-normal">(official)</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="signup-uiu-email"
                    type="email"
                    placeholder="yourname@bss.uiu.ac.bd"
                    value={signupForm.uiuEmail}
                    onChange={(e) => setSignupForm({ ...signupForm, uiuEmail: e.target.value })}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              {/* Personal Email */}
              <div className="space-y-1">
                <label htmlFor="signup-personal-email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Personal Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="signup-personal-email"
                    type="email"
                    placeholder="you@gmail.com"
                    value={signupForm.personalEmail}
                    onChange={(e) => setSignupForm({ ...signupForm, personalEmail: e.target.value })}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="signup-role" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Role
                  </label>
                  <select
                    id="signup-role"
                    value={signupForm.roleId}
                    onChange={(e) => setSignupForm({ ...signupForm, roleId: e.target.value })}
                    className="input-field"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="signup-dept" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Department
                  </label>
                  <select
                    id="signup-dept"
                    value={signupForm.deptId}
                    onChange={(e) => setSignupForm({ ...signupForm, deptId: e.target.value })}
                    className="input-field"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>{d.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label htmlFor="signup-password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="input-field pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                By signing up you agree to the GigVerse{' '}
                <span className="text-brand-600 cursor-pointer hover:underline">Terms of Service</span>
                {' '}and{' '}
                <span className="text-brand-600 cursor-pointer hover:underline">Privacy Policy</span>.
              </p>

              <button
                id="signup-submit"
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full !py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account <ArrowRight size={15} />
                  </span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* ── Footer note ──────────────────────────────────── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Made with ❤️ for{' '}
          <span className="text-brand-500 font-semibold">United International University</span>
        </p>
      </div>
    </div>
  );
}
