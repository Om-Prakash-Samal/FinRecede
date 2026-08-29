import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const db = getDb();

    const search = searchParams.get('search');
    const actionType = searchParams.get('actionType');
    const complianceFlag = searchParams.get('complianceFlag');
    const batchId = searchParams.get('batchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    let list = db.store.agent_actions.map(a => {
      const txn = db.store.transactions.find(t => t.id === a.transaction_id);
      return {
        ...a,
        customer_name: txn?.customer_name || 'System Event',
        amount: txn?.amount || 0,
        transaction_type: txn?.type || 'payment_failure',
      };
    });

    if (actionType) {
      list = list.filter(a => a.action_type === actionType);
    }
    if (complianceFlag) {
      list = list.filter(a => a.compliance_flag === complianceFlag);
    }
    if (batchId) {
      list = list.filter(a => a.batch_id === batchId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => 
        (a.action_detail || '').toLowerCase().includes(q) ||
        (a.transaction_id || '').toLowerCase().includes(q) ||
        (a.decision_reasoning || '').toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const paged = list.slice(offset, offset + limit);

    // Compute stats
    const stats = {
      total_actions: db.store.agent_actions.length,
      flagged_actions: db.store.agent_actions.filter(a => a.compliance_flag != null).length,
      fraud_flags: db.store.agent_actions.filter(a => a.compliance_flag === 'fraud_flagged').length,
      stopping_rules: db.store.agent_actions.filter(a => a.compliance_flag === 'stopping_rule_triggered').length,
      escalations: db.store.agent_actions.filter(a => a.compliance_flag === 'escalated_to_human').length,
      total_financial_impact: db.store.agent_actions.reduce((s, a) => s + (Number(a.financial_impact) || 0), 0),
    };

    return NextResponse.json({
      actions: paged,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
