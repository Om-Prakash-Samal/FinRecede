import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { generateMockDataset } from '@/lib/mockDataEngine';
import { runBatch } from '@/lib/agentCore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batchId');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let generator;

        if (batchId) {
          // Check if batch is already running (from the POST endpoint)
          // For simplicity, generate a fresh batch here if no active generator
          const db = getDb();
          const existing = db.prepare('SELECT * FROM batch_runs WHERE id = ?').get(batchId);

          if (existing && existing.status === 'completed') {
            // Batch already completed — send summary
            const txns = db.prepare('SELECT * FROM transactions WHERE batch_id = ?').all(batchId);
            const recovered = txns.filter(t => t.status === 'recovered');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'batch_completed',
              batchId,
              totalTransactions: txns.length,
              totalRevenueAtRisk: existing.total_revenue_at_risk,
              totalRecovered: existing.total_recovered,
              recovered: recovered.length,
              recoveryRate: existing.recovery_rate,
            })}\n\n`));
            controller.close();
            return;
          }
        }

        // Generate a new batch and process
        const newBatchId = batchId || `batch_${uuidv4().slice(0, 12)}`;
        const transactions = generateMockDataset(newBatchId);
        generator = runBatch(newBatchId, transactions);

        for await (const event of generator) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          if (event.type === 'batch_completed' || event.type === 'batch_error') {
            break;
          }
        }

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error.message,
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
