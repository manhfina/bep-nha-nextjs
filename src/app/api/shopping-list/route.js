import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy các nguyên liệu trong giỏ (Ưu tiên theo kitchenId, sau đó đến userId)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const kitchenId = searchParams.get('kitchenId');

  let query = supabase
    .from('shopping_list')
    .select('*')
    .order('created_at', { ascending: true });

  if (kitchenId) {
    query = query.eq('kitchen_id', kitchenId);
  } else if (userId) {
    query = query.eq('user_id', userId).is('kitchen_id', null);
  } else {
    query = query.is('user_id', null).is('kitchen_id', null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Thêm nguyên liệu vào giỏ
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, userId, kitchenId } = Array.isArray(body)
      ? { items: body, userId: null, kitchenId: null }
      : { items: body.items || [body], userId: body.userId || null, kitchenId: body.kitchenId || null };

    const itemsToInsert = items.map((item) => ({
      dish: item.dish,
      text: item.text,
      user_id: userId || item.userId || null,
      kitchen_id: kitchenId || item.kitchenId || null,
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

// DELETE: Xóa món hoặc dọn toàn bộ giỏ
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const kitchenId = searchParams.get('kitchenId');

    let query = supabase.from('shopping_list').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (kitchenId) {
      query = query.eq('kitchen_id', kitchenId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}