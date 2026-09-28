import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { getBlockchainHealth, getTenderSummary } from '../services/api.js';

const zeroAddress = '0x0000000000000000000000000000000000000000';
const weiPerEth = 1_000_000_000_000_000_000n;

function formatEth(value) {
  if (value === null || value === undefined || !/^\d+$/.test(String(value))) return '—';
  const amount = BigInt(value);
  const whole = amount / weiPerEth;
  const cents = (amount % weiPerEth) * 100n / weiPerEth;
  return `${whole}.${cents.toString().padStart(2, '0')} ETH`;
}

function formatScore(value) {
  return value === null || value === undefined ? '—' : `${value}/100`;
}

function Metric({ label, value, detail, accent = 'text-white' }) {
  return (
    <div className="min-w-0 border-l-2 border-[#2E3C5C] pl-4 py-1">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums break-words ${accent}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

function StateBadge({ value }) {
  const color = value === 'AWARDED' || value === 'COMPLETED' || value === 'PAID'
    ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300'
    : value === 'FROZEN' || value === 'FAILED'
      ? 'border-rose-700/60 bg-rose-950/40 text-rose-300'
      : 'border-blue-700/60 bg-blue-950/40 text-blue-300';
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${color}`}>{value || 'UNKNOWN'}</span>;
}

function SectionHeading({ icon: Icon, title, detail }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md border border-[#263550] bg-[#0B1220] p-2 text-blue-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">{title}</h2>
        {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
      </div>
    </div>
  );
}

export function TenderDetailsPage() {
  const { id } = useParams();
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState({ loading: true, error: '', summary: null, health: null });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: '', summary: null, health: null });

    Promise.all([getTenderSummary(id), getBlockchainHealth()])
      .then(([summary, health]) => {
        if (!health.connected) throw new Error('Blockchain backend unavailable');
        if (!summary?.tender?.exists) throw new Error(`Tender ${id} is not available on-chain.`);
        if (active) setState({ loading: false, error: '', summary, health });
      })
      .catch((error) => {
        if (active) setState({
          loading: false,
          error: error?.message || 'Unable to connect to the local blockchain backend.',
          summary: null,
          health: null,
        });
      });

    return () => { active = false; };
  }, [id, retryCount]);

  if (state.loading) {
    return (
      <div className="space-y-5" aria-live="polite">
        <div className="h-7 w-64 animate-pulse rounded bg-[#1E2A44]" />
        <p className="text-sm text-slate-400">Loading blockchain procurement data...</p>
        <div className="h-40 animate-pulse rounded-lg border border-[#1E2A44] bg-[#111A2E]" />
      </div>
    );
  }

  if (state.error || !state.summary) {
    return (
      <Card className="max-w-2xl">
        <div className="flex gap-4" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-semibold text-white">Blockchain backend unavailable</h1>
            <p className="mt-2 text-sm text-slate-400">
              {state.error || 'Unable to connect to the local blockchain backend.'}
            </p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#2E3C5C] bg-[#17243A] px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:bg-[#1E2A44] focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      </Card>
    );
  }

  const { tender, evaluation, risk, escrow, milestones, supplier, blockchain } = state.summary;
  const hasWinner = tender.winner && tender.winner.toLowerCase() !== zeroAddress;
  const winnerBid = evaluation.bids.find((bid) => bid.bidder.toLowerCase() === tender.winner?.toLowerCase());
  const healthEntries = Object.entries(blockchain.contracts);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={tender.title}
        subtitle={`Tender ${tender.id} · Procurement execution and supplier state from the local blockchain`}
        badge={<StateBadge value={tender.status} />}
      />

      <section aria-label="Tender award summary" className="grid gap-5 rounded-lg border border-[#1E2A44] bg-[#111A2E] p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tender ID" value={tender.id} detail={`Budget ${formatEth(tender.budget)}`} accent="text-blue-200" />
        <Metric label="Winning supplier" value={hasWinner ? `${tender.winner.slice(0, 8)}…${tender.winner.slice(-6)}` : 'Not awarded'} detail={hasWinner ? tender.winner : undefined} accent="text-white" />
        <Metric label="Winning bid" value={formatEth(tender.winningBid)} accent="text-emerald-300" />
        <Metric label="Final score" value={winnerBid ? formatScore(winnerBid.finalScore) : '—'} detail="Deterministic procurement score" accent="text-amber-300" />
      </section>

      <section aria-labelledby="execution-title" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-300">
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="execution-title" className="text-base font-semibold text-white">Blockchain execution</h2>
            <p className="text-sm text-slate-400">On-chain procurement funding and supplier obligations</p>
          </div>
        </div>
        <div className="grid gap-5 rounded-lg border border-[#1E2A44] bg-[#111A2E] p-5 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Escrow" value={formatEth(escrow.amount)} detail={escrow.funded ? 'Funded' : 'Not funded'} accent="text-white" />
          <Metric label="Amount paid" value={formatEth(escrow.amountPaid)} accent="text-emerald-300" />
          <Metric label="Remaining balance" value={formatEth(escrow.remainingBalance)} accent="text-blue-200" />
          <Metric label="Performance bond" value={formatEth(escrow.performanceBond)} detail={escrow.bondDeposited ? 'Deposited' : 'Not deposited'} accent="text-white" />
          <Metric label="Bond status" value={escrow.bondReleased ? 'Released' : escrow.bondDeposited ? 'Deposited · not released' : 'Not deposited'} accent={escrow.bondReleased ? 'text-emerald-300' : 'text-amber-300'} />
          <Metric label="Supplier reputation" value={supplier ? formatScore(supplier.reputation) : '—'} detail={supplier ? `Performance ${formatScore(supplier.performance)}` : 'No awarded supplier'} accent="text-emerald-300" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <Card className="min-w-0" header={<SectionHeading icon={Activity} title="Bid evaluation" detail="Contract-recorded scores and configured weights" />}>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Price', evaluation.weights.price],
              ['Reputation', evaluation.weights.reputation],
              ['Performance', evaluation.weights.performance],
              ['Risk', evaluation.weights.risk],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-[#263550] bg-[#0B1220] px-3 py-2.5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}%</p>
              </div>
            ))}
          </div>
          {evaluation.bids.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-[#1E2A44]">
              <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                <thead className="bg-[#0B1220] text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Bidder</th>
                    <th className="px-3 py-3 text-right font-medium">Bid</th>
                    <th className="px-3 py-3 text-right font-medium">Price</th>
                    <th className="px-3 py-3 text-right font-medium">Reputation</th>
                    <th className="px-3 py-3 text-right font-medium">Performance</th>
                    <th className="px-3 py-3 text-right font-medium">Risk</th>
                    <th className="px-3 py-3 text-right font-medium">Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {evaluation.bids.map((bid) => {
                    const isWinner = bid.bidder.toLowerCase() === tender.winner?.toLowerCase();
                    return (
                      <tr key={bid.bidder} className={isWinner ? 'bg-emerald-950/15' : 'bg-[#111A2E]'}>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-300" title={bid.bidder}>
                          <span className="inline-flex items-center gap-2">
                            {isWinner && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-label="Winner" />}
                            {bid.bidder.slice(0, 8)}…{bid.bidder.slice(-6)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-200">{formatEth(bid.bidAmount)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{bid.priceScore}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{bid.reputationScore}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{bid.performanceScore}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{bid.riskScore}</td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums ${isWinner ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {bid.finalScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-[#2E3C5C] px-4 py-8 text-center text-sm text-slate-500">
              No eligible bid evaluations are recorded for this tender.
            </p>
          )}
        </Card>

        <Card header={<SectionHeading icon={ShieldCheck} title="Why this bid was selected" />}>
          {winnerBid ? (
            <>
              <p className="text-sm leading-relaxed text-slate-400">
                AI provides procurement risk intelligence. The final evaluation is applied using the tender's predefined scoring rules.
              </p>
              <div className="my-5 space-y-3">
                {[
                  ['Price', evaluation.weights.price],
                  ['Reputation', evaluation.weights.reputation],
                  ['Performance', evaluation.weights.performance],
                  ['Risk', evaluation.weights.risk],
                ].map(([label, weight]) => (
                  <div key={label} className="flex items-center justify-between border-b border-[#1E2A44] pb-2 text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium tabular-nums text-slate-200">{weight}%</span>
                  </div>
                ))}
              </div>
              <div className="flex items-end justify-between rounded-md border border-emerald-800/50 bg-emerald-950/20 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-emerald-300/70">Final score</p>
                  <p className="mt-1 text-xs text-slate-400">{formatEth(tender.winningBid)} winning bid</p>
                </div>
                <p className="text-3xl font-semibold tabular-nums text-emerald-300">{winnerBid.finalScore}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No awarded bid evaluation is available.</p>
          )}
        </Card>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card className="min-w-0" header={<SectionHeading icon={Clock3} title="Milestones" detail={`${milestones.length} recorded on-chain`} />}>
          {milestones.length ? (
            <div className="space-y-3">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-[#263550] bg-[#0B1220] p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-white">Milestone {Number(milestone.id) + 1}</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">Description hash · {milestone.descriptionHash}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-slate-300">{formatEth(milestone.amount)}</span>
                    <StateBadge value={milestone.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No milestones have been created.</p>
          )}
        </Card>

        <Card className="min-w-0" header={<SectionHeading icon={ShieldCheck} title="Blockchain status" detail="Live local RPC and contract code checks" />}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#1E2A44] pb-4">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Blockchain connected
            </span>
            <span className="text-sm text-slate-400">{blockchain.network} · chain {blockchain.chainId}</span>
          </div>
          <ul className="mt-4 space-y-3">
            {healthEntries.map(([name, address]) => (
              <li key={name} className="flex min-w-0 items-center justify-between gap-4 text-sm">
                <span className="shrink-0 text-slate-400">{name}</span>
                <span className="min-w-0 truncate font-mono text-xs text-slate-300" title={address}>{address}</span>
                <span className="shrink-0 text-emerald-300">Deployed</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="border-[#263550] bg-[#0E1728]" header={<SectionHeading icon={Activity} title="Risk recorded on-chain" detail="Scores and report fingerprints; full reports remain off-chain" />}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Pre-tender risk" value={formatScore(risk.preTenderRiskScore)} accent="text-amber-300" />
          <Metric label="AI risk" value={formatScore(risk.aiRiskScore)} accent="text-amber-300" />
          <Metric label="Escrow state" value={escrow.status} accent="text-blue-200" />
          <Metric label="Contract completion" value={escrow.contractCompleted ? 'Completed' : 'In progress'} accent={escrow.contractCompleted ? 'text-emerald-300' : 'text-slate-200'} />
        </div>
      </Card>
    </div>
  );
}

export default TenderDetailsPage;
