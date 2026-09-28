import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import * as tenderService from '../services/tenderService.js';
import { formatINR, formatDateTime } from '../utils/format.js';

export function TenderDetailsPage() {
  const { id } = useParams();
  const [tender, setTender] = useState(null);

  useEffect(() => {
    tenderService.getTenderForContractor(id).then((item) => setTender(item));
  }, [id]);

  if (!tender) return <div className="text-slate-300">Loading tender details...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-blue-400 font-semibold">{tender.id}</div>
          <h1 className="mt-2 text-3xl font-bold text-white">{tender.title}</h1>
        </div>
        <StatusBadge status={tender.status || 'OPEN'} />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-6">
        <Card>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-slate-300">
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Budget</div><div className="mt-1 text-lg font-semibold text-white">{formatINR(tender.budget)}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Department</div><div className="mt-1 text-lg font-semibold text-white">{tender.department}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Location</div><div className="mt-1 text-lg font-semibold text-white">{tender.location || 'Bengaluru'}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Deadline</div><div className="mt-1 text-lg font-semibold text-white">{formatDateTime(tender.deadline)}</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Bid Deposit</div><div className="mt-1 text-lg font-semibold text-white">{tender.bidDeposit || 10} MSTC</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Performance Bond</div><div className="mt-1 text-lg font-semibold text-white">{tender.performanceBond || 50} MSTC</div></div>
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-300">{tender.description}</p>
        </Card>

        <Card>
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Risk</div>
          <div className="mt-2 text-3xl font-bold text-white">{tender.riskLevel || 'PENDING'}</div>
          <div className="mt-4 rounded-xl border border-[#1E2A44] bg-[#0B1220] p-3 text-sm text-slate-300">N bids sealed. Competitor prices hidden.</div>
          <Link to={`/contractor/tenders/${id}/submit`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">Submit Sealed Bid</Link>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Milestones</h2>
        <div className="grid gap-3">
          {(tender.milestones || []).map((milestone) => (
            <div key={milestone.id} className="rounded-xl border border-[#1E2A44] bg-[#0B1220] p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{milestone.title}</div>
                <div className="text-xs text-slate-400">{milestone.description || 'Milestone delivery'}</div>
              </div>
              <div className="text-sm font-medium text-blue-300">{milestone.amount || 0} MSTC</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default TenderDetailsPage;
