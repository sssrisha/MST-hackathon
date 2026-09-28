import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import * as tenderService from '../services/tenderService.js';
import { formatINR } from '../utils/format.js';

export function ContractorTendersPage() {
  const [tenders, setTenders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    tenderService.getOpenTendersForContractor().then((items) => setTenders(items));
  }, []);

  const filteredTenders = tenders.filter((tender) => {
    const matchesSearch = !search || tender.title.toLowerCase().includes(search.toLowerCase()) || tender.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || tender.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-blue-400 font-semibold">Browse Tenders</div>
          <h1 className="mt-2 text-3xl font-bold text-white">Open procurement opportunities</h1>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-[1.6fr_0.8fr]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tender or ID" className="rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-[#1E2A44] bg-[#0B1220] px-3 py-3 text-slate-100">
            <option value="ALL">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="SEALED">SEALED</option>
            <option value="REVEAL">REVEAL</option>
            <option value="FROZEN">FROZEN</option>
          </select>
        </div>
      </Card>

      <div className="space-y-4">
        {filteredTenders.map((tender) => (
          <Card key={tender.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-blue-300">{tender.id}</span>
                  <StatusBadge status={tender.status} />
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white">{tender.title}</h2>
                <div className="mt-2 text-sm text-slate-400">{tender.department} • {tender.location || 'Bengaluru'}</div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm text-slate-300">
                <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Budget</div><div className="mt-1 font-medium text-white">{formatINR(tender.budget)}</div></div>
                <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Risk</div><div className="mt-1 font-medium text-white">{tender.riskLevel || 'PENDING'}</div></div>
                <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Bids sealed</div><div className="mt-1 font-medium text-white">{tender.sealedBidCount || 0}</div></div>
              </div>
              <div className="flex gap-2">
                <Link to={`/contractor/tenders/${tender.id}`} className="rounded-lg border border-[#1E2A44] bg-[#0B1220] px-3 py-2 text-sm font-medium text-slate-200">View Tender</Link>
                <Link to={`/contractor/tenders/${tender.id}/submit`} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">Submit Bid</Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ContractorTendersPage;
