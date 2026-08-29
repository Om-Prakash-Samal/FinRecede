import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const db = getDb();

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const batchId = searchParams.get('batchId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    let list = [...db.store.transactions];

    if (type) {
      list = list.filter(t => t.type === type);
    }
    if (status) {
      list = list.filter(t => t.status === status);
    }
    if (category) {
      list = list.filter(t => t.ai_diagnosis_category === category);
    }
    if (batchId) {
      list = list.filter(t => t.batch_id === batchId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => 
        (t.customer_name || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q) ||
        (t.failure_reason || '').toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const paged = list.slice(offset, offset + limit);

    return NextResponse.json({
      transactions: paged,
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
