import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // KPI aggregations
    const totals = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue_at_risk,
        COALESCE(SUM(amount_recovered), 0) as total_recovered,
        COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovered_count,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_count,
        COUNT(CASE WHEN status = 'in_recovery' THEN 1 END) as in_recovery_count,
        COUNT(CASE WHEN status = 'diagnosed' THEN 1 END) as diagnosed_count,
        COUNT(CASE WHEN status = 'detected' THEN 1 END) as detected_count,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
      FROM transactions
    `).get();

    const recoveryRate = totals.total_transactions > 0
      ? (totals.recovered_count / totals.total_transactions * 100)
      : 0;

    // Average recovery time from batch runs
    const avgTime = db.prepare(`
      SELECT COALESCE(AVG(avg_recovery_time_seconds), 0) as avg_time
      FROM batch_runs WHERE status = 'completed'
    `).get();

    // By category breakdown
    const byCategory = db.prepare(`
      SELECT
        ai_diagnosis_category as category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(amount_recovered) as recovered_amount,
        COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovered_count
      FROM transactions
      WHERE ai_diagnosis_category IS NOT NULL
      GROUP BY ai_diagnosis_category
      ORDER BY count DESC
    `).all();

    // By type breakdown
    const byType = db.prepare(`
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(amount_recovered) as recovered_amount,
        COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovered_count
      FROM transactions
      GROUP BY type
      ORDER BY count DESC
    `).all();

    // Status flow data for Sankey
    const statusFlow = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions
      GROUP BY status
    `).all();

    // Recent batch runs
    const recentBatches = db.prepare(`
      SELECT * FROM batch_runs ORDER BY started_at DESC LIMIT 10
    `).all();

    // Stopping rules summary
    const stoppingRules = db.prepare(`
      SELECT
        stopping_rule_triggered as rule,
        COUNT(*) as count
      FROM transactions
      WHERE stopping_rule_triggered IS NOT NULL
      GROUP BY stopping_rule_triggered
    `).all();

    return NextResponse.json({
      kpis: {
        totalRevenueAtRisk: totals.total_revenue_at_risk,
        totalRecovered: totals.total_recovered,
        recoveryRate: +recoveryRate.toFixed(1),
        avgRecoveryTime: +avgTime.avg_time.toFixed(1),
        totalTransactions: totals.total_transactions,
      },
      statusCounts: {
        detected: totals.detected_count,
        diagnosed: totals.diagnosed_count,
        in_recovery: totals.in_recovery_count,
        recovered: totals.recovered_count,
        escalated: totals.escalated_count,
        paused: totals.paused_count,
        failed: totals.failed_count,
      },
      byCategory,
      byType,
      statusFlow,
      recentBatches,
      stoppingRules,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
