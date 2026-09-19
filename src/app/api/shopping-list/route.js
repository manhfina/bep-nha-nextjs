import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Lấy toàn bộ danh sách đồ cần mua trong giỏ
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Thêm một hoặc nhiều nguyên liệu vào giỏ
export async function POST(request) {
  try {
    const body = await request.json(); // Nhận vào mảng các món hoặc 1 món { dish, text }
    const items = Array.isArray(body) ? body : [body];

    const insertData = items.map((item) => ({
      dish: item.dish || '',
      text: item.text,
    }));

    const { data, error } = await supabase
      .from('shopping_list')
      .insert(insertData)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. Xóa một món theo ID hoặc xóa sạch giỏ
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Xóa 1 món cụ thể
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, removedId: id });
    } else {
      // Xóa toàn bộ giỏ đi chợ
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .neq('id', 0);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, cleared: true });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}