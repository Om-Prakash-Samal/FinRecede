'use client';

import { useState, useEffect } from 'react';
import { 
  ReceiptIndianRupee, 
  CalendarClock, 
  HandCoins, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  MailCheck, 
  Send 
} from 'lucide-react';
import KPICard from '@/components/KPICard';
import PlotlyChart from '@/components/PlotlyChart';

export default function ReceivablesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions?type=overdue_invoice&limit=50');
      const data = await res.json();
      setInvoices(data.transactions || []);
    } catch (err) {
      console.error('Failed to load receivables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  // Compute metrics
  const totalOutstanding = invoices.reduce((s, i) => s + i.amount, 0);
  const totalRecovered = invoices.reduce((s, i) => s + (i.amount_recovered || 0), 0);
  const promisedInvoices = invoices.filter((i) => i.promise_to_pay_date != null);
  const promiseRate = invoices.length > 0 ? ((promisedInvoices.length / invoices.length) * 100) : 0;

  // Aging distribution mock buckets for B2B
  const aging30 = invoices.filter((_, idx) => idx % 4 === 0).reduce((s, i) => s + i.amount, 0);
  const aging60 = invoices.filter((_, idx) => idx % 4 === 1).reduce((s, i) => s + i.amount, 0);
  const aging90 = invoices.filter((_, idx) => idx % 4 === 2).reduce((s, i) => s + i.amount, 0);
  const agingCurrent = invoices.filter((_, idx) => idx % 4 === 3).reduce((s, i) => s + i.amount, 0);

  const agingBarData = [{
    x: ['Current (0-30d)', '31-60 Days', '61-90 Days', '90+ Days Overdue'],
    y: [agingCurrent, aging30, aging60, aging90],
    type: 'bar',
    marker: {
      color: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
    },
  }];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>B2B Receivables Chaser & Promise-to-Pay Tracker</h1>
          <p>Automated multi-stage invoice follow-ups, dispute resolution triggers, and commitment date tracking</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchReceivables} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          label="Total Overdue Receivables"
          value={`₹${totalOutstanding.toLocaleString('en-IN')}`}
          subtext={`${invoices.length} outstanding B2B enterprise invoices`}
          icon={ReceiptIndianRupee}
          variant="gold"
        />

        <KPICard
          label="Recovered & Reconciled"
          value={`₹${totalRecovered.toLocaleString('en-IN')}`}
          subtext="Through automated reminder sequences"
          icon={CheckCircle2}
          variant="success"
        />

        <KPICard
          label="Promise-to-Pay Secured"
          value={`${promisedInvoices.length} Invoices`}
          subtext={`${promiseRate.toFixed(0)}% client commitment rate`}
          icon={HandCoins}
          variant="info"
        />

        <KPICard
          label="Chasing Strategy Cadence"
          value="3 Stages"
          subtext="Gentle → Firm Notice → Legal Pre-escalation"
          icon={CalendarClock}
          variant="purple"
        />
      </div>

      {/* Aging Analysis Chart */}
      <div className="charts-grid" style={{ marginBottom: '32px' }}>
        <div className="chart-card full-width">
          <h3>
            <CalendarClock size={18} />
            <span>Receivables Aging Bucket Distribution (₹ Outstanding)</span>
          </h3>
          <PlotlyChart
            data={agingBarData}
            layout={{
              height: 240,
              margin: { t: 20, r: 20, l: 60, b: 40 },
            }}
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <div>
            <h3>Active B2B Invoices & Chasing Status</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Showing {invoices.length} enterprise accounts under autonomous recovery
            </p>
          </div>
        </div>

        <div className="table-overflow">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice & Company</th>
                <th>Total Value</th>
                <th>Due Date / Age</th>
                <th>Autonomous Chasing Stage</th>
                <th>Promise-to-Pay Commitment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-state">
                      <h3>No overdue invoices found</h3>
                      <p>Run a synthetic batch to generate realistic B2B accounts receivable scenarios.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>
                        {inv.customer_name}
                      </div>
                      <div className="mono" style={{ fontSize: '0.72rem' }}>
                        {inv.invoice_id || inv.id.slice(0, 10)} • {inv.customer_email}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        ₹{inv.amount.toLocaleString('en-IN')}
                      </div>
                      {inv.amount_recovered > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--success)' }}>
                          ₹{inv.amount_recovered.toLocaleString('en-IN')} reconciled
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {inv.invoice_due_date || 'Past Due'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Terms: NET-30 / NET-60
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        <MailCheck size={14} color="var(--gold)" />
                        <span>
                          {inv.recovery_attempts === 0 ? 'Stage 1: Friendly Reminder' : inv.recovery_attempts === 1 ? 'Stage 2: Urgent Notice' : 'Stage 3: Executive Pre-Legal'}
                        </span>
                      </div>
                    </td>

                    <td>
                      {inv.promise_to_pay_date ? (
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                            🤝 Promised: {inv.promise_to_pay_date}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            Commitment Status: {inv.promise_to_pay_status || 'Pending'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Awaiting client reply</span>
                      )}
                    </td>

                    <td>
                      <span className={`badge badge-${inv.status}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
