import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { formatINR, formatDateTime } from '../utils/format.js';
import * as api from '../services/api.js';
import {
  FilePlus,
  Search,
  Filter,
  ArrowUpDown,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Layers
} from 'lucide-react';

function formatDateSimple(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    return isoString;
  }
}

function getRiskBadge(tender) {
  if (tender.status === 'FROZEN' || tender.riskLevel === 'HIGH' || (tender.riskScore !== null && tender.riskScore >= 70)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-700/50">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        HIGH {tender.riskScore !== null ? `(${tender.riskScore})` : ''}
      </span>
    );
  }
  if (tender.riskLevel === 'MEDIUM' || (tender.riskScore !== null && tender.riskScore >= 40 && tender.riskScore <= 69)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-700/50">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        MEDIUM {tender.riskScore !== null ? `(${tender.riskScore})` : ''}
      </span>
    );
  }
  if (tender.riskLevel === 'LOW' || (tender.riskScore !== null && tender.riskScore <= 39)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-700/50">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        LOW {tender.riskScore !== null ? `(${tender.riskScore})` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
      PENDING
    </span>
  );
}

export function AdminTendersPage() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  const fetchTenders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTenders();
      setTenders(data || []);
    } catch (err) {
      console.error('Error loading tenders:', err);
      setError(err.message || 'Failed to fetch tender management records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const filteredAndSortedTenders = tenders
    .filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

      let matchesRisk = true;
      if (riskFilter === 'HIGH') {
        matchesRisk = t.status === 'FROZEN' || t.riskLevel === 'HIGH' || (t.riskScore !== null && t.riskScore >= 70);
      } else if (riskFilter === 'MEDIUM') {
        matchesRisk = t.riskLevel === 'MEDIUM' || (t.riskScore !== null && t.riskScore >= 40 && t.riskScore <= 69);
      } else if (riskFilter === 'LOW') {
        matchesRisk = t.riskLevel === 'LOW' || (t.riskScore !== null && t.riskScore <= 39);
      } else if (riskFilter === 'PENDING') {
        matchesRisk = (t.riskScore === null || t.riskScore === undefined) && t.riskLevel !== 'LOW' && t.riskLevel !== 'MEDIUM' && t.riskLevel !== 'HIGH';
      }

      return matchesSearch && matchesStatus && matchesRisk;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'value-desc') {
        return (Number(b.budget) || 0) - (Number(a.budget) || 0);
      }
      if (sortBy === 'value-asc') {
        return (Number(a.budget) || 0) - (Number(b.budget) || 0);
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Manage Tenders"
        subtitle="Comprehensive procurement workspace to publish, evaluate, track, and audit public tender proposals."
        actions={
          <Link
            to="/admin/tenders/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6B4A] hover:bg-[#FF8A72] text-white font-semibold text-xs transition-colors shadow-lg shadow-[#FF6B4A]/20"
          >
            <FilePlus className="w-4 h-4" />
            + Create Tender
          </Link>
        }
      />

      {/* Filter and Control Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Tender ID, title, department, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-[#FF6B4A]" />
              <span>Filter:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="SEALED">SEALED</option>
              <option value="REVEAL">REVEAL</option>
              <option value="AWARDED">AWARDED</option>
              <option value="FROZEN">FROZEN</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk / Frozen</option>
              <option value="PENDING">Pending Risk Eval</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
              <span>Sort:</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 focus:outline-none focus:border-[#FF6B4A]"
            >
              <option value="newest">Newest First</option>
              <option value="value-desc">Highest Budget</option>
              <option value="value-asc">Lowest Budget</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="h-64 rounded-xl border border-[#1E2A44] bg-[#111A2E] animate-pulse p-6"></div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card className="border-rose-800/60 bg-rose-950/20 text-rose-200 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
            <h3 className="text-base font-semibold text-white">Error Loading Tenders</h3>
            <p className="mt-1 text-xs text-slate-300">{error}</p>
            <button
              onClick={fetchTenders}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAndSortedTenders.length === 0 && (
        <Card className="p-12 text-center text-slate-400">
          <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No Tenders Found</h3>
          <p className="mt-1 text-xs text-slate-400">No procurement notices match your active search or filter options.</p>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setRiskFilter('ALL'); }}
            className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-200 font-semibold text-xs hover:bg-[#15213B] transition-colors"
          >
            Clear Filters
          </button>
        </Card>
      )}

      {/* Tender Table */}
      {!loading && !error && filteredAndSortedTenders.length > 0 && (
        <Card>
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#0E1626] text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-[#1E2A44]">
                <tr>
                  <th className="py-3.5 px-6">Tender ID</th>
                  <th className="py-3.5 px-4">Title & Dept</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 text-right">Budget</th>
                  <th className="py-3.5 px-4">Deadline</th>
                  <th className="py-3.5 px-4 text-center">Bids</th>
                  <th className="py-3.5 px-4">Risk</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Winner</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2A44]">
                {filteredAndSortedTenders.map((tender) => (
                  <tr key={tender.id} className="hover:bg-[#15213B]/50 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-[#FF8A72]">
                      <Link to={`/admin/tenders/${tender.id}`} className="hover:underline">
                        {tender.id}
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white text-xs line-clamp-1">{tender.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{tender.department || 'Infrastructure'}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {tender.location || 'Bengaluru'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-white">
                      {formatINR(tender.budget)}
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                        {formatDateSimple(tender.deadline)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-slate-200">
                      {tender.bidCount || 0}
                    </td>
                    <td className="py-4 px-4">
                      {getRiskBadge(tender)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={tender.status} size="xs" />
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-300 max-w-[130px] truncate">
                      {tender.contractAwardee || (tender.winnerSupplierId ? `Supplier ${tender.winnerSupplierId}` : '—')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/tenders/${tender.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition-colors"
                          title="View tender overview"
                        >
                          <Eye className="w-3 h-3" /> View
                        </Link>
                        <Link
                          to={`/audit/${tender.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold transition-colors"
                          title="View immutable audit trail"
                        >
                          <ShieldCheck className="w-3 h-3" /> Audit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AdminTendersPage;
