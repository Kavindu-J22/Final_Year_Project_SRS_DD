'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Eye, EyeOff, AlertCircle, CheckCircle,
  Lock, Mail, User, Building2, ChevronDown,
} from 'lucide-react';
import { authAPI } from '@/lib/api';

const ROLES = ['analyst', 'investigator', 'admin', 'auditor'];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'analyst', organization: '',
  });
  const [show,    setShow]    = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    if (!form.name.trim())         return 'Full name is required.';
    if (!form.email.trim())        return 'Email address is required.';
    if (form.password.length < 8)  return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await authAPI.register({
        name:         form.name.trim(),
        email:        form.email.trim(),
        password:     form.password,
        role:         form.role,
        organization: form.organization.trim(),
      });
      localStorage.setItem('cf_token', data.token);
      localStorage.setItem('cf_user',  JSON.stringify(data.user));
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const strengthScore = () => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8)              s++;
    if (/[A-Z]/.test(p))            s++;
    if (/[0-9]/.test(p))            s++;
    if (/[^A-Za-z0-9]/.test(p))    s++;
    return s;
  };
  const strength = strengthScore();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4 shadow-glow-cyan">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Cloud Forensics</h1>
          <p className="text-slate-500 text-sm mt-1">Incident Capture & Analysis Platform</p>
        </div>

        <div className="glass-card p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Create Account</h2>
            <Link href="/login" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Sign in instead →
            </Link>
          </div>

          {/* Success banner */}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Account created! Redirecting to dashboard…
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" className="input-field pl-9" placeholder="Jane Smith"
                  value={form.name} onChange={set('name')} required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" className="input-field pl-9" placeholder="analyst@mssp.com"
                  value={form.email} onChange={set('email')} required />
              </div>
            </div>

            {/* Role + Organization */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <select className="input-field appearance-none cursor-pointer capitalize pr-8"
                    value={form.role} onChange={set('role')}>
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="capitalize">{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Organization</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" className="input-field pl-9" placeholder="MSSP Ltd."
                    value={form.organization} onChange={set('organization')} />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={show.password ? 'text' : 'password'} className="input-field pl-9 pr-10"
                  placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required />
                <button type="button" onClick={() => setShow((s) => ({ ...s, password: !s.password }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        n <= strength ? strengthColor : 'bg-slate-800'
                      }`} />
                    ))}
                  </div>
                  <p className={`text-[10px] font-medium ${['', 'text-red-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400'][strength]}`}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={show.confirm ? 'text' : 'password'} className="input-field pl-9 pr-10"
                  placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                <button type="button" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Match indicator */}
              {form.confirmPassword && (
                <p className={`text-[10px] mt-1 font-medium ${
                  form.password === form.confirmPassword ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading || success}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
                : <Shield className="w-4 h-4" />}
              {loading ? 'Creating Account…' : 'Create Secure Account'}
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center pt-2">
            Protected by SHA-256 · RSA-2048 · Zero-Trust Architecture
          </p>
        </div>
      </div>
    </div>
  );
}

