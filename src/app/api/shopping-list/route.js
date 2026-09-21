import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy các nguyên liệu trong giỏ của user
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let query = supabase
    .from('shopping_list')
    .select('*')
    .order('created_at', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Thêm nguyên liệu vào giỏ của user
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, userId } = Array.isArray(body)
      ? { items: body, userId: null }
      : { items: body.items || [body], userId: body.userId || null };

    const itemsToInsert = items.map((item) => ({
      dish: item.dish,
      text: item.text,
      user_id: userId || item.userId || null,
    }));

    const { data, error } = await supabase
      .from('shopping_list')
      .insert(itemsToInsert)
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa 1 món hoặc xóa toàn bộ giỏ của user
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    let query = supabase.from('shopping_list').delete();

    if (id) {
      // Xóa 1 dòng cụ thể
      query = query.eq('id', id);
    } else if (userId) {
      // Dọn giỏ của riêng user đó
      query = query.eq('user_id', userId);
    } else {
      // Dọn giỏ của khách vãng lai (null)
      query = query.is('user_id', null);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}