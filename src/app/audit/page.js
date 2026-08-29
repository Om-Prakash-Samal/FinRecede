'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Filter, FileText } from 'lucide-react';
import AuditTable from '@/components/AuditTable';

export default function AuditPage() {
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit?limit=200');
      const data = await res.json();
      setActions(data.actions || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Compliance Ledger & Immutable Audit Trail</h1>
          <p>Full auditability for financial regulators and internal risk teams: every LLM decision, state transition, and stopping rule</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAuditLogs} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          <span>Refresh</span>
        </button>
      </div>

      <AuditTable actions={actions} stats={stats} />
    </div>
  );
}
