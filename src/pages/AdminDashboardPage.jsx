import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { formatINR, formatDateTime, shortHash } from '../utils/format.js';
import * as api from '../services/api.js';
import * as escrowService from '../services/escrowService.js';
import * as supplierRegistry from '../services/supplierRegistry.js';
import {
  FilePlus,
  Layers,
  Users,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Activity,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldAlert,
  FileText,
  Award,
  Clock,
  Filter,
  AlertCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

function formatActionName(action) {
  if (!action) return 'Procurement Event';
  const map = {
    CREATE_TENDER: 'Tender Created',
    TENDER_REGISTERED: 'Tender Created',
    SUBMIT_COMMITMENT: 'Bid Submitted',
    BIDS_SEALED: 'Bids Sealed',
    REVEAL_BID: 'Bid Revealed',
    BIDS_REVEALED_AND_EVALUATED: 'Bid Revealed & Evaluated',
    AWARD_CONFIRMED: 'Tender Awarded',
    RELEASE_MILESTONE: 'Milestone Payment Released',
    RELEASE_MILESTONE_1: 'Milestone Payment Released',
    MILESTONE_RELEASED: 'Milestone Payment Released',
    AI_ANOMALY_FLAGGED: 'AI Anomaly Flagged',
    TENDER_FROZEN: 'Tender Frozen for Review'
  };
  return map[action] || action.replace(/_/g, ' ');
}

function getActivityCategory(action) {
  if (!action) return 'info';
  if (['TENDER_FROZEN', 'AI_ANOMALY_FLAGGED', 'HIGH_RISK'].includes(action)) return 'danger';
  if (['AWARD_CONFIRMED', 'MILESTONE_RELEASED', 'RELEASE_MILESTONE', 'RELEASE_MILESTONE_1'].includes(action)) return 'success';
  if (['SUBMIT_COMMITMENT', 'BIDS_SEALED', 'REVEAL_BID', 'BIDS_REVEALED_AND_EVALUATED'].includes(action)) return 'warning';
  return 'primary';
}

function getActivityIcon(category) {
  switch (category) {
    case 'danger':
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    case 'success':
      return <Award className="w-4 h-4 text-emerald-400" />;
    case 'warning':
      return <Clock className="w-4 h-4 text-amber-400" />;
    case 'primary':
    default:
      return <FileText className="w-4 h-4 text-blue-400" />;
  }
}

function getRiskBadge(tender) {
  if (tender.status === 'FROZEN' || tender.riskLevel === 'HIGH' || (tender.riskScore !== null && tender.riskScore >= 70)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-700/50">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        HIGH {tender.riskScore !== null ? `(${tender.riskScore})` : ''}
      </span>
    );
  }
  if (tender.riskLevel === 'MEDIUM' || (tender.riskScore !== null && tender.riskScore >= 40 && tender.riskScore <= 69)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-700/50">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        MEDIUM {tender.riskScore !== null ? `(${tender.riskScore})` : ''}
      </span>
    );
  }
  if (tender.riskLevel === 'LOW' || (tender.riskScore !== null && tender.riskScore <= 39)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-700/50">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        LOW {tender.riskScore !== null ? `(${tender.riskScore})` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
      PENDING
    </span>
  );
}

export function AdminDashboardPage() {
  const [tenders, setTenders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tendersData, suppliersData, txData] = await Promise.all([
        api.getTenders().catch(() => []),
        supplierRegistry.getSuppliers().catch(() => []),
        escrowService.getTransactions().catch(() => [])
      ]);

      const currentTenders = tendersData || [];
      setTenders(currentTenders);
      setSuppliers(suppliersData || []);
      setTransactions(txData || []);

      // Fetch audit events across tenders
      const auditPromises = currentTenders.map((t) =>
        escrowService.getAuditEvents(t.id).catch(() => [])
      );
      const auditResults = await Promise.all(auditPromises);

      const combinedActivities = [];
      const seenTx = new Set();

      // Process audit events
      auditResults.flat().forEach((evt) => {
        if (evt) {
          if (evt.txHash) seenTx.add(evt.txHash);
          combinedActivities.push({
            id: evt.eventId || `evt-${Math.random()}`,
            actionName: formatActionName(evt.action),
            rawAction: evt.action,
            tenderId: (evt.eventId && evt.eventId.split('-')[1]) ? `T${evt.eventId.split('-')[1]}` : 'Tender Event',
            actor: evt.actor || 'Authority Admin',
            role: evt.actorRole || 'System',
            timestamp: evt.timestamp,
            txHash: evt.txHash,
            details: evt.details,
            category: getActivityCategory(evt.action)
          });
        }
      });

      // Process transactions not already in audit events
      (txData || []).forEach((tx) => {
        if (!seenTx.has(tx.txHash)) {
          combinedActivities.push({
            id: tx.txHash || `tx-${Math.random()}`,
            actionName: formatActionName(tx.action),
            rawAction: tx.action,
            tenderId: tx.tenderId || 'Tender',
            actor: tx.from ? shortHash(tx.from) : 'Contractor',
            role: 'On-Chain Ledger',
            timestamp: tx.timestamp,
            txHash: tx.txHash,
            details: `Value: ${tx.value || '0 MSTC'} • Block #${tx.blockNumber || '—'}`,
            category: getActivityCategory(tx.action)
          });
        }
      });

      // Sort descending by timestamp
      combinedActivities.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setActivities(combinedActivities);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError(err.message || 'Failed to load procurement dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered tenders for Overview Table
  const filteredTenders = tenders.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const activeTendersCount = tenders.filter((t) =>
    ['OPEN', 'SEALED', 'REVEAL', 'DRAFT'].includes(t.status)
  ).length;

  const underReviewCount = tenders.filter((t) =>
    t.status === 'FROZEN' ||
    t.status === 'ANALYZING' ||
    t.riskLevel === 'HIGH' ||
    (t.riskScore !== null && t.riskScore >= 70)
  ).length;

  const awardedCount = tenders.filter((t) => t.status === 'AWARDED').length;

  const totalProcurementValue = tenders.reduce(
    (sum, t) => sum + (Number(t.budget) || 0),
    0
  );

  const blockchainTxCount = Math.max(transactions.length, activities.length);

  // Quick Actions Widget metrics
  const latestTender = tenders && tenders.length > 0 ? tenders[0] : null;

  const avgSupplierReputation =
    suppliers.length > 0
      ? Math.round(
          suppliers.reduce(
            (acc, s) => acc + (s.reputation ?? s.avgPerformance ?? 0),
            0
          ) / suppliers.length
        )
      : null;

  const latestActivity = activities && activities.length > 0 ? activities[0] : null;

  // Risk Summary Counts
  const riskCounts = {
    low: tenders.filter(
      (t) => (t.riskScore !== null && t.riskScore <= 39) || t.riskLevel === 'LOW'
    ).length,
    medium: tenders.filter(
      (t) =>
        (t.riskScore !== null && t.riskScore >= 40 && t.riskScore <= 69) ||
        t.riskLevel === 'MEDIUM'
    ).length,
    high: tenders.filter(
      (t) =>
        (t.riskScore !== null && t.riskScore >= 70) ||
        t.riskLevel === 'HIGH' ||
        t.status === 'FROZEN'
    ).length,
    pending: tenders.filter(
      (t) =>
        (t.riskScore === null || t.riskScore === undefined) &&
        t.riskLevel !== 'LOW' &&
        t.riskLevel !== 'MEDIUM' &&
        t.riskLevel !== 'HIGH' &&
        t.status !== 'FROZEN'
    ).length
  };

  const totalRiskTenders = tenders.length || 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="pb-6 mb-6 border-b border-[#1E2A44] flex justify-between items-center">
          <div>
            <div className="h-8 w-64 bg-[#1E2A44]/60 rounded-md animate-pulse"></div>
            <div className="h-4 w-96 bg-[#1E2A44]/40 rounded-md animate-pulse mt-2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-4"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-4"></div>
          ))}
        </div>
        <div className="h-96 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Authority procurement lifecycle, contractor evaluation, and smart contract escrow management."
        />
        <Card className="border-rose-800/60 bg-rose-950/20 text-rose-200">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <h3 className="text-lg font-semibold text-white">Dashboard Service Unavailable</h3>
            <p className="mt-1 text-sm text-slate-300 max-w-md">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-medium text-sm hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry Connection
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage public procurement tenders, evaluate sealed contractor bids, oversee smart contract escrows, and monitor AI risk compliance."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            MST Chain Active
          </span>
        }
        actions={
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1E2A44] bg-[#0B1220] hover:bg-[#15213B] text-slate-300 text-sm font-medium transition-colors"
            title="Refresh dashboard data"
          >
            <RefreshCw className="w-4 h-4 text-[#FF6B4A]" />
            Refresh
          </button>
        }
      />

      {/* Quick Actions & Status Widgets */}
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-[#FF6B4A] font-semibold mb-3">
          Quick Actions & Overview Widgets
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Create Tender Widget */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-5 hover:border-[#FF6B4A]/70 hover:bg-[#15213B] transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-[#FF6B4A]/10 text-[#FF6B4A] group-hover:scale-105 transition-transform">
                  <FilePlus className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FF8A72] bg-[#FF6B4A]/10 px-2 py-0.5 rounded border border-[#FF6B4A]/20">
                  New Spec
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-white group-hover:text-[#FF8A72]">Create Tender</h3>

              {/* Compact Information Area */}
              <div className="mt-3 p-2.5 rounded-lg bg-[#0B1220] border border-[#1E2A44]/80 text-xs">
                {latestTender ? (
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between mb-0.5">
                      <span>Recent Tender</span>
                      <span className="font-mono text-[#FF8A72] font-bold">{latestTender.id}</span>
                    </div>
                    <div className="font-medium text-slate-200 truncate" title={latestTender.title}>
                      {latestTender.title}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px]">Ready to publish tender specification</div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E2A44]/60 flex items-center justify-between text-xs font-semibold">
              <Link
                to="/admin/tenders/create"
                className="inline-flex items-center gap-1.5 text-[#FF6B4A] hover:text-[#FF8A72] transition-colors"
              >
                Create Tender <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* 2. Manage Tenders Widget */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-5 hover:border-blue-500/70 hover:bg-[#15213B] transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {tenders.length} Total
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-white group-hover:text-blue-300">Manage Tenders</h3>

              {/* Compact Information Area */}
              <div className="mt-3 p-2 rounded-lg bg-[#0B1220] border border-[#1E2A44]/80 text-xs">
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Open</div>
                    <div className="font-bold text-blue-400 text-sm">{activeTendersCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Review</div>
                    <div className="font-bold text-rose-400 text-sm">{underReviewCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Awarded</div>
                    <div className="font-bold text-emerald-400 text-sm">{awardedCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E2A44]/60 flex items-center justify-between text-xs font-semibold">
              <Link
                to="/admin/tenders"
                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Tenders <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* 3. Supplier Registry Widget */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-5 hover:border-emerald-500/70 hover:bg-[#15213B] transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Verified
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-white group-hover:text-emerald-300">Supplier Registry</h3>

              {/* Compact Information Area */}
              <div className="mt-3 p-2.5 rounded-lg bg-[#0B1220] border border-[#1E2A44]/80 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Registered</div>
                    <div className="font-bold text-white text-sm">{suppliers.length} Suppliers</div>
                  </div>
                  {avgSupplierReputation !== null && (
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Avg Rep</div>
                      <div className="font-bold text-emerald-400 text-sm">{avgSupplierReputation}/100</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E2A44]/60 flex items-center justify-between text-xs font-semibold">
              <Link
                to="/suppliers"
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View Suppliers <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* 4. Audit Trail Widget */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-5 hover:border-purple-500/70 hover:bg-[#15213B] transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  On-Chain
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-white group-hover:text-purple-300">Audit Trail</h3>

              {/* Compact Information Area */}
              <div className="mt-3 p-2.5 rounded-lg bg-[#0B1220] border border-[#1E2A44]/80 text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Audit Events</span>
                  <span className="font-bold text-purple-300">{activities.length} Recorded</span>
                </div>
                {latestActivity ? (
                  <div className="text-[11px] text-slate-300 truncate pt-1 border-t border-[#1E2A44]/60" title={latestActivity.actionName}>
                    Latest: <span className="font-semibold text-white">{latestActivity.actionName}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E2A44]/60 flex items-center justify-between text-xs font-semibold">
              <Link
                to="/auditor/blockchain"
                className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors"
              >
                View Audit Trail <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-[#FF6B4A] font-semibold mb-3">
          Procurement Metrics
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Tenders</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{activeTendersCount}</div>
            <div className="mt-1 text-xs text-slate-400">In bidding or reveal phase</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Under Review</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-rose-400">{underReviewCount}</div>
            <div className="mt-1 text-xs text-slate-400">Frozen or high risk score</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Awarded</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-400">{awardedCount}</div>
            <div className="mt-1 text-xs text-slate-400">Contracts finalized</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Value</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-xl font-bold text-white truncate" title={formatINR(totalProcurementValue)}>
              {formatINR(totalProcurementValue)}
            </div>
            <div className="mt-1 text-xs text-slate-400">Cumulative budget volume</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Blockchain Logs</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-purple-300">{blockchainTxCount}</div>
            <div className="mt-1 text-xs text-slate-400">Tamper-evident events</div>
          </Card>
        </div>
      </div>

      {/* 6. Risk Summary */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E2A44]">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#FF6B4A]" />
              AI Risk Compliance Overview
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Automated collusion & anomaly monitoring across all tender proposals
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-[#0B1220] px-3 py-1.5 rounded-lg border border-[#1E2A44]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            AI Engine: Active
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-[#0B1220] border border-emerald-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-semibold uppercase">Low Risk</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                {Math.round((riskCounts.low / totalRiskTenders) * 100)}%
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{riskCounts.low}</div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${(riskCounts.low / totalRiskTenders) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1220] border border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400 font-semibold uppercase">Medium Risk</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold">
                {Math.round((riskCounts.medium / totalRiskTenders) * 100)}%
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{riskCounts.medium}</div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full"
                style={{ width: `${(riskCounts.medium / totalRiskTenders) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1220] border border-rose-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-400 font-semibold uppercase">High Risk / Frozen</span>
              <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold">
                {Math.round((riskCounts.high / totalRiskTenders) * 100)}%
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-400">{riskCounts.high}</div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-rose-500 h-1.5 rounded-full"
                style={{ width: `${(riskCounts.high / totalRiskTenders) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1220] border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase">Pending Eval</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                {Math.round((riskCounts.pending / totalRiskTenders) * 100)}%
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{riskCounts.pending}</div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-slate-500 h-1.5 rounded-full"
                style={{ width: `${(riskCounts.pending / totalRiskTenders) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid: 3. Tender Overview Table & 4. Recent Procurement Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width): 3. Tender Overview Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            header={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div>
                  <h2 className="text-lg font-semibold text-white">Tender Overview</h2>
                  <p className="text-xs text-slate-400">Live procurement tenders from official registry</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search ID or title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6B4A]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">OPEN</option>
                    <option value="SEALED">SEALED</option>
                    <option value="REVEAL">REVEAL</option>
                    <option value="AWARDED">AWARDED</option>
                    <option value="FROZEN">FROZEN</option>
                  </select>
                </div>
              </div>
            }
          >
            {filteredTenders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-medium">No tenders found matching criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 -my-6">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="bg-[#0E1626] text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-[#1E2A44]">
                    <tr>
                      <th className="py-3.5 px-6">Tender ID</th>
                      <th className="py-3.5 px-4">Title & Dept</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">Bids</th>
                      <th className="py-3.5 px-4">Risk</th>
                      <th className="py-3.5 px-4">Winner</th>
                      <th className="py-3.5 px-4 text-right">Value</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2A44]">
                    {filteredTenders.map((tender) => (
                      <tr key={tender.id} className="hover:bg-[#15213B]/50 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs font-bold text-[#FF8A72]">
                          <Link to={`/admin/tenders/${tender.id}`} className="hover:underline">
                            {tender.id}
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white text-sm line-clamp-1">{tender.title}</div>
                          <div className="text-xs text-slate-400 line-clamp-1">{tender.department}</div>
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={tender.status} size="xs" />
                        </td>
                        <td className="py-4 px-4 text-center font-medium text-slate-200">
                          {tender.bidCount || 0}
                        </td>
                        <td className="py-4 px-4">
                          {getRiskBadge(tender)}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-300 max-w-[140px] truncate">
                          {tender.contractAwardee || (tender.winnerSupplierId ? `Supplier ${tender.winnerSupplierId}` : '—')}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-white text-xs">
                          {formatINR(tender.budget)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            to={`/admin/tenders/${tender.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
                          >
                            View <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1/3 width): 4. Recent Procurement Activity */}
        <div className="space-y-4">
          <Card
            header={
              <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                  <p className="text-xs text-slate-400">On-chain procurement events</p>
                </div>
                <Activity className="w-5 h-5 text-[#FF6B4A]" />
              </div>
            }
          >
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent procurement activity recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 7).map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl border border-[#1E2A44] bg-[#0B1220] hover:border-[#1E2A44]/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#111A2E]">
                          {getActivityIcon(act.category)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{act.actionName}</div>
                          <div className="text-[11px] text-[#FF8A72] font-mono">{act.tenderId}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(act.timestamp)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">{act.details}</p>

                    <div className="mt-2.5 pt-2 border-t border-[#1E2A44]/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Actor: <strong className="text-slate-200">{act.actor}</strong></span>
                      {act.txHash && (
                        <span className="font-mono bg-[#111A2E] px-1.5 py-0.5 rounded border border-[#1E2A44] text-slate-400" title={act.txHash}>
                          {shortHash(act.txHash)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
