// src/pages/Auth.jsx — Login & Sign Up (English UI, API-Wired)
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle2, Calendar, AlertCircle, Phone, Key, Globe } from 'lucide-react';
import { authAPI } from '../lib/api';

const DEPARTMENTS = {
  Undergraduate: [
    { id: 1, name: 'B.Sc. in CSE' },
    { id: 2, name: 'B.Sc. in EEE' },
    { id: 3, name: 'B.Sc. in CE' },
    { id: 4, name: 'B.Sc. in Data Science' },
    { id: 5, name: 'BBA' },
    { id: 6, name: 'BBA in AIS' },
    { id: 7, name: 'B.Sc. in Economics' },
    { id: 8, name: 'BSS in EDS' },
    { id: 9, name: 'BSS in MSJ' },
    { id: 10, name: 'BA in English' },
    { id: 11, name: 'B. Pharmacy' },
    { id: 12, name: 'B.Sc. in BSBGE' }
  ],
  Graduate: [
    { id: 13, name: 'M.Sc. in CSE' },
    { id: 14, name: 'MBA' },
    { id: 15, name: 'Executive MBA' },
    { id: 16, name: 'Master in IHRM' },
    { id: 17, name: 'MS in Economics' },
    { id: 18, name: 'Master in Dev. Studies' }
  ],
  Faculty: [
    { id: 19, name: 'Department of CSE' },
    { id: 20, name: 'Department of EEE' },
    { id: 21, name: 'Department of Civil Engineering' },
    { id: 22, name: 'Business Administration' },
    { id: 23, name: 'Department of Economics' },
    { id: 24, name: 'Institute of Natural Sciences' },
    { id: 25, name: 'Department of English' },
    { id: 26, name: 'Department of Environment & Development Studies' },
    { id: 27, name: 'Department of Media Studies & Journalism' },
    { id: 28, name: 'Department of Pharmacy' },
    { id: 29, name: 'Department of Biotechnology and Genetic Engineering' }
  ]
};

const ROLES = [
  { id: 1, name: 'Current Student' },
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
  
  const [signupForm, setSignupForm] = useState({ 
    firstName: '', lastName: '', uiuId: '', email: '', whatsAppNumber: '', countryCode: '+880',
    password: '', roleId: '1', program: 'Undergraduate', deptId: '1', dob: '' 
  });
  
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => { setError(''); setSuccessMsg(''); }, [mode, otpStep]);
  useEffect(() => { if (localStorage.getItem('gv_token')) navigate('/home', { replace: true }); }, [navigate]);

  const isStudent = signupForm.roleId === '1';
  const isAlumni = signupForm.roleId === '2';
  const isFaculty = signupForm.roleId === '3';

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
    const { firstName, lastName, uiuId, email, whatsAppNumber, password, roleId, deptId, dob } = signupForm;
    
    // Validation
    if (!firstName || !lastName || !email || !whatsAppNumber || !password) {
      setError('Please fill in all required fields.'); return;
    }

    // Student & Faculty: must be .uiu.ac.bd
    if ((roleId === '1' || roleId === '3') && !email.toLowerCase().trim().endsWith('.uiu.ac.bd')) {
      setError('Students and Faculty must use an official UIU email (.uiu.ac.bd).'); return;
    }

    // Student & Alumni: must have Student ID
    if ((roleId === '1' || roleId === '2') && !uiuId) {
      setError('UIU Student ID is required.'); return;
    }

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    
    setIsLoading(true);
    try {
      const payload = {
        name: `${firstName} ${lastName}`,
        email: email.trim(),
        whatsAppNumber: `${signupForm.countryCode}${whatsAppNumber}`, 
        password, 
        roleId: Number(roleId), 
        deptId: Number(deptId), 
        dob: dob || undefined
      };

      // Attach UIU ID for Students & Alumni
      if (roleId === '1' || roleId === '2') {
        payload.uiuId = uiuId;
      }

      await authAPI.requestOtp(payload);
      setSuccessMsg('Verification code sent to your email!');
      setTimeout(() => {
        setSuccessMsg('');
        setOtpStep(true);
      }, 1500);
    } catch (err) { setError(err.response?.data?.message || 'Registration failed. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError(''); setSuccessMsg('');
    if (!otpCode) { setError('Please enter the OTP.'); return; }
    
    setIsLoading(true);
    try {
      const { firstName, lastName, uiuId, email, whatsAppNumber, password, roleId, deptId, dob } = signupForm;
      const payload = { 
        otp: otpCode,
        name: `${firstName} ${lastName}`, 
        email: email.trim(),
        whatsAppNumber, 
        password, 
        roleId: Number(roleId), 
        deptId: Number(deptId), 
        dob: dob || undefined 
      };
      if (roleId === '1' || roleId === '2') {
        payload.uiuId = uiuId;
      }

      await authAPI.verifyOtp(payload);
      setSuccessMsg('Account verified and created successfully! Please log in.');
      setTimeout(() => {
        setOtpStep(false);
        setMode('login');
      }, 1500);
    } catch (err) { setError(err.response?.data?.message || 'Verification failed. Please try again.'); }
    finally { setIsLoading(false); }
  };

  // Get the email label & placeholder based on role
  const getEmailLabel = () => {
    if (isFaculty) return 'Official UIU Email';
    if (isStudent) return 'Official UIU Email';
    return 'Email';
  };
  const getEmailPlaceholder = () => {
    if (isFaculty) return 'yourname@uiu.ac.bd';
    if (isStudent) return 'yourname@bss.uiu.ac.bd';
    return 'you@example.com';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-orange-50 bg-dora-kata flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-shadow"><Zap size={20} className="text-white fill-white" /></div>
            <span className="text-2xl font-extrabold"><span className="text-gradient">Gig</span><span className="text-gray-900">Verse</span></span>
          </Link>
          <p className="text-gray-500 text-sm">UIU's Campus Freelance Platform</p>
        </div>
        <div className="card p-8 shadow-brand bg-white/95 backdrop-blur-md">
          {!otpStep && (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-7">
              <button id="auth-tab-login" onClick={() => setMode('login')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'login' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Log In</button>
              <button id="auth-tab-signup" onClick={() => setMode('signup')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${mode === 'signup' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Sign Up</button>
            </div>
          )}

          {error && (<div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-slide-up"><AlertCircle size={16} className="shrink-0" /> {error}</div>)}
          {successMsg && (<div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2 animate-slide-up"><CheckCircle2 size={16} className="shrink-0" /> {successMsg}</div>)}

          {mode === 'login' && !otpStep && (
            <form onSubmit={handleLogin} className="space-y-5 animate-slide-up" noValidate>
              <h2 className="text-xl font-bold text-gray-900">Welcome Back!</h2>
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
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span> : <span className="flex items-center gap-2">Log In <ArrowRight size={15} /></span>}
              </button>
            </form>
          )}

          {mode === 'signup' && !otpStep && (
            <form onSubmit={handleSignUp} className="space-y-4 animate-slide-up" noValidate>
              <h2 className="text-xl font-bold text-gray-900">Join GigVerse</h2>
              
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">First Name</label><div className="relative"><User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="First" value={signupForm.firstName} onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })} className="input-field pl-10" required /></div></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Name</label><div className="relative"><input type="text" placeholder="Last" value={signupForm.lastName} onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })} className="input-field" required /></div></div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</label>
                <select value={signupForm.roleId} onChange={(e) => {
                  const newRole = e.target.value;
                  let newProgram = signupForm.program;
                  let newDeptId = signupForm.deptId;
                  if (newRole === '3') {
                    newProgram = 'Faculty';
                    newDeptId = DEPARTMENTS['Faculty'][0].id.toString();
                  } else if (signupForm.program === 'Faculty') {
                    newProgram = 'Undergraduate';
                    newDeptId = DEPARTMENTS['Undergraduate'][0].id.toString();
                  }
                  setSignupForm({ ...signupForm, roleId: newRole, program: newProgram, deptId: newDeptId });
                }} className="input-field">
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              {/* Department Selection: Student/Alumni get Program + Department */}
              {(isStudent || isAlumni) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Program</label>
                    <select value={signupForm.program} onChange={(e) => {
                      const newProg = e.target.value;
                      setSignupForm({ ...signupForm, program: newProg, deptId: DEPARTMENTS[newProg][0].id.toString() })
                    }} className="input-field">
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Graduate">Graduate</option>
                    </select>
                  </div>
                  <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</label>
                    <select value={signupForm.deptId} onChange={(e) => setSignupForm({ ...signupForm, deptId: e.target.value })} className="input-field">
                      {DEPARTMENTS[signupForm.program].map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Faculty Department (standalone) */}
              {isFaculty && (
                <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</label>
                  <select value={signupForm.deptId} onChange={(e) => setSignupForm({ ...signupForm, deptId: e.target.value })} className="input-field">
                    {DEPARTMENTS['Faculty'].map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {/* UIU Student ID — visible for Student & Alumni, hidden for Faculty */}
              {(isStudent || isAlumni) && (
                <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">UIU Student ID</label><div className="relative"><input type="text" placeholder="xxxxxxxxxx" value={signupForm.uiuId} onChange={(e) => setSignupForm({ ...signupForm, uiuId: e.target.value })} className="input-field" required /></div></div>
              )}
              
              {/* Single Unified Email Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{getEmailLabel()}</label>
                <div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" placeholder={getEmailPlaceholder()} value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} className="input-field pl-10" required /></div>
                {(isStudent || isFaculty) && <p className="text-[10px] text-gray-400 mt-0.5">Must end with .uiu.ac.bd</p>}
              </div>
              
              {/* WhatsApp Number — Global Country Code Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">WhatsApp Number</label>
                <div className="flex">
                  <select 
                    value={signupForm.countryCode || '+880'} 
                    onChange={(e) => setSignupForm({ ...signupForm, countryCode: e.target.value })} 
                    className="input-field !w-[110px] !rounded-r-none !border-r-0 focus:!ring-0 bg-gray-50 text-sm"
                  >
                    <option value="+880">BD +880</option>
                    <option value="+1">US +1</option>
                    <option value="+44">UK +44</option>
                    <option value="+91">IN +91</option>
                    <option value="+61">AU +61</option>
                    <option value="+971">AE +971</option>
                    <option value="+966">SA +966</option>
                    <option value="+65">SG +65</option>
                    <option value="+60">MY +60</option>
                    <option value="+81">JP +81</option>
                    <option value="+82">KR +82</option>
                    <option value="+49">DE +49</option>
                    <option value="+33">FR +33</option>
                    <option value="+39">IT +39</option>
                    <option value="+86">CN +86</option>
                    <option value="+55">BR +55</option>
                    <option value="+7">RU +7</option>
                    <option value="+234">NG +234</option>
                    <option value="+92">PK +92</option>
                    <option value="+62">ID +62</option>
                    <option value="+90">TR +90</option>
                    <option value="+20">EG +20</option>
                    <option value="+27">ZA +27</option>
                    <option value="+977">NP +977</option>
                    <option value="+94">LK +94</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" placeholder="1XXXXXXXXX" value={signupForm.whatsAppNumber} onChange={(e) => setSignupForm({ ...signupForm, whatsAppNumber: e.target.value })} className="input-field !rounded-l-none pl-10" required />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 italic">*Must be your active WhatsApp number for seamless client communication.</p>
              </div>

              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Birth <span className="text-gray-400 normal-case font-normal">(Optional)</span></label><div className="relative"><Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="date" value={signupForm.dob} onChange={(e) => setSignupForm({ ...signupForm, dob: e.target.value })} className="input-field pl-10" /></div></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label><div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} className="input-field pl-10 pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
              
              <p className="text-[11px] text-gray-400 leading-relaxed">By signing up, you agree to GigVerse&apos;s <span className="text-brand-600 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-brand-600 cursor-pointer hover:underline">Privacy Policy</span>.</p>
              <button type="submit" disabled={isLoading} className="btn-primary w-full !py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</span> : <span className="flex items-center gap-2">Continue <ArrowRight size={15} /></span>}
              </button>
            </form>
          )}

          {otpStep && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-slide-up" noValidate>
              <div className="text-center">
                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key size={24} className="text-brand-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Enter Verification Code</h2>
                <p className="text-sm text-gray-500">We've sent a 6-digit code to <span className="font-medium text-gray-900">{signupForm.email}</span>.</p>
              </div>
              <div className="space-y-1">
                <input type="text" maxLength={6} placeholder="------" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} className="input-field text-center tracking-[1em] text-lg font-mono font-bold" required />
              </div>
              <button type="submit" disabled={isLoading || otpCode.length !== 6} className="btn-primary w-full !py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</span> : <span className="flex items-center gap-2">Verify & Create Account <ArrowRight size={15} /></span>}
              </button>
              <button type="button" onClick={() => setOtpStep(false)} className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mt-2">
                Back to Sign Up
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">&copy; 2026 GigVerse. Exclusively for <span className='text-[#f26522] font-semibold'>United International University</span>.</p>
      </div>
    </div>
  );
}
