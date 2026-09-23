import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Lấy giỏ hàng theo kitchenId hoặc userId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const kitchenId = searchParams.get('kitchenId');
    const userId = searchParams.get('userId');

    let query = supabase.from('shopping_list').select('*').order('created_at', { ascending: true });

    if (kitchenId) {
      query = query.eq('kitchen_id', kitchenId);
    } else if (userId) {
      query = query.eq('user_id', userId).is('kitchen_id', null);
    } else {
      query = query.is('user_id', null).is('kitchen_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Thêm nguyên liệu vào giỏ
export async function POST(request) {
  try {
    const body = await request.json();
    const { items = [], userId, kitchenId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Danh sách rỗng' }, { status: 400 });
    }

    const rows = items.map((item) => ({
      dish: item.dish || 'Món ăn',
      text: item.text || '',
      is_done: false,
      user_id: userId || null,
      kitchen_id: kitchenId || null,
    }));

    const { data, error } = await supabase.from('shopping_list').insert(rows).select();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Cập nhật trạng thái đã mua (is_done)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, isDone, ids } = body;

    if (Array.isArray(ids) && ids.length > 0) {
      const { data, error } = await supabase
        .from('shopping_list')
        .update({ is_done: !!isDone })
        .in('id', ids)
        .select();
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID nguyên liệu' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shopping_list')
      .update({ is_done: !!isDone })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa 1 món hoặc dọn sạch giỏ
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const kitchenId = searchParams.get('kitchenId');
    const userId = searchParams.get('userId');

    let query = supabase.from('shopping_list').delete();

    if (id) {
      query = query.eq('id', id);
    } else {
      if (kitchenId) {
        query = query.eq('kitchen_id', kitchenId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null).is('kitchen_id', null);
      }
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}