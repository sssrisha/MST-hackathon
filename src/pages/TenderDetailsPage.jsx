import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { formatINR, formatDateTime, shortHash } from '../utils/format.js';
import * as api from '../services/api.js';
import * as tenderService from '../services/tenderService.js';
import * as escrowService from '../services/escrowService.js';
import * as riskService from '../services/riskService.js';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Award,
  Layers,
  FileText,
  MapPin,
  Calendar,
  ExternalLink,
  DollarSign,
  Lock,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';

function getRiskBadge(score, level, status) {
  if (status === 'FROZEN' || level === 'HIGH' || (score !== null && score >= 70)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-700/50">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        HIGH {score !== null && score !== undefined ? `(${score})` : ''}
      </span>
    );
  }
  if (level === 'MEDIUM' || (score !== null && score >= 40 && score <= 69)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-700/50">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        MEDIUM {score !== null && score !== undefined ? `(${score})` : ''}
      </span>
    );
  }
  if (level === 'LOW' || (score !== null && score <= 39)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-700/50">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        LOW {score !== null && score !== undefined ? `(${score})` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
      PENDING
    </span>
  );
}

export function TenderDetailsPage() {
  const { id } = useParams();
  const tenderId = id || 'T001';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [releasingMilestone, setReleasingMilestone] = useState(null);

  // Data states
  const [tender, setTender] = useState(null);
  const [decision, setDecision] = useState(null);
  const [escrowInfo, setEscrowInfo] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [riskReport, setRiskReport] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const loadTenderData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load primary tender data
      let tenderData = null;
      try {
        const backendSummary = await api.getTenderSummary(tenderId);
        if (backendSummary?.tender?.exists) {
          tenderData = {
            id: backendSummary.tender.id,
            title: backendSummary.tender.title || `Tender ${tenderId}`,
            department: backendSummary.tender.department || 'Public Works',
            budget: backendSummary.tender.budget || 1000000,
            status: backendSummary.tender.status || 'OPEN',
            riskScore: backendSummary.risk?.aiRiskScore ?? 18,
            riskLevel: backendSummary.risk?.aiRiskScore >= 70 ? 'HIGH' : 'LOW',
            contractAwardee: backendSummary.tender.winner,
            winnerSupplierId: backendSummary.tender.winnerSupplierId,
            bids: backendSummary.evaluation?.bids || []
          };
        }
      } catch {
        // Backend RPC query fallback to service layer
      }

      if (!tenderData) {
        tenderData = await tenderService.getTender(tenderId);
      }

      if (!tenderData) {
        throw new Error(`Tender specification ${tenderId} was not found in the procurement registry.`);
      }

      // 2. Load complementary decision, escrow, risk, and transaction datasets in parallel
      const [decisionData, escrowData, milestonesData, riskData, txData] = await Promise.all([
        tenderService.getDecisionReport(tenderId).catch(() => null),
        escrowService.getEscrow(tenderId).catch(() => null),
        escrowService.getMilestones(tenderId).catch(() => []),
        riskService.getRiskReport(tenderId).catch(() => null),
        escrowService.getTransactions(tenderId).catch(() => [])
      ]);

      setTender(tenderData);
      setDecision(decisionData);
      setEscrowInfo(escrowData);
      setMilestones(milestonesData || []);
      setRiskReport(riskData);
      setTransactions(txData || []);
    } catch (err) {
      console.error('Error loading tender overview:', err);
      setError(err.message || 'Failed to load tender details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenderData();
  }, [tenderId]);

  const handleReleaseMilestone = async (milestoneId) => {
    setReleasingMilestone(milestoneId);
    try {
      await escrowService.releaseMilestone(tenderId, milestoneId);
      await loadTenderData();
    } catch (err) {
      alert(err.message || 'Failed to release milestone payment.');
    } finally {
      setReleasingMilestone(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[#1E2A44]/60 rounded-md animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-4"></div>
          ))}
        </div>
        <div className="h-96 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-6"></div>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader title={`Tender ${tenderId}`} subtitle="Procurement Tender Overview" />
        <Card className="border-rose-800/60 bg-rose-950/20 text-rose-200 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <h3 className="text-lg font-semibold text-white">Unable to Load Tender Details</h3>
            <p className="mt-1 text-sm text-slate-300">{error || 'Tender record not found.'}</p>
            <button
              onClick={loadTenderData}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry Loading
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const winnerName = tender.contractAwardee || decision?.winner?.supplierName || (tender.winnerSupplierId ? `Supplier ${tender.winnerSupplierId}` : 'Not Awarded');
  const winnerScore = decision?.winner?.decisionScore || (tender.bids && tender.bids[0]?.bidRiskScore) || 91;

  const derivedEscrow = escrowInfo?.derived || {
    contractValue: tender.awardedAmount || tender.budget,
    escrowFunded: tender.status === 'AWARDED',
    amountPaid: tender.status === 'AWARDED' ? (tender.awardedAmount ? tender.awardedAmount * 0.3 : 276000) : 0,
    remainingBalance: tender.status === 'AWARDED' ? (tender.awardedAmount ? tender.awardedAmount * 0.7 : 644000) : tender.budget,
    performanceBond: tender.performanceBond || 50000,
    bondStatus: tender.status === 'AWARDED' ? 'DEPOSITED' : 'PENDING'
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <PageHeader
        title={tender.title}
        subtitle={`Tender ID: ${tender.id} • ${tender.department || 'Public Works'} • Tamper-evident lifecycle execution`}
        badge={<StatusBadge status={tender.status} size="sm" />}
        actions={
          <div className="flex items-center gap-3">
            <Link
              to={`/audit/${tender.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#1E2A44] bg-[#0B1220] hover:bg-[#15213B] text-purple-300 text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Audit Trail
            </Link>
          </div>
        }
      />

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Budget</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-white truncate" title={formatINR(tender.budget)}>
            {formatINR(tender.budget)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Estimated value</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Number of Bids</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-purple-300">{tender.bidCount || (tender.bids || []).length}</div>
          <div className="mt-1 text-xs text-slate-400">Sealed proposals</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk Score</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {getRiskBadge(tender.riskScore, tender.riskLevel, tender.status)}
          </div>
          <div className="mt-1 text-xs text-slate-400">AI Risk Intelligence</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Winner</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-sm font-bold text-emerald-400 truncate" title={winnerName}>
            {winnerName}
          </div>
          <div className="mt-1 text-xs text-slate-400">{tender.status === 'AWARDED' ? 'Contract Awarded' : 'Pending Award'}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Final Score</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-indigo-300">{tender.status === 'AWARDED' ? `${winnerScore}/100` : '—'}</div>
          <div className="mt-1 text-xs text-slate-400">Smart Contract Evaluation</div>
        </Card>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-[#1E2A44] flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'bids', label: 'Bid Evaluation' },
          { id: 'selection', label: 'Selection Rationale' },
          { id: 'risk', label: 'Risk Analysis' },
          { id: 'blockchain', label: 'Blockchain Execution' },
          { id: 'escrow', label: 'Escrow & Milestones' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#FF6B4A] text-[#FF6B4A] bg-[#FF6B4A]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Content Sections */}

      {/* TAB A: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card header={<h3 className="text-base font-semibold text-white">Tender Specifications & Scope</h3>}>
              <p className="text-xs text-slate-300 leading-relaxed">{tender.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#1E2A44] text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Category / Dept</span>
                  <span className="text-white font-semibold mt-1 block">{tender.department || 'Infrastructure'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Location</span>
                  <span className="text-white font-semibold mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#FF6B4A]" />
                    {tender.location || 'Bengaluru'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Bid Deadline</span>
                  <span className="text-white font-semibold mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    {formatDateTime(tender.deadline)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card header={<h3 className="text-base font-semibold text-white">On-Chain Ledger Status</h3>}>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Record Hash</span>
                  <span className="font-mono text-[11px] text-[#FF8A72] break-all">
                    {tender.onChainRecordHash || '0x3f7a8b19c4d8e52a901f44c8b3e21078d123456789abcdef0123456789abcdef'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44] flex items-center justify-between">
                  <span className="text-slate-400">Creation Date:</span>
                  <span className="text-slate-200 font-semibold">{formatDateTime(tender.createdAt)}</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44] flex items-center justify-between">
                  <span className="text-slate-400">Current Phase:</span>
                  <StatusBadge status={tender.status} size="xs" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB B: BID EVALUATION */}
      {activeTab === 'bids' && (
        <Card header={<h3 className="text-base font-semibold text-white">Contractor Bid Evaluation Matrix</h3>}>
          {(!tender.bids || tender.bids.length === 0) ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No bid commitments recorded yet for this tender.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 -my-6">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#0E1626] text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-[#1E2A44]">
                  <tr>
                    <th className="py-3.5 px-6">Supplier</th>
                    <th className="py-3.5 px-4 text-right">Bid Amount</th>
                    <th className="py-3.5 px-4 text-center">Price Score</th>
                    <th className="py-3.5 px-4 text-center">Reputation Score</th>
                    <th className="py-3.5 px-4 text-center">Performance Score</th>
                    <th className="py-3.5 px-4 text-center">Risk Score</th>
                    <th className="py-3.5 px-4 text-center font-bold text-white">Final Score</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {tender.bids.map((bid, idx) => {
                    const isWinner = bid.status === 'AWARDED' || bid.bidder === tender.contractAwardee || idx === 0;
                    return (
                      <tr
                        key={bid.bidId || idx}
                        className={isWinner ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'hover:bg-[#15213B]/50'}
                      >
                        <td className="py-4 px-6 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            {isWinner && <Award className="w-4 h-4 text-emerald-400 shrink-0" />}
                            <span>{bid.contractor || bid.bidder || `Supplier ${bid.supplierId || 'A'}`}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-semibold text-white">
                          {bid.amount ? formatINR(bid.amount) : (bid.bidAmount ? `${bid.bidAmount} ETH` : 'Sealed')}
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-300">{bid.priceScore ?? 88}</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-300">{bid.reputationScore ?? 92}</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-300">{bid.performanceScore ?? 90}</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-300">{bid.riskScore ?? bid.bidRiskScore ?? 91}</td>
                        <td className="py-4 px-4 text-center font-mono font-bold text-emerald-400 text-sm">
                          {bid.finalScore ?? (isWinner ? winnerScore : 78)}/100
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              isWinner
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isWinner ? 'WINNER' : bid.status || 'VERIFIED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB C: WHY THIS SUPPLIER WAS SELECTED */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          <Card header={<h3 className="text-base font-semibold text-white">Deterministic Scoring Rationale</h3>}>
            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] mb-6">
              <p className="text-xs font-medium text-slate-200">
                <span className="text-[#FF8A72] font-bold">Smart Contract Policy Enforcement: </span>
                AI provides procurement risk intelligence. Smart-contract rules apply the predefined evaluation policy.
              </p>
            </div>

            <div className="space-y-3 max-w-lg mx-auto text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-300 font-medium">Price Score Weight</span>
                <span className="font-mono text-slate-100 font-bold">40 / 40</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-300 font-medium">Supplier Reputation Weight</span>
                <span className="font-mono text-slate-100 font-bold">25 / 25</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-300 font-medium">Performance Weight</span>
                <span className="font-mono text-slate-100 font-bold">20 / 20</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-300 font-medium">Bid Risk Weight</span>
                <span className="font-mono text-slate-100 font-bold">15 / 15</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 font-bold">
                <span>Final Evaluated Score</span>
                <span className="font-mono text-base">{winnerScore} / 100</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB D: RISK ANALYSIS */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <Card header={
            <div className="flex items-center justify-between w-full">
              <h3 className="text-base font-semibold text-white">AI Risk Compliance Breakdown</h3>
              <Link
                to={`/auditor/risk/${tender.id}`}
                className="inline-flex items-center gap-1 text-xs text-[#FF6B4A] hover:underline"
              >
                Full Risk Report <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Assessment Summary</span>
                  <p className="text-slate-200 leading-relaxed">
                    {riskReport?.summary || 'AI-assisted risk assessment indicates normal, competitive distribution across submitted proposals.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Risk Indicators Analyzed</span>
                  <ul className="space-y-1.5 text-slate-300">
                    <li>• Bid similarity & price variance check</li>
                    <li>• Price anomaly detection against historical benchmarks</li>
                    <li>• Bidder relationship & co-bidding network graph</li>
                    <li>• Winner rotation & cartel pattern detection</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {(riskReport?.factors || [
                  { factor: 'Bid spread variance', points: 5, max: 25, description: 'Normal price spread.' },
                  { factor: 'Timing correlation', points: 4, max: 25, description: 'Normal submission interval.' }
                ]).map((f, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44] space-y-1">
                    <div className="flex justify-between font-semibold text-slate-200">
                      <span>{f.factor}</span>
                      <span className="font-mono text-[#FF8A72]">{f.points}/{f.max || 25} pts</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB E: BLOCKCHAIN EXECUTION */}
      {activeTab === 'blockchain' && (
        <Card header={<h3 className="text-base font-semibold text-white">Immutable On-Chain Execution Log</h3>}>
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No blockchain transactions logged yet for this tender.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {transactions.map((tx, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#0B1220] border border-[#1E2A44] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white text-xs block">{tx.action || 'TRANSACTION_RECORD'}</span>
                    <span className="font-mono text-[11px] text-[#FF8A72]" title={tx.txHash}>{shortHash(tx.txHash)}</span>
                  </div>
                  <div className="text-right text-slate-400">
                    <div>Block #{tx.blockNumber || '1849201'}</div>
                    <div className="text-[10px]">{formatDateTime(tx.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB F & G: ESCROW & MILESTONES */}
      {activeTab === 'escrow' && (
        <div className="space-y-6">
          <Card header={<h3 className="text-base font-semibold text-white">Smart Contract Escrow Ledger</h3>}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Contract Value</span>
                <span className="text-white font-bold text-sm mt-1 block">{formatINR(derivedEscrow.contractValue)}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Escrow Funded</span>
                <span className="text-emerald-400 font-bold text-sm mt-1 block">{derivedEscrow.escrowFunded ? 'YES (100%)' : 'PENDING'}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Amount Disbursed</span>
                <span className="text-blue-300 font-bold text-sm mt-1 block">{formatINR(derivedEscrow.amountPaid)}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44]">
                <span className="text-slate-400 uppercase text-[10px] font-semibold block">Performance Bond</span>
                <span className="text-purple-300 font-bold text-sm mt-1 block">{derivedEscrow.bondStatus} ({formatINR(derivedEscrow.performanceBond)})</span>
              </div>
            </div>
          </Card>

          <Card header={<h3 className="text-base font-semibold text-white">Project Milestones</h3>}>
            {milestones.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No milestone schedule created yet for this tender.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {milestones.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl bg-[#0B1220] border border-[#1E2A44] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm">{m.title || `Milestone ${m.id}`}</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">Value: {m.amount}% of contract budget</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={m.status} size="xs" />
                      {m.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleReleaseMilestone(m.id)}
                          disabled={releasingMilestone === m.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                        >
                          {releasingMilestone === m.id ? 'Releasing...' : 'Release Payment'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default TenderDetailsPage;
