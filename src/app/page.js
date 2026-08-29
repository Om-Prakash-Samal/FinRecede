'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Layers, 
  BarChart3, 
  PieChart as PieIcon,
  RefreshCw
} from 'lucide-react';
import KPICard from '@/components/KPICard';
import BatchController from '@/components/BatchController';
import RecoveryFunnel from '@/components/RecoveryFunnel';
import TransactionTable from '@/components/TransactionTable';
import PlotlyChart from '@/components/PlotlyChart';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, txnRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/transactions?limit=25'),
      ]);
      const dashData = await dashRes.json();
      const txnData = await txnRes.json();

      setData(dashData);
      setTransactions(txnData.transactions || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Category breakdown chart data
  const categoryNames = data?.byCategory?.map((c) => c.category?.replace(/_/g, ' ').toUpperCase()) || [];
  const categoryAmounts = data?.byCategory?.map((c) => c.total_amount) || [];
  const categoryRecovered = data?.byCategory?.map((c) => c.recovered_amount || 0) || [];

  const categoryBarData = [
    {
      x: categoryNames,
      y: categoryAmounts,
      name: 'Revenue at Risk',
      type: 'bar',
      marker: { color: 'rgba(245, 158, 11, 0.4)' },
    },
    {
      x: categoryNames,
      y: categoryRecovered,
      name: 'Recovered',
      type: 'bar',
      marker: { color: 'rgba(16, 185, 129, 0.85)' },
    },
  ];

  // Failure Type Distribution Pie
  const typeLabels = data?.byType?.map((t) => t.type.replace(/_/g, ' ').toUpperCase()) || [];
  const typeValues = data?.byType?.map((t) => t.count) || [];

  const typePieData = [
    {
      labels: typeLabels,
      values: typeValues,
      type: 'pie',
      hole: 0.55,
      marker: {
        colors: [
          '#f59e0b',
          '#3b82f6',
          '#8b5cf6',
          '#10b981',
        ],
      },
      textinfo: 'label+percent',
      textposition: 'outside',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>FinRecede — Executive Recovery Command</h1>
          <p>Real-time autonomous revenue recovery across payment failures, checkout drop-offs, subscriptions & B2B invoices</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Batch Trigger Controller */}
      <BatchController onBatchComplete={fetchDashboardData} />

      {/* 4 Core KPIs */}
      <div className="kpi-grid">
        <KPICard
          label="Total Revenue at Risk"
          value={`₹${(data?.kpis?.totalRevenueAtRisk || 0).toLocaleString('en-IN')}`}
          subtext={`${data?.kpis?.totalTransactions || 0} total risk events captured`}
          icon={ShieldAlert}
          variant="gold"
        />

        <KPICard
          label="Total Money Recovered"
          value={`₹${(data?.kpis?.totalRecovered || 0).toLocaleString('en-IN')}`}
          subtext={`Saved from slippage batch-wide`}
          icon={TrendingUp}
          variant="success"
        />

        <KPICard
          label="Recovery Success Rate"
          value={`${(data?.kpis?.recoveryRate || 0).toFixed(1)}%`}
          subtext={`${data?.statusCounts?.recovered || 0} of ${data?.kpis?.totalTransactions || 0} successfully salvaged`}
          icon={CheckCircle}
          variant="info"
        />

        <KPICard
          label="Avg Recovery Latency"
          value={`${data?.kpis?.avgRecoveryTime || 0.4}s`}
          subtext="Autonomous loop: Detect → Diagnose → Recover"
          icon={Clock}
          variant="purple"
        />
      </div>

      {/* Interactive Visual Recovery Funnel */}
      <div className="charts-grid">
        <div className="chart-card full-width">
          <h3>
            <Layers size={18} />
            <span>Interactive Autonomous Recovery Pipeline (Sankey Flow)</span>
          </h3>
          <RecoveryFunnel statusCounts={data?.statusCounts} />
        </div>

        <div className="chart-card">
          <h3>
            <BarChart3 size={18} />
            <span>Recovery by Failure Root Cause (₹ at Risk vs Recovered)</span>
          </h3>
          <PlotlyChart
            data={categoryBarData}
            layout={{
              barmode: 'group',
              height: 280,
              legend: { orientation: 'h', y: 1.15 },
              margin: { t: 30, r: 10, l: 50, b: 60 },
            }}
          />
        </div>

        <div className="chart-card">
          <h3>
            <PieIcon size={18} />
            <span>Risk Events by Channel Breakdown</span>
          </h3>
          <PlotlyChart
            data={typePieData}
            layout={{
              height: 280,
              showlegend: false,
              margin: { t: 20, r: 20, l: 20, b: 20 },
            }}
          />
        </div>
      </div>

      {/* Recent Transactions & Diagnostics */}
      <div style={{ marginTop: '32px' }}>
        <TransactionTable
          transactions={transactions}
          onActionSuccess={fetchDashboardData}
        />
      </div>
    </div>
  );
}
