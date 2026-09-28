import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck, Wallet2 } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { submitSealedBid } from '../services/bidService.js';
import { getCurrentUser } from '../services/authService.js';
import { getTenderForContractor } from '../services/tenderService.js';
import { generateSalt, makeBidCommitment } from '../utils/hash.js';
import { formatINR } from '../utils/format.js';

export function SubmitBidPage() {
  const { id } = useParams();
  const [tender, setTender] = useState(null);
  const [form, setForm] = useState({ amount: '', salt: '', wallet: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const data = await getTenderForContractor(id);
      setTender(data);
      const user = getCurrentUser();
      if (user) {
        setForm((current) => ({ ...current, wallet: user.walletAddress || current.wallet }));
      }
    }
    load();
  }, [id]);

  const commitment = useMemo(() => {
    if (!id || !form.amount || !form.salt || !form.wallet) return null;
    const numericAmount = Number(form.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
    return makeBidCommitment({ tenderId: id, wallet: form.wallet, amount: numericAmount, salt: form.salt });
  }, [form.amount, form.salt, form.wallet, id]);

  const handleGenerateSalt = () => {
    setForm((current) => ({ ...current, salt: generateSalt() }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid positive bid amount');
      return;
    }
    if (!form.salt || form.salt.trim().length < 8) {
      setError('Salt must be at least 8 characters long');
      return;
    }
    if (!form.wallet || !/^0x[a-fA-F0-9]{40}$/.test(form.wallet)) {
      setError('Wallet address is required in the demo format');
      return;
    }

    setLoading(true);
    try {
      const response = await submitSealedBid({
        tenderId: id,
        amount,
        salt: form.salt,
        wallet: form.wallet,
        doc: { name: `${id}-technical-bid.pdf`, size: 120000, docHash: 'demo-doc-hash' }
      });
      setResult(response);
    } catch (err) {
      setError(err.message || 'Unable to submit sealed bid');
    } finally {
      setLoading(false);
    }
  };

  if (!tender) return <div className="text-slate-300">Loading tender details...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#FF6B4A] font-semibold">{tender.id}</div>
          <h1 className="mt-2 text-3xl font-bold text-white">Submit sealed bid</h1>
        </div>
        <StatusBadge status={tender.status || 'OPEN'} />
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Bid amount</label>
              <input
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 2000000"
                className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200">Random salt</label>
                <button type="button" onClick={handleGenerateSalt} className="text-xs text-[#FF8A72] hover:text-[#FFB09C]">Generate salt</button>
              </div>
              <input
                value={form.salt}
                onChange={(event) => setForm((current) => ({ ...current, salt: event.target.value }))}
                placeholder="At least 8 random characters"
                className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Wallet address</label>
              <input
                value={form.wallet}
                onChange={(event) => setForm((current) => ({ ...current, wallet: event.target.value }))}
                placeholder="0xABCD..."
                className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <div className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">{error}</div>}
            {result && (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              {loading ? 'Submitting secure commitment...' : 'Commit sealed bid'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </Card>

        <Card>
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Preview</div>
          <div className="mt-3 text-2xl font-bold text-white">{form.amount ? formatINR(form.amount) : '₹0'}</div>
          <div className="mt-5 rounded-xl border border-[#1E2A44] bg-[#0B1220] p-3 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-blue-300"><Wallet2 className="h-4 w-4" /> Demo wallet</div>
            <div className="mt-2 break-all font-mono text-xs text-slate-200">{form.wallet || 'Waiting for wallet'}</div>
          </div>
          <div className="mt-5 rounded-xl border border-[#1E2A44] bg-[#0B1220] p-3 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-emerald-300"><ShieldCheck className="h-4 w-4" /> Stored commitment</div>
            <div className="mt-2 break-all font-mono text-[11px] text-slate-200">
              {commitment || 'Commitment will appear once amount, salt, and wallet are set.'}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SubmitBidPage;
