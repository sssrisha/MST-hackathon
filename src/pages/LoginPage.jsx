import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, ArrowRight, Mail, Lock } from 'lucide-react';
import { login, logout } from '../services/authService.js';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: 'demo@abcinfra.example', password: 'demo1234' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const from = location.state?.from || '/contractor';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.email) nextErrors.email = 'Email is required';
    if (!form.password) nextErrors.password = 'Password is required';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (error) {
      setErrors({ submit: error.message || 'Unable to sign in' });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login('demo@abcinfra.example', 'demo1234');
      navigate('/contractor', { replace: true });
    } catch (error) {
      setErrors({ submit: error.message || 'Unable to use demo account' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tg-internal min-h-screen bg-[#0B1220] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-2xl border border-[#1E2A44] bg-[#111A2E] shadow-2xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative hidden md:flex items-center justify-center bg-[#0B1220] p-10 border-r border-[#1E2A44]">
            <div className="max-w-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#FF4B3E]/10 border border-[#FF4B3E]/25 flex items-center justify-center text-[#FF6B4A]">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight text-white">Tender<span className="text-[#FF6B4A]">Guard</span></div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Contractor Login</div>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-7">
                Sign in to continue your sealed-bid workflow, reveal cryptographic commitments, and track milestone progress for your supplier profile.
              </p>
              <div className="mt-8 rounded-xl border border-[#1E2A44] bg-[#0E1626]/80 p-4 text-sm text-slate-300">
                <div className="font-semibold text-white mb-2">Demo access</div>
                <div className="flex items-center gap-2 text-slate-400"><Mail className="w-4 h-4 text-[#FF6B4A]" /> demo@abcinfra.example</div>
                <div className="flex items-center gap-2 mt-2 text-slate-400"><Lock className="w-4 h-4 text-[#FF6B4A]" /> demo1234</div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.18em] text-[#FF6B4A] font-semibold">Welcome back</div>
              <h1 className="mt-2 text-3xl font-bold text-white">Sign in to your contractor portal</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] py-3 pl-10 pr-3 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && <p id="email-error" className="mt-2 text-xs text-rose-400">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] py-3 pl-10 pr-10 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p id="password-error" className="mt-2 text-xs text-rose-400">{errors.password}</p>}
              </div>

              {errors.submit && <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">{errors.submit}</div>}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
                >
                  Forgot Password
                </button>
                <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? 'Signing in...' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="pt-2 border-t border-[#1E2A44]">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                    className="mt-3 w-full rounded-xl border border-[#FF4B3E]/35 bg-[#FF4B3E]/[0.06] px-4 py-3 text-sm font-semibold text-[#FF9A82] hover:bg-[#FF4B3E]/[0.12]"
                >
                  Continue as demo contractor
                </button>
                <div className="mt-4 text-center text-sm text-slate-400">
                  Need an account?{' '}
                  <Link to="/contractor/signup" className="font-medium text-[#FF8A72] hover:text-[#FFB09C]">Create Contractor Account</Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1E2A44] bg-[#111A2E] p-6">
            <div className="text-lg font-semibold text-white">Demo only, no email is sent</div>
            <p className="mt-2 text-sm text-slate-300">This is a demo flow. Password reset is not connected to any live email service.</p>
            <button type="button" onClick={() => setForgotOpen(false)} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
