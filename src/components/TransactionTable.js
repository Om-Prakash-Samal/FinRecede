'use client';

import { useState } from 'react';
import { Pause, Play, AlertOctagon, CheckCircle2, ChevronRight, Search, Filter } from 'lucide-react';

export default function TransactionTable({ transactions = [], onActionSuccess }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const handleOverride = async (id, action) => {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok && onActionSuccess) {
        onActionSuccess();
      }
    } catch (err) {
      console.error('Action override error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch = 
      (t.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.failure_reason || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = !typeFilter || t.type === typeFilter;
    const matchesStatus = !statusFilter || t.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="data-table-wrapper">
      <div className="data-table-header">
        <div>
          <h3>Transaction Risk & Diagnostics</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Showing {filtered.length} of {transactions.length} total events
          </p>
        </div>

        <div className="data-table-filters">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search customer, ID, reason..."
              className="filter-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="payment_failure">Payment Failure</option>
            <option value="checkout_dropout">Checkout Drop-off</option>
            <option value="subscription_failure">Subscription Failure</option>
            <option value="overdue_invoice">Overdue Invoice</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="detected">Detected</option>
            <option value="diagnosed">Diagnosed</option>
            <option value="in_recovery">In Recovery</option>
            <option value="recovered">Recovered</option>
            <option value="escalated">Escalated</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID & Type</th>
              <th>Customer / Merchant</th>
              <th>Amount</th>
              <th>Failure Root Cause (AI)</th>
              <th>Recovery Method</th>
              <th>Status</th>
              <th>Merchant Controls</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="empty-state">
                    <h3>No transactions found</h3>
                    <p>Try adjusting your search criteria or trigger a batch run.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isRecovered = t.status === 'recovered';
                const isEscalated = t.status === 'escalated';
                const isPaused = t.status === 'paused' || t.is_paused === 1;

                return (
                  <tr key={t.id}>
                    <td>
                      <div className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.id.slice(0, 12)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {t.type.replace('_', ' ')}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.customer_name || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {t.customer_phone || t.customer_email || t.merchant_id}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>
                        ₹{t.amount?.toLocaleString('en-IN')}
                      </div>
                      {t.amount_recovered > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--success)' }}>
                          +₹{t.amount_recovered.toLocaleString('en-IN')} won
                        </div>
                      )}
                    </td>

                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                        {t.ai_diagnosis_category ? t.ai_diagnosis_category.replace('_', ' ').toUpperCase() : t.failure_reason}
                      </div>
                      <div className="truncate" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} title={t.ai_diagnosis || t.raw_log}>
                        {t.ai_diagnosis || t.raw_log || 'Awaiting log ingestion...'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {t.recovery_method ? t.recovery_method.replace('_', ' ') : '—'}
                      </div>
                      {t.recovery_attempts > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Attempt {t.recovery_attempts} / {t.max_retries}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`badge badge-${t.status}`}>
                        {t.status}
                      </span>
                      {t.stopping_rule_triggered && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--danger)', marginTop: '3px' }}>
                          🛑 {t.stopping_rule_triggered}
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isPaused ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            title="Resume AI Recovery"
                            disabled={actionLoading === t.id}
                            onClick={() => handleOverride(t.id, 'resume')}
                          >
                            <Play size={12} /> Resume
                          </button>
                        ) : !isRecovered && !isEscalated ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            title="Pause Recovery"
                            disabled={actionLoading === t.id}
                            onClick={() => handleOverride(t.id, 'pause')}
                          >
                            <Pause size={12} /> Pause
                          </button>
                        ) : null}

                        {!isEscalated && !isRecovered && (
                          <button
                            className="btn btn-sm btn-danger"
                            title="Manually Escalate to Human"
                            disabled={actionLoading === t.id}
                            onClick={() => handleOverride(t.id, 'escalate')}
                          >
                            <AlertOctagon size={12} /> Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
