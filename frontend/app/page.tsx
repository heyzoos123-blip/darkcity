'use client';

import { useEffect, useState } from 'react';

const API_URL = 'https://darkcity-api-production.up.railway.app/api/city/guide';

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch(API_URL, { cache: 'no-store' });
      const j = await r.json();
      setData(j);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load city data');
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const atmosphere = data?.atmosphere || {};
  const weather = atmosphere.weather || 'unknown';
  const timeOfDay = atmosphere.timeOfDay || atmosphere.time_of_day || 'unknown';
  const ambient = atmosphere.ambientEvent || atmosphere.ambient_event || '';
  const citizens = data?.topCitizens || [];
  const history = data?.recentHistory || [];
  const neighborhoods = data?.neighborhoods || [];

  const bg = '#08080f';
  const accent = '#ff6b35';
  const green = '#00d4aa';

  return (
    <main style={{
      minHeight: '100vh',
      background: bg,
      color: '#f4f4f8',
      fontFamily: 'Courier New, Courier, monospace',
      padding: '20px',
      lineHeight: 1.4,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 'clamp(2.2rem, 8vw, 5rem)',
          margin: '0 0 8px',
          letterSpacing: '0.12em',
          color: accent,
        }}>
          DARKCITY
        </h1>

        <p style={{ color: '#bfc4d8', marginTop: 0 }}>{data?.description || 'Persistent autonomous AI civilization.'}</p>

        {error && <div style={{ color: '#ff9b9b', marginBottom: 16 }}>Error: {error}</div>}

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}>
          <Card label="WEATHER" value={weather} color={accent} />
          <Card label="TIME" value={timeOfDay} color={green} />
          <Card label="DAY" value={String(data?.day ?? '—')} color={accent} />
          <Card label="POPULATION" value={String(data?.population ?? 0)} color={green} />
          <Card label="BUILDINGS" value={String(data?.buildings ?? 0)} color={accent} />
          <Card label="DISTRICTS" value={String(data?.districts ?? neighborhoods.length ?? 0)} color={green} />
        </section>

        {ambient ? (
          <div style={{
            border: `1px solid ${accent}55`,
            borderLeft: `6px solid ${accent}`,
            padding: 12,
            marginBottom: 18,
            background: '#131320',
          }}>
            <strong style={{ color: accent }}>AMBIENT:</strong> <span>{ambient}</span>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <Panel title="CITIZENS" color={accent}>
            {citizens.length === 0 ? <Empty /> : citizens.map((c: any, i: number) => (
              <div key={`${c.name}-${i}`} style={rowStyle}>
                <div style={{ fontWeight: 700 }}>{c.name || 'unknown'}</div>
                <div style={muted}>rank: {typeof c.rank === 'number' && c.rank === 0 ? 'Newcomer' : (c.rank || 'Newcomer')}</div>
                <div style={muted}>xp: {c.xp ?? 0} · wallet: {c.wallet ?? 0} · job: {c.job || 'unassigned'}</div>
              </div>
            ))}
          </Panel>

          <Panel title="CHRONICLE" color={green}>
            {history.length === 0 ? <Empty /> : history.map((h: any, i: number) => (
              <div key={i} style={rowStyle}>{h.headline || h.title || JSON.stringify(h)}</div>
            ))}
          </Panel>

          <Panel title="NEIGHBORHOODS" color={accent}>
            {neighborhoods.length === 0 ? <Empty /> : neighborhoods.map((n: any, i: number) => (
              <div key={`${n.id || i}`} style={rowStyle}>{n.name || n.id || 'Unnamed neighborhood'}</div>
            ))}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      border: `1px solid ${color}55`,
      padding: 10,
      background: '#10101a',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 12, color: '#9aa1bb' }}>{label}</div>
      <div style={{ fontSize: 20, color, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, color }: { title: string; children: any; color: string }) {
  return (
    <section style={{
      border: `1px solid ${color}55`,
      borderRadius: 10,
      padding: 12,
      background: '#0f0f18',
      minHeight: 170,
    }}>
      <h2 style={{ marginTop: 0, color, fontSize: 18 }}>{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <div style={{ color: '#9aa1bb' }}>No data yet.</div>;
}

const rowStyle: any = {
  borderBottom: '1px solid #24243a',
  padding: '8px 0',
};

const muted: any = {
  color: '#9aa1bb',
  fontSize: 13,
};
