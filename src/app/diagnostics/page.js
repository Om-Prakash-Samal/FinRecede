'use client';

import { useState, useEffect } from 'react';
import { Stethoscope, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Filter } from 'lucide-react';
import TransactionTable from '@/components/TransactionTable';
import PlotlyChart from '@/components/PlotlyChart';

export default function DiagnosticsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions?limit=100');
      const data = await res.json();
      setTransactions(data.transactions || []);

      // Calculate diagnosis stats
      const txns = data.transactions || [];
      const categories = {};
      txns.forEach((t) => {
        const cat = t.ai_diagnosis_category || 'pending';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      setStats(categories);
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const catKeys = Object.keys(stats || {}).map((k) => k.replace(/_/g, ' ').toUpperCase());
  const catCounts = Object.values(stats || {});

  const barData = [{
    x: catKeys,
    y: catCounts,
    type: 'bar',
    marker: {
      color: [
        '#f59e0b',
        '#3b82f6',
        '#8b5cf6',
        '#10b981',
        '#ef4444',
        '#ec4899',
        '#06b6d4',
      ],
    },
  }];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>AI Root Cause Diagnostics & Log Parser</h1>
          <p>Inspect structured gateway logs, machine-learned failure categorizations, and merchant override controls</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchDiagnostics} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Diagnostics distribution overview */}
      <div className="charts-grid" style={{ marginBottom: '24px' }}>
        <div className="chart-card full-width">
          <h3>
            <Stethoscope size={18} />
            <span>Root Cause Categorization Frequency (AI Log Analysis)</span>
          </h3>
          <PlotlyChart
            data={barData}
            layout={{
              height: 240,
              margin: { t: 20, r: 10, l: 40, b: 60 },
              xaxis: { tickangle: -15 },
            }}
          />
        </div>
      </div>

      {/* Diagnostic explanation cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <div className="glass-card" style={{ borderLeft: '3px solid var(--gold)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '4px' }}>
            ⚡ Bank Downtime / Network Timeout
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong>Action:</strong> Exponential auto-retry sequence across alternate payment rails with 3-attempt bounded ceiling.
          </div>
        </div>

        <div className="glass-card" style={{ borderLeft: '3px solid var(--info)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '4px' }}>
            💬 Insufficient Funds / Mandate Revoked
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong>Action:</strong> Personalized Hinglish SMS + IVR voice cadence offering direct top-up and UPI deep-links.
          </div>
        </div>

        <div className="glass-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '4px' }}>
            🛡️ Fraud Suspected / 3DS Abuse
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong>Action:</strong> Instant hard stop rule triggered. Zero automated retries; immediate human escalation ticket created.
          </div>
        </div>
      </div>

      {/* Interactive Table with Merchant Overrides */}
      <TransactionTable
        transactions={transactions}
        onActionSuccess={fetchDiagnostics}
      />
    </div>
  );
}
