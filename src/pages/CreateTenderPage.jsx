import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { formatINR } from '../utils/format.js';
import * as api from '../services/api.js';
import * as blockchain from '../services/blockchain.js';
import {
  FilePlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Sliders,
  Layers,
  Calendar,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  ExternalLink
} from 'lucide-react';

export function CreateTenderPage() {
  const navigate = useNavigate();

  // Basic Form State
  const [formData, setFormData] = useState({
    title: 'Smart Water Management & Metering Infrastructure',
    description: 'Deployment of IoT-enabled flow sensors, automated telemetry, and pipe replacement for municipal grid.',
    category: 'Public Infrastructure',
    location: 'Bengaluru',
    budget: '15000000',
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
    duration: '12 Months'
  });

  // Policy Weights State
  const [policy, setPolicy] = useState({
    price: 40,
    reputation: 25,
    performance: 20,
    risk: 15
  });

  // UI Lifecycle States
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [createdTenderId, setCreatedTenderId] = useState(null);
  const [error, setError] = useState(null);

  const totalWeight = Number(policy.price || 0) + Number(policy.reputation || 0) + Number(policy.performance || 0) + Number(policy.risk || 0);
  const isWeightValid = totalWeight === 100;

  const handleWeightChange = (key, val) => {
    const num = Math.max(0, Math.min(100, parseInt(val) || 0));
    setPolicy((prev) => ({ ...prev, [key]: num }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isWeightValid) {
      setError('Evaluation weights total must equal exactly 100%.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create tender in tender lifecycle service
      const newTender = await api.createTender({
        title: formData.title,
        description: formData.description,
        department: formData.category,
        location: formData.location,
        budget: Number(formData.budget),
        deadline: new Date(formData.deadline).toISOString(),
        duration: formData.duration,
        policy: {
          priceWeight: policy.price,
          reputationWeight: policy.reputation,
          performanceWeight: policy.performance,
          riskWeight: policy.risk
        }
      });

      // 2. Register transaction record on chain
      const txResult = await blockchain.createTenderOnChain({
        id: newTender?.id,
        title: formData.title,
        budget: formData.budget
      });

      setTxHash(txResult?.txHash || newTender?.onChainRecordHash);
      setCreatedTenderId(newTender?.id || 'T006');
    } catch (err) {
      console.error('Failed to create tender:', err);
      setError(err.message || 'Failed to submit tender specification to MST chain.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdTenderId) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Tender Published Successfully"
          subtitle="Your procurement notice is now registered on the tamper-evident MST blockchain ledger."
        />

        <Card className="border-emerald-800/60 bg-emerald-950/20 text-emerald-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800">
              Tender Registered · {createdTenderId}
            </span>
            <h2 className="text-xl font-bold text-white mt-3">{formData.title}</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-lg mx-auto">{formData.description}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] text-left text-xs space-y-2 max-w-lg mx-auto font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-emerald-400 font-bold">OPEN FOR BIDS</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Budget:</span>
              <span className="text-white font-bold">{formatINR(formData.budget)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Transaction Hash:</span>
              <span className="text-[#FF8A72] truncate max-w-[240px]">{txHash}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to={`/admin/tenders/${createdTenderId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF6B4A] hover:bg-[#FF8A72] text-white font-semibold text-xs transition-colors shadow-lg shadow-[#FF6B4A]/20"
            >
              View Tender Details <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin/tenders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#1E2A44] bg-[#0B1220] hover:bg-[#15213B] text-slate-200 font-semibold text-xs transition-colors"
            >
              Manage All Tenders
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <PageHeader
        title="Create Tender Notice"
        subtitle="Publish a new public procurement specification with deterministic scoring rules and cryptographic commitment windows."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION A — BASIC DETAILS */}
        <Card header={
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Building2 className="w-5 h-5 text-[#FF6B4A]" />
            SECTION A — Basic Details
          </div>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Tender Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Municipal School Renovation Phase II"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description *</label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed scope of works, deliverable specs, and contract terms..."
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category / Department *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Infrastructure, Water Works, Smart City"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Location *</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Bengaluru, Mysuru, Hubballi"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Estimated Budget (₹ INR) *</label>
              <input
                type="number"
                required
                min="1000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                Formatted: {formatINR(formData.budget)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Bid Deadline *</label>
              <input
                type="datetime-local"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Project Duration *</label>
              <input
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 6 Months, 12 Months"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
          </div>
        </Card>

        {/* SECTION B — PROCUREMENT EVALUATION POLICY */}
        <Card header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <Sliders className="w-5 h-5 text-[#FF6B4A]" />
              SECTION B — Procurement Evaluation Policy
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isWeightValid
                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/50'
                  : 'bg-rose-950/70 text-rose-400 border-rose-700/50 animate-pulse'
              }`}
            >
              Total Weight: {totalWeight}%
            </span>
          </div>
        }>
          <p className="text-xs text-slate-400 mb-6">
            Configure the evaluation criteria weights for automated smart-contract bid scoring. Total weights must sum to exactly 100%.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Price Weight</span>
                <span className="text-[#FF8A72] font-mono">{policy.price}%</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={policy.price}
                onChange={(e) => handleWeightChange('price', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#1E2A44] bg-[#111A2E] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Reputation Weight</span>
                <span className="text-[#FF8A72] font-mono">{policy.reputation}%</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={policy.reputation}
                onChange={(e) => handleWeightChange('reputation', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#1E2A44] bg-[#111A2E] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Performance Weight</span>
                <span className="text-[#FF8A72] font-mono">{policy.performance}%</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={policy.performance}
                onChange={(e) => handleWeightChange('performance', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#1E2A44] bg-[#111A2E] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Bid Risk Weight</span>
                <span className="text-[#FF8A72] font-mono">{policy.risk}%</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={policy.risk}
                onChange={(e) => handleWeightChange('risk', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#1E2A44] bg-[#111A2E] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
          </div>

          {!isWeightValid && (
            <p className="mt-4 text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Evaluation policy total is {totalWeight}%. Please adjust weights so the sum equals exactly 100%.
            </p>
          )}
        </Card>

        {/* SECTION C — BLOCKCHAIN EXECUTION */}
        <Card header={
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            SECTION C — Blockchain Lifecycle Execution
          </div>
        }>
          <p className="text-xs text-slate-400 mb-4">
            TenderGuard automatically executes end-to-end procurement guarantees on the MST blockchain ledger:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              '✓ Tender registration',
              '✓ Sealed bid commitments',
              '✓ Bid reveal verification',
              '✓ Deterministic evaluation',
              '✓ Award execution',
              '✓ Escrow funding',
              '✓ Performance bond',
              '✓ Milestone payments',
              '✓ Supplier reputation'
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44] text-slate-200 font-medium flex items-center gap-2"
              >
                <span className="text-emerald-400 font-bold">{item.slice(0, 1)}</span>
                <span>{item.slice(2)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* SECTION D — REVIEW & SUBMIT */}
        <Card header={
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Sparkles className="w-5 h-5 text-[#FF6B4A]" />
            SECTION D — Review & Submission
          </div>
        }>
          <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] space-y-3 text-xs mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Tender Title</span>
                <span className="text-white font-bold text-sm">{formData.title || '—'}</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Estimated Budget</span>
                <span className="text-emerald-400 font-bold text-sm">{formatINR(formData.budget)}</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Category & Location</span>
                <span className="text-slate-200 font-medium">{formData.category} • {formData.location}</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Evaluation Weights</span>
                <span className="text-purple-300 font-mono font-medium">
                  P:{policy.price}% • R:{policy.reputation}% • Perf:{policy.performance}% • Risk:{policy.risk}%
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            <Link
              to="/admin/tenders"
              className="px-4 py-2.5 rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-300 text-xs font-semibold hover:bg-[#15213B] transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || !isWeightValid}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs transition-all shadow-lg ${
                isWeightValid && !submitting
                  ? 'bg-[#FF6B4A] hover:bg-[#FF8A72] text-white shadow-[#FF6B4A]/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  REGISTERING ON MST CHAIN...
                </>
              ) : (
                <>
                  <FilePlus className="w-4 h-4" />
                  CREATE TENDER ON MST
                </>
              )}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default CreateTenderPage;
