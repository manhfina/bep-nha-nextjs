import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách ghi chú & đánh giá theo recipeId (và kitchenId nếu có)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get('recipeId');
  const kitchenId = searchParams.get('kitchenId');

  if (!recipeId) {
    return NextResponse.json({ error: 'Thiếu recipeId' }, { status: 400 });
  }

  let query = supabase
    .from('recipe_notes')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });

  if (kitchenId) {
    query = query.eq('kitchen_id', kitchenId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST: Thêm ghi chú & đánh giá mới
export async function POST(request) {
  try {
    const { recipeId, kitchenId, userId, userIdentifier, rating, note } = await request.json();

    if (!recipeId || !note?.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập nội dung ghi chú' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('recipe_notes')
      .insert([
        {
          recipe_id: recipeId,
          kitchen_id: kitchenId || null,
          user_id: userId || null,
          user_identifier: userIdentifier || 'Thành viên Bếp',
          rating: rating || 5,
          note: note.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa một ghi chú
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id ghi chú' }, { status: 400 });
    }

    const { error } = await supabase.from('recipe_notes').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}