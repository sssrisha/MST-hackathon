import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, Eye, EyeOff } from 'lucide-react';
import { signup } from '../services/authService.js';

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    company: 'ABC Infrastructure Pvt Ltd',
    email: 'demo@abcinfra.example',
    phone: '9876543210',
    password: 'demo1234',
    confirmPassword: 'demo1234',
    registrationId: 'ABC-INF-2023',
    category: 'Infrastructure',
    yearsOfExperience: '8',
    gstin: '27ABCDE1234F1Z5',
    walletAddress: '0xABCD12347890EFAB5678901234567890ABCD1234',
    contactName: 'Rakesh Mehta',
    businessType: 'Engineering & Construction'
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.company) nextErrors.company = 'Company name is required';
    if (!form.email) nextErrors.email = 'Email is required';
    if (!/^\d{10}$/.test(String(form.phone || '').replace(/\D/g, ''))) nextErrors.phone = 'Enter a valid 10-digit phone number';
    if (!form.password || form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    if (!form.registrationId) nextErrors.registrationId = 'Registration ID is required';
    if (!GSTIN_PATTERN.test(form.gstin || '')) nextErrors.gstin = 'GSTIN format is invalid';
    if (!/^0x[a-fA-F0-9]{40}$/.test(form.walletAddress || '')) nextErrors.walletAddress = 'Wallet address must follow the 0x + 40 hex pattern';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await signup({
        company: form.company,
        email: form.email,
        phone: `+91 ${form.phone}`,
        password: form.password,
        registrationId: form.registrationId,
        category: form.category,
        yearsOfExperience: Number(form.yearsOfExperience),
        gstin: form.gstin,
        walletAddress: form.walletAddress,
        contactName: form.contactName,
        businessType: form.businessType
      });
      navigate('/contractor', { replace: true });
    } catch (error) {
      setErrors({ submit: error.message || 'Unable to register contractor' });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setForm({
      company: 'ABC Infrastructure Pvt Ltd',
      email: 'demo@abcinfra.example',
      phone: '9876543210',
      password: 'demo1234',
      confirmPassword: 'demo1234',
      registrationId: 'ABC-INF-2023',
      category: 'Infrastructure',
      yearsOfExperience: '8',
      gstin: '27ABCDE1234F1Z5',
      walletAddress: '0xABCD12347890EFAB5678901234567890ABCD1234',
      contactName: 'Rakesh Mehta',
      businessType: 'Engineering & Construction'
    });
  };

  return (
    <div className="tg-internal min-h-screen bg-[#0B1220] text-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-[#1E2A44] bg-[#111A2E] shadow-2xl overflow-hidden">
        <div className="border-b border-[#1E2A44] bg-[#0E1626] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF4B3E]/10 border border-[#FF4B3E]/25 flex items-center justify-center text-[#FF6B4A]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Create Contractor Account</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Supplier onboarding</div>
            </div>
          </div>
          <button type="button" onClick={fillDemo} className="inline-flex items-center gap-2 rounded-lg border border-[#1E2A44] bg-[#0B1220] px-3 py-2 text-xs font-medium text-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Fill demo details
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6 p-6 md:p-8" noValidate>
          <div className="space-y-5">
            <div>
              <label htmlFor="company" className="mb-2 block text-sm font-medium text-slate-200">Company / Contractor Name</label>
              <input id="company" name="company" value={form.company} onChange={handleChange} aria-invalid={Boolean(errors.company)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
              {errors.company && <p className="mt-1 text-xs text-rose-400">{errors.company}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} aria-invalid={Boolean(errors.email)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-200">Phone Number</label>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-sm text-slate-400">+91</span>
                <input id="phone" name="phone" inputMode="numeric" value={form.phone} onChange={handleChange} aria-invalid={Boolean(errors.phone)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} aria-invalid={Boolean(errors.password)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 pr-10 text-slate-100 focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-slate-400 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-200">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} aria-invalid={Boolean(errors.confirmPassword)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="registrationId" className="mb-2 block text-sm font-medium text-slate-200">Company Registration ID</label>
              <input id="registrationId" name="registrationId" value={form.registrationId} onChange={handleChange} aria-invalid={Boolean(errors.registrationId)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
              {errors.registrationId && <p className="mt-1 text-xs text-rose-400">{errors.registrationId}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="mb-2 block text-sm font-medium text-slate-200">Category</label>
                <select id="category" name="category" value={form.category} onChange={handleChange} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500">
                  <option>Infrastructure</option>
                  <option>IT &amp; Software</option>
                  <option>Supplies</option>
                  <option>Consulting</option>
                  <option>Healthcare</option>
                </select>
              </div>

              <div>
                <label htmlFor="yearsOfExperience" className="mb-2 block text-sm font-medium text-slate-200">Years of Experience</label>
                <input id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" max="60" value={form.yearsOfExperience} onChange={handleChange} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label htmlFor="gstin" className="mb-2 block text-sm font-medium text-slate-200">GST/Business ID</label>
              <input id="gstin" name="gstin" value={form.gstin} onChange={handleChange} aria-invalid={Boolean(errors.gstin)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
              {errors.gstin && <p className="mt-1 text-xs text-rose-400">{errors.gstin}</p>}
            </div>

            <div>
              <label htmlFor="walletAddress" className="mb-2 block text-sm font-medium text-slate-200">Wallet Address</label>
              <div className="flex gap-2">
                <input id="walletAddress" name="walletAddress" value={form.walletAddress} onChange={handleChange} aria-invalid={Boolean(errors.walletAddress)} className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setForm((current) => ({ ...current, walletAddress: '0xABCD12347890EFAB5678901234567890ABCD1234' }))} className="rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-xs font-medium text-slate-200">Use demo wallet</button>
              </div>
              {errors.walletAddress && <p className="mt-1 text-xs text-rose-400">{errors.walletAddress}</p>}
            </div>

            {errors.submit && <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">{errors.submit}</div>}

            <div className="flex items-center justify-between gap-3 pt-3">
              <div className="text-sm text-slate-400">Already have an account? <Link to="/contractor/login" className="text-[#FF8A72] hover:text-[#FFB09C]">Sign in</Link></div>
              <button type="submit" disabled={loading} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{loading ? 'Creating account...' : 'Create Contractor Account'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupPage;
