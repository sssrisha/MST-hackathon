import React, { useState } from 'react';
import { ArrowRightLeft, RotateCcw } from 'lucide-react';
import { resetAll, getAllTenders, getStorageKey, setStorageValue } from '../../services/mockDb.js';

export function DemoControls() {
  const [selectedTender, setSelectedTender] = useState('T003');
  const [notice, setNotice] = useState('');

  const tenders = getAllTenders();

  const advanceTenderPhase = () => {
    const allTenders = getAllTenders();
    const index = allTenders.findIndex((item) => item.id === selectedTender);
    if (index === -1) {
      setNotice('No tender selected');
      return;
    }

    const current = allTenders[index];
    const nextStatus = current.status === 'OPEN' ? 'SEALED' : current.status === 'SEALED' ? 'REVEAL' : 'OPEN';
    const updated = [...allTenders];
    updated[index] = { ...current, status: nextStatus, phase: nextStatus };
    setStorageValue('tg.v1.tenders', updated);
    setNotice(`Tender ${selectedTender} moved to ${nextStatus}.`);
  };

  const handleReset = () => {
    resetAll();
    setNotice('Demo data reset.');
  };

  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-[#1E2A44] bg-[#0E1626]/70 p-2 text-xs text-slate-300">
      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
        DEMO ONLY
      </span>
      <select
        value={selectedTender}
        onChange={(event) => setSelectedTender(event.target.value)}
        className="rounded border border-[#1E2A44] bg-[#111A2E] px-2 py-1 text-slate-200"
        aria-label="Choose tender to advance"
      >
        {tenders.map((tender) => (
          <option key={tender.id} value={tender.id}>{tender.id}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={advanceTenderPhase}
        className="inline-flex items-center gap-1 rounded bg-[#FF4B3E] px-2 py-1 text-white hover:bg-[#FF6B4A]"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Advance tender phase
      </button>
      <button
        type="button"
        onClick={handleReset}
        className="inline-flex items-center gap-1 rounded border border-[#1E2A44] bg-[#111A2E] px-2 py-1 text-slate-300 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset demo data
      </button>
      {notice ? <span className="text-[10px] text-amber-300">{notice}</span> : null}
    </div>
  );
}

export default DemoControls;
