import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = getDb();

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const actions = db.prepare(
      'SELECT * FROM agent_actions WHERE transaction_id = ? ORDER BY created_at ASC'
    ).all(id);

    return NextResponse.json({ transaction, actions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Handle pause / resume
    if (body.action === 'pause') {
      db.prepare('UPDATE transactions SET is_paused = 1, status = ?, updated_at = ? WHERE id = ?')
        .run('paused', now, id);
      db.prepare(`INSERT INTO agent_actions (id, transaction_id, action_type, action_detail, decision_reasoning, previous_state, new_state, success, created_at)
        VALUES (?, ?, 'pause', ?, ?, ?, 'paused', 1, ?)`).run(
        uuidv4(), id,
        `Merchant manually paused recovery for transaction ${id}.`,
        'Merchant override: Manual pause requested via admin UI.',
        transaction.status, now,
      );
      return NextResponse.json({ success: true, message: 'Recovery paused' });
    }

    if (body.action === 'resume') {
      db.prepare('UPDATE transactions SET is_paused = 0, status = ?, updated_at = ? WHERE id = ?')
        .run('in_recovery', now, id);
      db.prepare(`INSERT INTO agent_actions (id, transaction_id, action_type, action_detail, decision_reasoning, previous_state, new_state, success, created_at)
        VALUES (?, ?, 'resume', ?, ?, ?, 'in_recovery', 1, ?)`).run(
        uuidv4(), id,
        `Merchant resumed recovery for transaction ${id}.`,
        'Merchant override: Manual resume requested via admin UI.',
        'paused', now,
      );
      return NextResponse.json({ success: true, message: 'Recovery resumed' });
    }

    if (body.action === 'escalate') {
      db.prepare('UPDATE transactions SET status = ?, stopping_rule_triggered = ?, resolved_at = ?, updated_at = ? WHERE id = ?')
        .run('escalated', 'manual_escalation', now, now, id);
      db.prepare(`INSERT INTO agent_actions (id, transaction_id, action_type, action_detail, decision_reasoning, previous_state, new_state, financial_impact, compliance_flag, success, created_at)
        VALUES (?, ?, 'escalate', ?, ?, ?, 'escalated', 0, 'escalated_to_human', 1, ?)`).run(
        uuidv4(), id,
        `Merchant manually escalated transaction ${id} to human review.`,
        'Merchant override: Manual escalation approved via admin UI.',
        transaction.status, now,
      );
      return NextResponse.json({ success: true, message: 'Transaction escalated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
