import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import { getProfile, updateProfile } from '../services/contractorService.js';

export function ContractorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getProfile();
      setProfile(data);
    }
    load();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile(profile);
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="text-slate-300">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-blue-400 font-semibold">Identity</div>
          <h1 className="mt-2 text-3xl font-bold text-white">Supplier Profile</h1>
        </div>
        <button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"> <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'} </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Company details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Company / Contractor Name</label>
              <input name="company" value={profile.company || ''} onChange={handleChange} className="mt-2 w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Contact Name</label>
              <input name="contactName" value={profile.business?.contactName || ''} onChange={(event) => setProfile((current) => ({ ...current, business: { ...current.business, contactName: event.target.value } }))} className="mt-2 w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Business Type</label>
              <input name="businessType" value={profile.business?.businessType || ''} onChange={(event) => setProfile((current) => ({ ...current, business: { ...current.business, businessType: event.target.value } }))} className="mt-2 w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100" />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Wallet & registration</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Email</label>
              <input value={profile.email || ''} disabled className="mt-2 w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-400" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Phone</label>
              <input name="phone" value={profile.phone || ''} onChange={handleChange} className="mt-2 w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Wallet Address</label>
              <input value={profile.walletAddress || ''} disabled className="mt-2 w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ContractorProfilePage;
