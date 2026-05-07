// src/pages/Auth.jsx — Login & Sign Up (English UI, API-Wired)
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import { authAPI } from '../lib/api';

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
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', uiuEmail: '', personalEmail: '', password: '', roleId: '1', deptId: '1', dob: '' });

  useEffect(() => { setError(''); setSuccessMsg(''); }, [mode]);
  useEffect(() => { if (localStorage.getItem('gv_token')) navigate('/home', { replace: true }); }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setSuccessMsg('');
    if (!loginForm.email || !loginForm.password) { setError('Please fill in all fields.'); return; }
    setIsLoading(true);
    try {
      const res = await authAPI.login({ email: loginForm.email, password: loginForm.password });
      const { token, user } = res.data.data;
      localStorage.setItem('gv_token', token); localStorage.setItem('gv_user', JSON.stringify(user));
      setSuccessMsg('Login successful!'); setTimeout(() => navigate('/home'), 500);
    } catch (err) { setError(err.response?.data?.message || 'Login failed. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault(); setError(''); setSuccessMsg('');
    const { name, uiuEmail, personalEmail, password, roleId, deptId, dob } = signupForm;
    if (!name || !uiuEmail || !personalEmail || !password) { setError('Please fill in all required fields.'); return; }
    if (!uiuEmail.endsWith('uiu.ac.bd')) { setError('Please use your UIU email (e.g., @bss.uiu.ac.bd).'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsLoading(true);
    try {
      await authAPI.register({ name, uiuEmail, personalEmail, password, roleId: Number(roleId), deptId: Number(deptId), dob: dob || undefined });
      setSuccessMsg('Account created successfully! Please log in.'); setTimeout(() => setMode('login'), 1500);
    } catch (err) { setError(err.response?.data?.message || 'Registration failed. Please try again.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-orange-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-shadow"><Zap size={20} className="text-white fill-white" /></div>
            <span className="text-2xl font-extrabold"><span className="text-gradient">Gig</span><span className="text-gray-900">Verse</span></span>
          </Link>
          <p className="text-gray-500 text-sm">UIU's Campus Freelance Platform</p>
        </div>
        <div className="card p-8 shadow-brand">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-7">
            <button id="auth-tab-login" onClick={() => setMode('login')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'login' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Log In</button>
            <button id="auth-tab-signup" onClick={() => setMode('signup')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'signup' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Sign Up</button>
          </div>
          {error && (<div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-slide-up"><AlertCircle size={16} className="shrink-0" /> {error}</div>)}
          {successMsg && (<div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2 animate-slide-up"><CheckCircle2 size={16} className="shrink-0" /> {successMsg}</div>)}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-slide-up" noValidate>
              <h2 className="text-xl font-bold text-gray-900">Welcome Back! 👋</h2>
              <div className="space-y-1">
                <label htmlFor="login-email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                <div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="login-email" type="email" autoComplete="email" placeholder="Enter your email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="input-field pl-10" required />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="login-password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label>
                <div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="input-field pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <div className="flex justify-end"><button type="button" className="text-xs text-brand-600 hover:underline font-medium">Forgot Password?</button></div>
              <button id="login-submit" type="submit" disabled={isLoading} className="btn-primary w-full !py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span> : <span className="flex items-center gap-2">Log In <ArrowRight size={15} /></span>}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4 animate-slide-up" noValidate>
              <h2 className="text-xl font-bold text-gray-900">Join GigVerse 🚀</h2>
              <div className="space-y-1"><label htmlFor="signup-name" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name</label><div className="relative"><User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input id="signup-name" type="text" placeholder="Your full name" value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} className="input-field pl-10" required /></div></div>
              <div className="space-y-1"><label htmlFor="signup-uiu-email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">UIU Email <span className="text-brand-500 normal-case font-normal">(Official)</span></label><div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input id="signup-uiu-email" type="email" placeholder="yourname@bss.uiu.ac.bd" value={signupForm.uiuEmail} onChange={(e) => setSignupForm({ ...signupForm, uiuEmail: e.target.value })} className="input-field pl-10" required /></div></div>
              <div className="space-y-1"><label htmlFor="signup-personal-email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Personal Email</label><div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input id="signup-personal-email" type="email" placeholder="you@gmail.com" value={signupForm.personalEmail} onChange={(e) => setSignupForm({ ...signupForm, personalEmail: e.target.value })} className="input-field pl-10" required /></div></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label htmlFor="signup-role" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</label><select id="signup-role" value={signupForm.roleId} onChange={(e) => setSignupForm({ ...signupForm, roleId: e.target.value })} className="input-field">{ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div className="space-y-1"><label htmlFor="signup-dept" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</label><select id="signup-dept" value={signupForm.deptId} onChange={(e) => setSignupForm({ ...signupForm, deptId: e.target.value })} className="input-field">{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}</select></div>
              </div>
              <div className="space-y-1"><label htmlFor="signup-dob" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Birth <span className="text-gray-400 normal-case font-normal">(Optional)</span></label><div className="relative"><Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input id="signup-dob" type="date" value={signupForm.dob} onChange={(e) => setSignupForm({ ...signupForm, dob: e.target.value })} className="input-field pl-10" /></div></div>
              <div className="space-y-1"><label htmlFor="signup-password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label><div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} className="input-field pl-10 pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
              <p className="text-[11px] text-gray-400 leading-relaxed">By signing up, you agree to GigVerse&apos;s <span className="text-brand-600 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-brand-600 cursor-pointer hover:underline">Privacy Policy</span>.</p>
              <button id="signup-submit" type="submit" disabled={isLoading} className="btn-primary w-full !py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Account…</span> : <span className="flex items-center gap-2">Create Account <ArrowRight size={15} /></span>}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">© 2026 GigVerse. Exclusively for <span className='text-[#f26522] font-semibold'>United International University</span>.</p>
      </div>
    </div>
  );
}
