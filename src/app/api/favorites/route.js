import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách ID món yêu thích của user
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let query = supabase.from('favorites').select('recipe_id');
  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    // Nếu chưa đăng nhập, lấy các bản ghi không gán user_id hoặc trả về rỗng
    query = query.is('user_id', null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const favoriteRecipeIds = data.map((item) => String(item.recipe_id));
  return NextResponse.json(favoriteRecipeIds);
}

// POST: Thêm hoặc Xóa món yêu thích theo user
export async function POST(request) {
  try {
    const { recipeId, userId } = await request.json();

    if (!recipeId) {
      return NextResponse.json({ error: 'Thiếu recipeId' }, { status: 400 });
    }

    // Kiểm tra xem món này đã được yêu thích bởi user chưa
    let checkQuery = supabase
      .from('favorites')
      .select('id')
      .eq('recipe_id', recipeId);

    if (userId) {
      checkQuery = checkQuery.eq('user_id', userId);
    } else {
      checkQuery = checkQuery.is('user_id', null);
    }

    const { data: existing, error: findError } = await checkQuery.maybeSingle();

    if (findError) throw findError;

    if (existing) {
      // Đã có -> Xóa khỏi yêu thích
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (deleteError) throw deleteError;
      return NextResponse.json({ action: 'removed', recipeId });
    } else {
      // Chưa có -> Thêm mới
      const insertData = { recipe_id: recipeId };
      if (userId) insertData.user_id = userId;

      const { error: insertError } = await supabase
        .from('favorites')
        .insert([insertData]);

      if (insertError) throw insertError;
      return NextResponse.json({ action: 'added', recipeId });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}