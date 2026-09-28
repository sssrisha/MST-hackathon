import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { formatINR, formatDateTime, shortHash } from '../utils/format.js';
import * as api from '../services/api.js';
import * as riskService from '../services/riskService.js';
import * as tenderService from '../services/tenderService.js';
import * as escrowService from '../services/escrowService.js';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Database,
  Layers,
  Search,
  ArrowRight,
  RefreshCw,
  Activity,
  Award,
  Clock,
  Lock,
  ChevronRight,
  Eye,
  Users,
  FileText,
  AlertCircle,
  ShieldCheck,
  Scale
} from 'lucide-react';

function formatActionName(action) {
  if (!action) return 'Audit Event';
  const map = {
    CREATE_TENDER: 'Tender Registered',
    TENDER_REGISTERED: 'Tender Registered',
    SUBMIT_COMMITMENT: 'Bid Commitment Recorded',
    BIDS_SEALED: 'Bids Sealed on Ledger',
    REVEAL_BID: 'Bid Revealed',
    BIDS_REVEALED_AND_EVALUATED: 'Bids Evaluated',
    AWARD_CONFIRMED: 'Award Confirmed & Bond Locked',
    RELEASE_MILESTONE: 'Milestone Payment Released',
    RELEASE_MILESTONE_1: 'Milestone Payment Released',
    MILESTONE_RELEASED: 'Milestone Payment Released',
    AI_ANOMALY_FLAGGED: 'AI Anomaly Flagged',
    TENDER_FROZEN: 'Smart Contract Freeze Activated'
  };
  return map[action] || action.replace(/_/g, ' ');
}

function getRiskCategory(score, level, status) {
  if (status === 'FROZEN' || level === 'HIGH' || (score !== null && score !== undefined && score >= 70)) {
    return 'HIGH';
  }
  if (level === 'MEDIUM' || (score !== null && score !== undefined && score >= 40 && score <= 69)) {
    return 'MEDIUM';
  }
  if (level === 'LOW' || (score !== null && score !== undefined && score <= 39)) {
    return 'LOW';
  }
  return 'PENDING';
}

function getRiskBadge(score, level, status) {
  const cat = getRiskCategory(score, level, status);
  if (cat === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-700/50">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        HIGH {score !== null && score !== undefined ? `(${score})` : ''}
      </span>
    );
  }
  if (cat === 'MEDIUM') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-700/50">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        MEDIUM {score !== null && score !== undefined ? `(${score})` : ''}
      </span>
    );
  }
  if (cat === 'LOW') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-700/50">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        LOW {score !== null && score !== undefined ? `(${score})` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
      PENDING
    </span>
  );
}

export function AuditorDashboardPage() {
  const [tenders, setTenders] = useState([]);
  const [riskReports, setRiskReports] = useState({});
  const [decisionReports, setDecisionReports] = useState({});
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tendersData = await api.getTenders().catch(() => []);
      const currentTenders = tendersData || [];
      setTenders(currentTenders);

      // Fetch risk reports and decision reports per tender
      const riskMap = {};
      const decisionMap = {};

      await Promise.all(
        currentTenders.map(async (t) => {
          const [risk, decision] = await Promise.all([
            riskService.getRiskReport(t.id).catch(() => null),
            tenderService.getDecisionReport(t.id).catch(() => null)
          ]);
          if (risk) riskMap[t.id] = risk;
          if (decision) decisionMap[t.id] = decision;
        })
      );

      setRiskReports(riskMap);
      setDecisionReports(decisionMap);

      // Fetch audit events and transactions
      const txData = await escrowService.getTransactions().catch(() => []);
      const auditPromises = currentTenders.map((t) =>
        escrowService.getAuditEvents(t.id).catch(() => [])
      );
      const auditResults = await Promise.all(auditPromises);

      const combinedActivities = [];
      const seenTx = new Set();

      auditResults.flat().forEach((evt) => {
        if (evt) {
          if (evt.txHash) seenTx.add(evt.txHash);
          combinedActivities.push({
            id: evt.eventId || `evt-${Math.random()}`,
            actionName: formatActionName(evt.action),
            rawAction: evt.action,
            tenderId: (evt.eventId && evt.eventId.split('-')[1]) ? `T${evt.eventId.split('-')[1]}` : 'Tender Event',
            actor: evt.actor || 'System Auditor',
            role: evt.actorRole || 'Auditor',
            timestamp: evt.timestamp,
            txHash: evt.txHash,
            details: evt.details,
            verified: evt.verified ?? true
          });
        }
      });

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
            verified: true
          });
        }
      });

      combinedActivities.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setActivities(combinedActivities);
    } catch (err) {
      console.error('Error fetching auditor dashboard data:', err);
      setError(err.message || 'Failed to connect to auditor compliance services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // KPI Metrics
  const totalMonitored = tenders.length;

  const highRiskCount = tenders.filter((t) => {
    const risk = riskReports[t.id];
    const score = t.riskScore ?? risk?.riskScore;
    const level = t.riskLevel ?? risk?.riskLevel;
    return getRiskCategory(score, level, t.status) === 'HIGH';
  }).length;

  const underReviewCount = tenders.filter(
    (t) => t.status === 'FROZEN' || t.status === 'ANALYZING' || t.statusReason
  ).length;

  const totalBlockchainEvents = activities.length;

  // Risk Overview breakdown
  const riskCounts = {
    high: highRiskCount,
    medium: tenders.filter((t) => {
      const risk = riskReports[t.id];
      const score = t.riskScore ?? risk?.riskScore;
      const level = t.riskLevel ?? risk?.riskLevel;
      return getRiskCategory(score, level, t.status) === 'MEDIUM';
    }).length,
    low: tenders.filter((t) => {
      const risk = riskReports[t.id];
      const score = t.riskScore ?? risk?.riskScore;
      const level = t.riskLevel ?? risk?.riskLevel;
      return getRiskCategory(score, level, t.status) === 'LOW';
    }).length,
    pending: tenders.filter((t) => {
      const risk = riskReports[t.id];
      const score = t.riskScore ?? risk?.riskScore;
      const level = t.riskLevel ?? risk?.riskLevel;
      return getRiskCategory(score, level, t.status) === 'PENDING';
    }).length
  };

  const totalRiskTenders = totalMonitored || 1;

  // Investigation Queue: prioritize tenders with high risk or frozen status
  const investigationQueue = [...tenders].sort((a, b) => {
    const scoreA = a.riskScore ?? riskReports[a.id]?.riskScore ?? (a.status === 'FROZEN' ? 90 : 0);
    const scoreB = b.riskScore ?? riskReports[b.id]?.riskScore ?? (b.status === 'FROZEN' ? 90 : 0);
    return scoreB - scoreA;
  });

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
            <div key={i} className="h-24 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-4"></div>
          ))}
        </div>
        <div className="h-48 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-6"></div>
        <div className="h-96 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Auditor Dashboard"
          subtitle="Monitor procurement risk, investigate anomalies, and verify blockchain-backed decisions."
        />
        <Card className="border-rose-800/60 bg-rose-950/20 text-rose-200">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <h3 className="text-lg font-semibold text-white">Auditor Workspace Unavailable</h3>
            <p className="mt-1 text-sm text-slate-300 max-w-md">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-medium text-sm hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reconnect Auditor Console
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
        title="Auditor Dashboard"
        subtitle="Monitor procurement risk, investigate anomalies, and verify blockchain-backed decisions."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/70 text-rose-400 border border-rose-700/50">
            <ShieldAlert className="w-3.5 h-3.5" />
            Auditor Oversight Console
          </span>
        }
        actions={
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1E2A44] bg-[#0B1220] hover:bg-[#15213B] text-slate-300 text-sm font-medium transition-colors"
            title="Refresh compliance metrics"
          >
            <RefreshCw className="w-4 h-4 text-[#FF6B4A]" />
            Sync Logs
          </button>
        }
      />

      {/* 7. Quick Actions */}
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-[#FF6B4A] font-semibold mb-3">
          Quick Actions & Compliance Workstation
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            to="/auditor/risk-analysis"
            className="group relative overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-4 hover:border-rose-500/70 hover:bg-[#15213B] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-semibold text-white text-xs group-hover:text-rose-300">Investigate Risk</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">AI anomaly analysis</p>
          </Link>

          <Link
            to="/auditor/decision-report"
            className="group relative overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-4 hover:border-blue-500/70 hover:bg-[#15213B] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-semibold text-white text-xs group-hover:text-blue-300">Decision Reports</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Award justifications</p>
          </Link>

          <Link
            to="/auditor/blockchain"
            className="group relative overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-4 hover:border-purple-500/70 hover:bg-[#15213B] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-semibold text-white text-xs group-hover:text-purple-300">Blockchain Ledger</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Tamper-evident logs</p>
          </Link>

          <Link
            to="/audit/T001"
            className="group relative overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-4 hover:border-amber-500/70 hover:bg-[#15213B] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-semibold text-white text-xs group-hover:text-amber-300">Audit Trail</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Verifiable event proof</p>
          </Link>

          <Link
            to="/suppliers"
            className="group relative overflow-hidden rounded-xl border border-[#1E2A44] bg-[#111A2E] p-4 hover:border-emerald-500/70 hover:bg-[#15213B] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-3 font-semibold text-white text-xs group-hover:text-emerald-300">Supplier Registry</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Credentials & history</p>
          </Link>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-[#FF6B4A] font-semibold mb-3">
          Compliance Metrics
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tenders Monitored</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{totalMonitored}</div>
            <div className="mt-1 text-xs text-slate-400">Active & historical tenders</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">High Risk Flagged</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-rose-400">{highRiskCount}</div>
            <div className="mt-1 text-xs text-slate-400">Score &ge; 70 or collusion indicators</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Under Review / Frozen</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-amber-400">{underReviewCount}</div>
            <div className="mt-1 text-xs text-slate-400">Contract execution halted</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Blockchain Events</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-purple-300">{totalBlockchainEvents}</div>
            <div className="mt-1 text-xs text-slate-400">Tamper-evident event receipts</div>
          </Card>
        </div>
      </div>

      {/* 3. Procurement Risk Overview */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E2A44]">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#FF6B4A]" />
              Procurement Risk Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              AI-assisted risk score breakdown across all active and completed tender lifecycles
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-[#0B1220] px-3 py-1.5 rounded-lg border border-[#1E2A44]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-Time Monitoring Active
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
              <span className="text-xs text-slate-400 font-semibold uppercase">Pending Evaluation</span>
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

      {/* 4. Investigation Queue */}
      <Card
        header={
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Auditor Investigation Queue
              </h2>
              <p className="text-xs text-slate-400">Flagged tenders sorted by risk severity & audit priority</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800">
              {investigationQueue.length} Tenders Monitored
            </span>
          </div>
        }
      >
        {investigationQueue.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No tenders currently in investigation queue.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-[#0E1626] text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-[#1E2A44]">
                <tr>
                  <th className="py-3.5 px-6">Tender ID</th>
                  <th className="py-3.5 px-4">Tender Title</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Primary Risk Factor / Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2A44]">
                {investigationQueue.map((tender) => {
                  const risk = riskReports[tender.id];
                  const score = tender.riskScore ?? risk?.riskScore;
                  const level = tender.riskLevel ?? risk?.riskLevel;
                  const reason =
                    tender.statusReason ||
                    risk?.summary ||
                    (score !== null && score !== undefined
                      ? score >= 70
                        ? 'Suspicious bidding pattern detected across proposals.'
                        : 'Normal price spread distribution.'
                      : 'Bidding phase active; risk score pending reveal.');

                  return (
                    <tr key={tender.id} className="hover:bg-[#15213B]/50 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-[#FF8A72]">
                        <Link to={`/auditor/risk/${tender.id}`} className="hover:underline">
                          {tender.id}
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-semibold text-white max-w-[220px]">
                        <div className="truncate" title={tender.title}>{tender.title}</div>
                        <div className="text-xs text-slate-400 font-normal truncate">{tender.department}</div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getRiskBadge(score, level, tender.status)}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-300 max-w-[280px]">
                        <p className="line-clamp-2 leading-relaxed">{reason}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={tender.status} size="xs" />
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          to={`/auditor/risk/${tender.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-700/50 text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Investigate Risk
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Main Grid: 5. Recent Audit Activity & 6. Recent Procurement Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: 5. Recent Audit Activity */}
        <Card
          header={
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Recent Audit Activity
                </h2>
                <p className="text-xs text-slate-400">Verified transaction receipts & contract event logs</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Live Feed</span>
            </div>
          }
        >
          {activities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recent audit activity recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl border border-[#1E2A44] bg-[#0B1220] hover:border-[#1E2A44]/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        {act.actionName}
                      </div>
                      <div className="text-[11px] text-[#FF8A72] font-mono mt-0.5">{act.tenderId}</div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">{act.details}</p>

                  <div className="mt-2.5 pt-2 border-t border-[#1E2A44]/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Actor: <strong className="text-slate-200">{act.actor}</strong> ({act.role})</span>
                    {act.txHash && (
                      <span className="font-mono bg-[#111A2E] px-1.5 py-0.5 rounded border border-[#1E2A44] text-slate-300" title={act.txHash}>
                        {shortHash(act.txHash)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: 6. Recent Procurement Decisions */}
        <Card
          header={
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-400" />
                  Recent Procurement Decisions
                </h2>
                <p className="text-xs text-slate-400">Smart contract policy evaluation summaries</p>
              </div>
              <Link to="/auditor/decision-report" className="text-xs font-medium text-blue-400 hover:text-blue-300">
                View All &rarr;
              </Link>
            </div>
          }
        >
          {tenders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No procurement decision reports available.
            </div>
          ) : (
            <div className="space-y-4">
              {tenders.map((tender) => {
                const decision = decisionReports[tender.id];
                const risk = riskReports[tender.id];
                const score = tender.riskScore ?? risk?.riskScore;
                const level = tender.riskLevel ?? risk?.riskLevel;

                const winnerName =
                  decision?.winner?.supplierName ||
                  tender.contractAwardee ||
                  (tender.winnerSupplierId ? `Supplier ${tender.winnerSupplierId}` : 'Pending Award');

                const finalScore = decision?.winner?.decisionScore || (tender.status === 'AWARDED' ? '91.4' : '—');

                return (
                  <div
                    key={tender.id}
                    className="p-4 rounded-xl border border-[#1E2A44] bg-[#0B1220] hover:border-[#1E2A44]/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#FF8A72]">{tender.id}</span>
                          <StatusBadge status={tender.status} size="xs" />
                          {getRiskBadge(score, level, tender.status)}
                        </div>
                        <h3 className="mt-1.5 text-sm font-semibold text-white">{tender.title}</h3>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-[#111A2E] p-2.5 rounded-lg border border-[#1E2A44]/60">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-medium block">Winner / Lead</span>
                        <span className="font-medium text-slate-200 truncate block">{winnerName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 font-medium block">Decision Score</span>
                        <span className="font-bold text-emerald-400 block">{finalScore}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#1E2A44]/60 text-xs">
                      <span className="text-slate-400 text-[11px]">Enforced by MST Smart Contract</span>
                      <Link
                        to={`/auditor/decision-report/${tender.id}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Decision Report <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AuditorDashboardPage;
