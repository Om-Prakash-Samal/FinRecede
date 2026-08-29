'use client';

import { useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, Search, Filter } from 'lucide-react';

export default function AuditTable({ actions = [], stats = null }) {
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = actions.filter((a) => {
    const matchesSearch = 
      (a.action_detail || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.transaction_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.decision_reasoning || '').toLowerCase().includes(search.toLowerCase());

    const matchesFlag = !flagFilter || a.compliance_flag === flagFilter;
    const matchesType = !typeFilter || a.action_type === typeFilter;

    return matchesSearch && matchesFlag && matchesType;
  });

  return (
    <div className="data-table-wrapper">
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.4)',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Logged Actions</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{stats.total_actions || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stopping Rules Enforced</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold)' }}>{stats.stopping_rules || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fraud Interventions</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{stats.fraud_flags || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Financial Recovered Total</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
              ₹{(stats.total_financial_impact || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      <div className="data-table-header">
        <div>
          <h3>Audit Trail & Compliance Log</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Immutable, sequential records of every AI state machine decision and financial movement
          </p>
        </div>

        <div className="data-table-filters">
          <input
            type="text"
            placeholder="Search decisions, reasoning, txn..."
            className="filter-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Action Types</option>
            <option value="detect">Detect</option>
            <option value="diagnose">Diagnose</option>
            <option value="retry">Retry</option>
            <option value="send_sms">Send SMS (Hinglish)</option>
            <option value="send_voice">Send Voice (Hinglish)</option>
            <option value="send_email">Send Email</option>
            <option value="recover">Recover</option>
            <option value="escalate">Escalate</option>
            <option value="pause">Pause / Override</option>
          </select>

          <select
            className="filter-select"
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value)}
          >
            <option value="">All Compliance Flags</option>
            <option value="stopping_rule_triggered">Stopping Rule Triggered</option>
            <option value="fraud_flagged">Fraud Flagged</option>
            <option value="escalated_to_human">Escalated to Human</option>
          </select>
        </div>
      </div>

      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Txn ID / Customer</th>
              <th>Action Type</th>
              <th>Action Details</th>
              <th>AI Decision Reasoning</th>
              <th>State Transition</th>
              <th>Impact / Compliance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="empty-state">
                    <h3>No audit logs found</h3>
                    <p>Trigger a batch execution to see agent decisions stream live into the audit ledger.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                    {a.created_at ? a.created_at.slice(11, 19) : '—'}
                  </td>

                  <td>
                    <div className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {a.transaction_id.slice(0, 10)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {a.customer_name || 'System Event'}
                    </div>
                  </td>

                  <td>
                    <span className={`badge badge-${a.action_type === 'recover' ? 'recovered' : a.action_type === 'escalate' ? 'escalated' : 'diagnosed'}`}>
                      {a.action_type}
                    </span>
                  </td>

                  <td style={{ maxWidth: '280px' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {a.action_detail}
                    </div>
                  </td>

                  <td style={{ maxWidth: '320px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', borderLeft: '2px solid var(--gold)' }}>
                      {a.decision_reasoning}
                    </div>
                  </td>

                  <td className="mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{a.previous_state || 'none'}</span>
                    {' → '}
                    <span style={{ color: '#fff', fontWeight: 600 }}>{a.new_state}</span>
                  </td>

                  <td>
                    {a.financial_impact > 0 && (
                      <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.82rem' }}>
                        +₹{a.financial_impact.toLocaleString('en-IN')}
                      </div>
                    )}
                    {a.compliance_flag && (
                      <span className={`badge badge-${a.compliance_flag === 'fraud_flagged' ? 'fraud' : a.compliance_flag === 'stopping_rule_triggered' ? 'stopping' : 'escalation'}`}>
                        {a.compliance_flag.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
