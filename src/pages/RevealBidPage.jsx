import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, LockOpen } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { getMyBids } from '../services/contractorService.js';
import { revealBid } from '../services/bidService.js';
import { getSecrets } from '../services/mockDb.js';
import { formatINR } from '../utils/format.js';
import { makeBidCommitment } from '../utils/hash.js';

export function RevealBidPage() {
  const { bidId } = useParams();
  const [bid, setBid] = useState(null);
  const [form, setForm] = useState({ amount: '', salt: '' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function load() {
      const bids = await getMyBids();
      const target = bids.find((item) => item.bidId === bidId) || null;
      setBid(target);
      const secrets = getSecrets();
      const owner = target?.contractorId || target?.supplierId;
      const candidate = owner ? secrets[owner]?.[target?.tenderId] : null;
      if (candidate) {
        setForm({ amount: String(candidate.amount || ''), salt: String(candidate.salt || '') });
      }
    }
    load();
  }, [bidId]);

  const expectedCommitment = useMemo(() => {
    if (!bid || !form.amount || !form.salt) return null;
    return makeBidCommitment({
      tenderId: bid.tenderId,
      wallet: bid.wallet || '0xABCD12347890EFAB5678901234567890ABCD1234',
      amount: Number(form.amount),
      salt: form.salt
    });
  }, [bid, form.amount, form.salt]);

  const handleReveal = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      setLoading(true);
      const response = await revealBid({
        bidId,
        amount: Number(form.amount),
        salt: form.salt
      });
      setFeedback(response.verified
        ? { type: 'success', text: `Bid integrity verified. ${response.reason}` }
        : { type: 'error', text: response.reason || 'Reveal failed' });
      if (response.verified) {
        setBid((current) => ({ ...current, status: 'VERIFIED', amount: response.amount }));
      }
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Reveal failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!bid) return <div className="text-slate-300">Loading reveal page...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-blue-400 font-semibold">{bid.tenderId}</div>
          <h1 className="mt-2 text-3xl font-bold text-white">Reveal committed bid</h1>
        </div>
        <StatusBadge status={bid.status === 'VERIFIED' ? 'VERIFIED' : 'OPEN'} />
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card>
          <form onSubmit={handleReveal} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Original bid amount</label>
              <input
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                type="number"
                min="1"
                step="1"
                className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Original salt</label>
              <input
                value={form.salt}
                onChange={(event) => setForm((current) => ({ ...current, salt: event.target.value }))}
                className="w-full rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {feedback && (
              <div className={feedback.type === 'success' ? 'rounded-lg border border-emerald-800 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-200' : 'rounded-lg border border-rose-800 bg-rose-950/35 px-3 py-2 text-sm text-rose-200'}>
                {feedback.text}
              </div>
            )}

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              <LockOpen className="h-4 w-4" />
              {loading ? 'Verifying bid...' : 'Reveal and verify'}
            </button>
          </form>
        </Card>

        <Card>
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Bid receipt</div>
          <div className="mt-3 text-xl font-semibold text-white">{bid.bidId}</div>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <div className="rounded-xl border border-[#1E2A44] bg-[#0B1220] p-3"><span className="text-slate-500">Tender:</span> <span className="ml-2 font-medium text-white">{bid.tenderTitle || bid.tenderId}</span></div>
            <div className="rounded-xl border border-[#1E2A44] bg-[#0B1220] p-3"><span className="text-slate-500">Current amount:</span> <span className="ml-2 font-medium text-white">{bid.amount ? formatINR(bid.amount) : 'Hidden until reveal'}</span></div>
            <div className="rounded-xl border border-[#1E2A44] bg-[#0B1220] p-3 break-all font-mono text-[11px] text-slate-200">
              {expectedCommitment || 'Expected commitment appears after entering amount + salt.'}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default RevealBidPage;
