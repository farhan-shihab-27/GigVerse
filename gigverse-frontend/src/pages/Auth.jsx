import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Zap, Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle2, AlertCircle, Calendar, IdCard, Building2, GraduationCap, Target, Shield, Star } from 'lucide-react';
import PhoneInputField from '../components/PhoneInputField';
import OtpModal from '../components/OtpModal';
import { authAPI } from '../lib/api';
import uiuCampus from '../assets/uiu-campus.jpg';

const DEPTS = {
  Undergraduate: [
    {id:1,name:'B.Sc. in CSE'},{id:2,name:'B.Sc. in EEE'},{id:3,name:'B.Sc. in CE'},
    {id:4,name:'B.Sc. in Data Science'},{id:5,name:'BBA'},{id:6,name:'BBA in AIS'},
    {id:7,name:'B.Sc. in Economics'},{id:8,name:'BSS in EDS'},{id:9,name:'BSS in MSJ'},
    {id:10,name:'BA in English'},{id:11,name:'B. Pharmacy'},{id:12,name:'B.Sc. in BSBGE'},
  ],
  Graduate: [
    {id:13,name:'M.Sc. in CSE'},{id:14,name:'MBA'},{id:15,name:'Executive MBA'},
    {id:16,name:'Master in IHRM'},{id:17,name:'MS in Economics'},{id:18,name:'Master in Dev. Studies'},
  ],
  Faculty: [
    {id:1,name:'CSE'},{id:2,name:'EEE'},{id:3,name:'Civil Engineering'},
    {id:5,name:'Business Administration'},{id:7,name:'Economics'},{id:10,name:'English'},
    {id:11,name:'Pharmacy'},{id:12,name:'Biotechnology & Genetic Engineering'},
  ],
};
const ROLES = [{id:1,name:'Current Student'},{id:2,name:'Alumni'},{id:3,name:'Faculty'}];

// Feature highlights shown on the left hero panel
// Using Lucide icons instead of emojis for a professional SaaS aesthetic
const FEATURES = [
  { icon: Target,  text: 'Post & discover campus gigs' },
  { icon: Shield,  text: 'Secure escrow payments' },
  { icon: Star,    text: 'Build your PVP reputation' },
];

function Field({ label, icon: Icon, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />}
        {children}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5 italic">{hint}</p>}
    </div>
  );
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  const [login, setLogin] = useState({ email: '', password: '' });
  const [form, setForm] = useState({
    firstName:'', lastName:'', uiuId:'', email:'',
    phone:'', password:'', confirmPw:'',
    roleId:'1', program:'Undergraduate', deptId:'1', dob: null,
  });

  useEffect(() => { setError(''); setSuccess(''); }, [mode]);
  useEffect(() => { if (localStorage.getItem('gv_token')) navigate('/home', {replace:true}); }, [navigate]);

  const setF = (k, v) => setForm(p => ({...p, [k]: v}));
  const isStudent = form.roleId === '1';
  const isAlumni  = form.roleId === '2';
  const isFaculty = form.roleId === '3';
  const pwMatch   = form.password && form.confirmPw && form.password === form.confirmPw;
  const pwNoMatch = form.confirmPw && form.password !== form.confirmPw;

  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    if (!login.email || !login.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res = await authAPI.login({ email: login.email, password: login.password });
      const { token, user } = res.data.data;
      localStorage.setItem('gv_token', token);
      localStorage.setItem('gv_user', JSON.stringify(user));
      setSuccess('Login successful!');
      setTimeout(() => navigate('/home'), 500);
    } catch (err) { setError(err.response?.data?.message || 'Login failed.'); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setError('');
    const { firstName, lastName, uiuId, email, phone, password, confirmPw, roleId, deptId, dob } = form;
    if (!firstName || !lastName || !email || !phone || !password) { setError('Please fill in all required fields.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if ((roleId==='1'||roleId==='3') && !email.toLowerCase().trim().endsWith('.uiu.ac.bd')) {
      setError('Students and Faculty must use an official UIU email (.uiu.ac.bd).'); return;
    }
    if ((roleId==='1'||roleId==='2') && !uiuId) { setError('UIU Student ID is required.'); return; }
    setLoading(true);
    try {
      const payload = {
        name: `${firstName} ${lastName}`.trim(),
        email: email.trim(),
        whatsAppNumber: phone,
        password,
        roleId: Number(roleId),
        deptId: Number(deptId),
        dob: dob ? dob.toISOString().split('T')[0] : undefined,
      };
      if (roleId==='1'||roleId==='2') payload.uiuId = uiuId;
      await authAPI.requestOtp(payload);
      setSuccess('Verification code sent!');
      setTimeout(() => { setSuccess(''); setShowOtp(true); }, 1200);
    } catch (err) { setError(err.response?.data?.message || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (otp) => {
    setOtpError(''); setLoading(true);
    try {
      await authAPI.verifyOtp({ otp, email: form.email.trim() });
      setShowOtp(false);
      setSuccess('Account created! Please log in.');
      setTimeout(() => { setSuccess(''); setMode('login'); }, 1800);
    } catch (err) { setOtpError(err.response?.data?.message || 'Verification failed.'); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    try {
      const { firstName, lastName, email, phone, password, roleId, deptId, dob, uiuId } = form;
      const payload = { name:`${firstName} ${lastName}`.trim(), email:email.trim(), whatsAppNumber:phone, password, roleId:Number(roleId), deptId:Number(deptId), dob: dob ? dob.toISOString().split('T')[0] : undefined };
      if (roleId==='1'||roleId==='2') payload.uiuId = uiuId;
      await authAPI.requestOtp(payload);
    } catch (err) { setOtpError(err.response?.data?.message || 'Resend failed.'); }
  };

  const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); };

  return (
    <div className="flex min-h-screen font-sans">

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col">
        <img src={uiuCampus} alt="UIU Campus" className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-700" />
        <div className="absolute inset-0" style={{background:'linear-gradient(135deg, rgba(10,10,20,0.78) 0%, rgba(30,15,5,0.65) 60%, rgba(242,101,34,0.35) 100%)'}} />
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/30">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">GigVerse</span>
          </div>

          {/* Hero text */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-brand-300 border border-brand-500/30 bg-brand-500/10 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Exclusively for UIU Students
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
                Your Campus.<br/>
                <span className="text-gradient bg-gradient-to-r from-brand-400 to-orange-300 bg-clip-text text-transparent">Your Gig.</span><br/>
                Your Future.
              </h1>
              <p className="text-gray-300 text-base leading-relaxed max-w-sm">
                Connect with fellow UIU students, offer your skills, and earn — all within your university community.
              </p>
            </div>

            {/* Feature badges */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => {
                const FIcon = f.icon;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md border border-white/10" style={{background:'rgba(255,255,255,0.07)'}}>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <FIcon size={15} className="text-brand-300" />
                    </div>
                    <span className="text-sm font-medium text-white/90">{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom credit */}
          <p className="text-xs text-white/30">© 2026 GigVerse · United International University</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 p-6 pb-0">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="text-lg font-extrabold"><span className="text-brand-500">Gig</span>Verse</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md">

            {/* Tab switcher */}
            <div className="flex bg-white rounded-2xl p-1 mb-6 shadow-sm border border-gray-100">
              {['login','signup'].map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${mode===m ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25' : 'text-gray-500 hover:text-gray-700'}`}>
                  {m==='login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Card — premium shadow + glass-adjacent depth */}
            <div className="bg-white rounded-3xl border border-gray-100/80 shadow-2xl shadow-gray-300/40 p-8">

              {/* Alerts */}
              {error && (
                <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-slide-up">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
                </div>
              )}
              {success && (
                <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm animate-slide-up">
                  <CheckCircle2 size={15} className="shrink-0" />{success}
                </div>
              )}

              {/* ── LOGIN ── */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5 animate-slide-up" noValidate>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Welcome back, <span className="text-brand-500">Collaborator!</span></h2>
                    <p className="text-sm text-gray-500 mt-1">Sign in to your GigVerse workspace</p>
                  </div>
                  <Field label="UIU Email" icon={Mail}>
                    <input id="login-email" type="email" placeholder="yourname@bss.uiu.ac.bd"
                      value={login.email} onChange={e=>setLogin(p=>({...p,email:e.target.value}))}
                      className="input-field pl-10" autoComplete="email" required />
                  </Field>
                  <Field label="Password" icon={Lock}>
                    <input id="login-password" type={showPw?'text':'password'} placeholder="Enter your password"
                      value={login.password} onChange={e=>setLogin(p=>({...p,password:e.target.value}))}
                      className="input-field pl-10 pr-10" autoComplete="current-password" required />
                    <button type="button" onClick={()=>setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors">
                      {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </Field>
                  <div className="flex justify-end">
                    <button type="button" className="text-xs text-brand-600 hover:underline font-medium">Forgot Password?</button>
                  </div>
                  <button id="login-submit" type="submit" disabled={loading}
                    className="btn-primary w-full !py-3.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:-translate-y-0">
                    {loading
                      ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in…</span>
                      : <span className="flex items-center gap-2">Log In <ArrowRight size={15}/></span>}
                  </button>
                  <p className="text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <button type="button" onClick={()=>switchMode('signup')} className="text-brand-600 font-semibold hover:underline">Sign Up</button>
                  </p>
                </form>
              )}

              {/* ── SIGNUP ── */}
              {mode === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-4 animate-slide-up" noValidate>
                  <div>
                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 to-orange-500 bg-clip-text text-transparent">Join GigVerse</h2>
                    <p className="text-sm text-slate-500 mt-1">Create your workspace account</p>
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name" icon={User}>
                      <input type="text" placeholder="First" value={form.firstName}
                        onChange={e=>setF('firstName',e.target.value)} className="input-field pl-10" required/>
                    </Field>
                    <Field label="Last Name">
                      <input type="text" placeholder="Last" value={form.lastName}
                        onChange={e=>setF('lastName',e.target.value)} className="input-field" required/>
                    </Field>
                  </div>

                  {/* Role */}
                  <Field label="Role" icon={GraduationCap}>
                    <select value={form.roleId} onChange={e=>{
                      const r=e.target.value;
                      const prog = r==='3' ? 'Faculty' : (form.program==='Faculty' ? 'Undergraduate' : form.program);
                      const dept = DEPTS[prog][0].id.toString();
                      setForm(p=>({...p,roleId:r,program:prog,deptId:dept}));
                    }} className="input-field pl-10">
                      {ROLES.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </Field>

                  {/* Department */}
                  {(isStudent||isAlumni) && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Program" icon={Building2}>
                        <select value={form.program} onChange={e=>{
                          const p=e.target.value;
                          setForm(f=>({...f,program:p,deptId:DEPTS[p][0].id.toString()}));
                        }} className="input-field pl-10">
                          <option value="Undergraduate">Undergraduate</option>
                          <option value="Graduate">Graduate</option>
                        </select>
                      </Field>
                      <Field label="Department">
                        <select value={form.deptId} onChange={e=>setF('deptId',e.target.value)} className="input-field">
                          {DEPTS[form.program].map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </Field>
                    </div>
                  )}
                  {isFaculty && (
                    <Field label="Department" icon={Building2}>
                      <select value={form.deptId} onChange={e=>setF('deptId',e.target.value)} className="input-field pl-10">
                        {DEPTS['Faculty'].map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </Field>
                  )}

                  {/* UIU ID */}
                  {(isStudent||isAlumni) && (
                    <Field label="UIU Student ID" icon={IdCard}>
                      <input type="text" placeholder="e.g. 0112XXXXXXX" value={form.uiuId}
                        onChange={e=>setF('uiuId',e.target.value)} className="input-field pl-10" maxLength={10}/>
                    </Field>
                  )}

                  {/* Email */}
                  <Field
                    label={isFaculty ? 'Official UIU Email' : isStudent ? 'UIU Email' : 'Email'}
                    icon={Mail}
                    hint={(isStudent||isFaculty) ? 'Must end with .uiu.ac.bd' : undefined}
                  >
                    <input type="email"
                      placeholder={isFaculty ? 'yourname@uiu.ac.bd' : isStudent ? 'yourname@bss.uiu.ac.bd' : 'you@example.com'}
                      value={form.email} onChange={e=>setF('email',e.target.value)}
                      className={`input-field pl-10 ${(isStudent||isFaculty) && form.email && !form.email.endsWith('.uiu.ac.bd') ? '!border-red-400 !ring-red-100' : ''}`}
                      required/>
                    {(isStudent||isFaculty) && form.email.endsWith('.uiu.ac.bd') && (
                      <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500"/>
                    )}
                  </Field>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal Number</label>
                    <PhoneInputField value={form.phone} onChange={v=>setF('phone',v||'')} id="signup-phone"/>
                    <p className="text-[10px] text-gray-400 italic">*Must be your active WhatsApp number for seamless client communication</p>
                  </div>

                  {/* DOB */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Date of Birth <span className="text-gray-400 normal-case font-normal">(Optional)</span>
                    </label>
                    <div className="relative gv-datepicker-wrapper">
                      <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"/>
                      <DatePicker
                        selected={form.dob}
                        onChange={d=>setF('dob',d)}
                        dateFormat="MMMM d, yyyy"
                        placeholderText="Select your date of birth"
                        showMonthDropdown showYearDropdown dropdownMode="select"
                        maxDate={new Date()}
                        yearDropdownItemNumber={60}
                        className="input-field pl-10 w-full"
                        wrapperClassName="w-full"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <Field label="Password" icon={Lock}>
                    <input type={showPw?'text':'password'} placeholder="Min. 6 characters"
                      value={form.password} onChange={e=>setF('password',e.target.value)}
                      className="input-field pl-10 pr-10" required/>
                    <button type="button" onClick={()=>setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors">
                      {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </Field>

                  {/* Confirm Password */}
                  <Field label="Confirm Password" icon={Lock}>
                    <input type={showCpw?'text':'password'} placeholder="Re-enter your password"
                      value={form.confirmPw} onChange={e=>setF('confirmPw',e.target.value)}
                      className={`input-field pl-10 pr-10 ${pwNoMatch ? '!border-red-400 !ring-red-100' : ''} ${pwMatch ? '!border-green-400 !ring-green-100' : ''}`}
                      required/>
                    <button type="button" onClick={()=>setShowCpw(!showCpw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors">
                      {showCpw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </Field>
                  {pwNoMatch && <p className="text-[11px] text-red-500 font-medium -mt-2 flex items-center gap-1"><AlertCircle size={11}/>Passwords do not match</p>}
                  {pwMatch  && <p className="text-[11px] text-green-600 font-medium -mt-2 flex items-center gap-1"><CheckCircle2 size={11}/>Passwords match</p>}

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    By signing up, you agree to GigVerse's{' '}
                    <span className="text-brand-600 cursor-pointer hover:underline">Terms of Service</span> and{' '}
                    <span className="text-brand-600 cursor-pointer hover:underline">Privacy Policy</span>.
                  </p>

                  <button type="submit" disabled={loading}
                    className="btn-primary w-full !py-3.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:-translate-y-0">
                    {loading
                      ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Processing…</span>
                      : <span className="flex items-center gap-2">Continue <ArrowRight size={15}/></span>}
                  </button>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <button type="button" onClick={()=>switchMode('login')} className="text-brand-600 font-semibold hover:underline">Log In</button>
                  </p>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-5">
              © 2026 GigVerse · Exclusively for <span className="text-brand-500 font-semibold">UIU</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── OTP MODAL ──────────────────────────────────── */}
      {showOtp && (
        <OtpModal
          email={form.email}
          isLoading={loading}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          onClose={() => setShowOtp(false)}
          serverError={otpError}
        />
      )}
    </div>
  );
}
