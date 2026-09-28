import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import * as contractorService from '../services/contractorService.js';
import { formatINR } from '../utils/format.js';

export function ContractorBidsPage() {
  const [bids, setBids] = useState([]);

  useEffect(() => {
    contractorService.getMyBids().then((items) => setBids(items));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-blue-400 font-semibold">My Bids</div>
        <h1 className="mt-2 text-3xl font-bold text-white">Submitted and revealed bids</h1>
      </div>

      {bids.length === 0 ? (
        <Card><p className="text-slate-300">No bids yet. Start by browsing tenders and submitting a sealed commitment.</p></Card>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => (
            <Card key={bid.bidId}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-medium text-blue-300">{bid.bidId}</span><StatusBadge status={bid.status === 'COMMITTED' ? 'OPEN' : bid.status} /></div>
                  <h2 className="mt-2 text-xl font-semibold text-white">{bid.tenderTitle || bid.tenderId}</h2>
                  <div className="mt-2 text-sm text-slate-400">Submitted: {new Date(bid.submittedAt).toLocaleString()}</div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-300">
                  <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Bid</div><div className="mt-1 font-medium text-white">{bid.amount ? formatINR(bid.amount) : 'SEALED 🔒'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Commitment</div><div className="mt-1 font-medium text-white">{bid.status}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Reveal</div><div className="mt-1 font-medium text-white">{bid.status === 'COMMITTED' ? 'Open' : 'Verified'}</div></div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/contractor/tenders/${bid.tenderId}`} className="rounded-lg border border-[#1E2A44] bg-[#0B1220] px-3 py-2 text-sm font-medium text-slate-200">View Tender</Link>
                  {bid.status === 'COMMITTED' && <Link to={`/contractor/bids/${bid.bidId}/reveal`} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">Reveal</Link>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContractorBidsPage;
