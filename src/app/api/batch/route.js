import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { generateMockDataset } from '@/lib/mockDataEngine';
import { runBatch } from '@/lib/agentCore';

// Store active batch generators for SSE streaming
const activeBatches = new Map();

export async function POST() {
  try {
    const batchId = `batch_${uuidv4().slice(0, 12)}`;
    const transactions = generateMockDataset(batchId);
    const generator = runBatch(batchId, transactions);

    // Store generator so SSE endpoint can consume it
    activeBatches.set(batchId, generator);

    // Consume the first event (batch_started) to initialize
    const first = await generator.next();

    return NextResponse.json({
      batchId,
      message: 'Batch started. Connect to SSE stream for live updates.',
      sseUrl: `/api/batch/stream?batchId=${batchId}`,
      ...first.value,
    });
  } catch (error) {
    console.error('Batch POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const batches = db.prepare(`
      SELECT * FROM batch_runs ORDER BY started_at DESC LIMIT 20
    `).all();
    return NextResponse.json({ batches });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export for SSE stream access
export { activeBatches };
