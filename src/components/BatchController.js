'use client';

import { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

export default function BatchController({ onBatchComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);

  const startBatch = async () => {
    try {
      setIsRunning(true);
      setProgress(0);
      setLiveLogs([]);
      setStats({
        processed: 0,
        total: 58,
        recovered: 0,
        escalated: 0,
        totalRecovered: 0,
        recoveryRate: 0,
      });

      // Connect to SSE stream
      const eventSource = new EventSource('/api/batch/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'batch_started') {
            setStats((prev) => ({
              ...prev,
              total: data.totalTransactions,
              totalRevenueAtRisk: data.totalRevenueAtRisk,
            }));
            setLiveLogs((prev) => [
              `🚀 Batch started: ${data.totalTransactions} transactions (₹${data.totalRevenueAtRisk.toLocaleString('en-IN')} at risk)`,
              ...prev.slice(0, 30),
            ]);
          } else if (data.type === 'transaction_processed') {
            const pct = Math.round((data.processed / data.totalTransactions) * 100);
            setProgress(pct);
            setStats({
              processed: data.processed,
              total: data.totalTransactions,
              recovered: data.recovered,
              escalated: data.escalated,
              totalRecovered: data.totalRecovered,
              recoveryRate: data.recoveryRate,
            });

            const logEmoji = data.status === 'recovered' ? '💰' : data.status === 'escalated' ? '🛡️' : '⚙️';
            const logText = `${logEmoji} [${data.status.toUpperCase()}] ${data.customerName} (₹${data.amount.toLocaleString('en-IN')}) — ${data.transactionType}`;
            setLiveLogs((prev) => [logText, ...prev.slice(0, 30)]);
          } else if (data.type === 'batch_completed') {
            setProgress(100);
            setIsRunning(false);
            eventSource.close();
            setLiveLogs((prev) => [
              `✅ BATCH COMPLETE! Recovered ₹${data.totalRecovered.toLocaleString('en-IN')} (${data.recoveryRate.toFixed(1)}% recovery rate)`,
              ...prev.slice(0, 30),
            ]);
            if (onBatchComplete) onBatchComplete();
          } else if (data.type === 'error') {
            setIsRunning(false);
            eventSource.close();
            setLiveLogs((prev) => [`❌ Error: ${data.message}`, ...prev.slice(0, 30)]);
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        setIsRunning(false);
        eventSource.close();
      };
    } catch (error) {
      console.error('Failed to trigger batch:', error);
      setIsRunning(false);
    }
  };

  return (
    <div className="batch-controller">
      <div className="batch-controller-header">
        <div>
          <h3>
            <Zap size={20} color="var(--gold)" />
            <span>Autonomous Recovery Engine</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Simulate 50+ real-time payment failure, subscription downgrade, checkout drop-off & overdue invoice events.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={startBatch}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <RefreshCw size={16} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Processing Batch Live...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Run 50+ Synthetic Batch</span>
            </>
          )}
        </button>
      </div>

      {(isRunning || stats) && (
        <div className="batch-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            <span>Processing Pipeline</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>{progress}% ({stats?.processed || 0} / {stats?.total || 0})</span>
          </div>

          <div className="progress-bar-wrapper">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>

          <div className="batch-stats">
            <div className="batch-stat">
              <span className="stat-label">Processed</span>
              <span className="stat-value">{stats?.processed || 0} / {stats?.total || 0}</span>
            </div>
            <div className="batch-stat">
              <span className="stat-label">Recovered</span>
              <span className="stat-value recovered">{stats?.recovered || 0} txns</span>
            </div>
            <div className="batch-stat">
              <span className="stat-label">Money Recovered</span>
              <span className="stat-value recovered">₹{(stats?.totalRecovered || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="batch-stat">
              <span className="stat-label">Compliant Escalated</span>
              <span className="stat-value escalated">{stats?.escalated || 0} txns</span>
            </div>
            <div className="batch-stat">
              <span className="stat-label">Recovery Rate</span>
              <span className="stat-value rate">{(stats?.recoveryRate || 0).toFixed(1)}%</span>
            </div>
          </div>

          {liveLogs.length > 0 && (
            <div className="live-feed">
              {liveLogs.map((log, idx) => (
                <div key={idx} className={`feed-entry ${log.includes('💰') ? 'success' : log.includes('🛡️') ? 'escalated' : ''}`}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
