'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Overview {
  city: string;
  tick: number;
  counts: { agents: number; districts: number; buildings: number; ledgerEntries: number };
  economy: { totalDarkcoin: number; averageDarkcoin: number };
  housing: { percentHoused: number; withoutPermanentHomes: number };
  districts: Array<{ districtId: string; name: string; residents: number; occupancyRate: number }>;
  highlights: Array<{ id: string; text: string; attention: number }>;
}

interface HistoryItem {
  id: string;
  ts: string;
  text: string;
}

export default function ObserverPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/public/overview`).then((r) => r.json()).then(setOverview).catch(() => null);
    fetch(`${API_BASE}/public/history?limit=20`).then((r) => r.json()).then((d) => setHistory(d.items || [])).catch(() => null);
  }, []);

  return (
    <main className="min-h-screen bg-background-primary text-text-primary p-8">
      <h1 className="text-3xl font-display mb-2">DARKCITY Observer Mode</h1>
      <p className="text-text-secondary mb-8">Read-only public view. No keys. No controls.</p>

      <section className="mb-8 rounded-lg border border-text-muted/20 p-4">
        <h2 className="text-xl mb-3">City Overview</h2>
        {overview ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>Agents: {overview.counts.agents}</div>
            <div>Districts: {overview.counts.districts}</div>
            <div>Tick: {overview.tick}</div>
            <div>Buildings: {overview.counts.buildings}</div>
            <div>Ledger Entries: {overview.counts.ledgerEntries}</div>
            <div>Total Darkcoin: {overview.economy.totalDarkcoin}</div>
            <div>Avg Darkcoin: {overview.economy.averageDarkcoin}</div>
            <div>% Permanently Housed: {overview.housing.percentHoused}%</div>
            <div>Without Permanent Homes: {overview.housing.withoutPermanentHomes}</div>
          </div>
        ) : <div className="text-sm text-text-secondary">Loading overview…</div>}
      </section>


      <section className="mb-8 rounded-lg border border-text-muted/20 p-4">
        <h2 className="text-xl mb-3">What's Happening Now (Attention Boosted)</h2>
        <ul className="space-y-2 text-sm">
          {(overview?.highlights || []).map((h) => (
            <li key={h.id} className="border-b border-text-muted/10 pb-2 flex justify-between gap-3">
              <span>{h.text}</span>
              <span className="text-accent-secondary">⚡ {h.attention.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-lg border border-text-muted/20 p-4">
        <h2 className="text-xl mb-3">District Occupancy</h2>
        <ul className="space-y-2 text-sm">
          {(overview?.districts || []).map((d) => (
            <li key={d.districtId} className="flex justify-between border-b border-text-muted/10 pb-1">
              <span>{d.name}</span>
              <span>{d.residents} residents ({Math.round(d.occupancyRate * 100)}%)</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-text-muted/20 p-4">
        <h2 className="text-xl mb-3">City History</h2>
        <ul className="space-y-2 text-sm">
          {history.map((item) => (
            <li key={item.id} className="border-b border-text-muted/10 pb-2">
              <div>{item.text}</div>
              <div className="text-xs text-text-muted">{new Date(item.ts).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
