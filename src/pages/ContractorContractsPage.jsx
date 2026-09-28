import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card.jsx';
import MilestoneCard from '../components/ui/MilestoneCard.jsx';
import * as contractorService from '../services/contractorService.js';
import { getMilestones } from '../services/escrowService.js';

export function ContractorContractsPage() {
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await contractorService.getActiveContracts();
      setContracts(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-blue-400 font-semibold">Active Contracts</div>
        <h1 className="mt-2 text-3xl font-bold text-white">Contract performance</h1>
      </div>

      {contracts.length === 0 ? (
        <Card><p className="text-slate-300">No active contracts yet. Once a tender is awarded, the contract lifecycle will appear here.</p></Card>
      ) : (
        contracts.map(async (contract) => {
          const milestones = await getMilestones(contract.id || contract.tenderId);
          return (
            <div key={contract.id || contract.tenderId} className="space-y-4">
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-blue-300">{contract.id || contract.tenderId}</div>
                    <h3 className="mt-1 text-xl font-semibold text-white">{contract.title}</h3>
                  </div>
                  <span className="rounded-full border border-blue-800 bg-blue-950/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-blue-300">{contract.status}</span>
                </div>
              </Card>
              {milestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

export default ContractorContractsPage;
