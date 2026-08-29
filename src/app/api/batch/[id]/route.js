import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = getDb();

    const batch = db.prepare('SELECT * FROM batch_runs WHERE id = ?').get(id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const transactions = db.prepare(`
      SELECT * FROM transactions WHERE batch_id = ? ORDER BY updated_at DESC
    `).all(id);

    const actions = db.prepare(`
      SELECT * FROM agent_actions WHERE batch_id = ? ORDER BY created_at DESC
    `).all(id);

    return NextResponse.json({ batch, transactions, actions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
