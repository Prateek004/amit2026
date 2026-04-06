import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { syncItems } = await request.json();

    if (!syncItems || !Array.isArray(syncItems)) {
      return NextResponse.json({ error: 'Invalid sync data' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const results = [];

    for (const item of syncItems) {
      try {
        if (item.operation === 'insert') {
          const { error } = await supabase
            .from(item.table_name)
            .insert(item.payload);

          if (error) throw error;
          results.push({ id: item.id, success: true });
        } else if (item.operation === 'update') {
          const { error } = await supabase
            .from(item.table_name)
            .update(item.payload)
            .eq('id', item.record_id);

          if (error) throw error;
          results.push({ id: item.id, success: true });
        } else if (item.operation === 'delete') {
          const { error } = await supabase
            .from(item.table_name)
            .delete()
            .eq('id', item.record_id);

          if (error) throw error;
          results.push({ id: item.id, success: true });
        }
      } catch (error) {
        console.error('Sync error for item:', item.id, error);
        results.push({ id: item.id, success: false, error: String(error) });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
