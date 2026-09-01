import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST() {
  try {
    const db = getDb();
    db.store = {
      transactions: [],
      agent_actions: [],
      batch_runs: [],
    };
    db.prepare('SELECT 1').run(); // triggers saveStore() internally

    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
