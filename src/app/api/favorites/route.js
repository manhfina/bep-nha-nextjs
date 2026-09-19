import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Lấy danh sách ID các món đã thích
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('recipe_id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ids = (data || []).map((item) => String(item.recipe_id));
    return NextResponse.json(ids);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Thêm hoặc Bỏ yêu thích
export async function POST(request) {
  try {
    const { recipeId } = await request.json();

    if (!recipeId) {
      return NextResponse.json({ error: 'Thiếu recipeId' }, { status: 400 });
    }

    // Kiểm tra xem món này đã được thích chưa
    const { data: existing, error: findError } = await supabase
      .from('favorites')
      .select('id')
      .eq('recipe_id', recipeId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existing) {
      // Đã có -> Bỏ thích
      await supabase.from('favorites').delete().eq('recipe_id', recipeId);
      return NextResponse.json({ status: 'removed', recipeId });
    } else {
      // Chưa có -> Thêm vào bảng favorites
      await supabase.from('favorites').insert([{ recipe_id: recipeId }]);
      return NextResponse.json({ status: 'added', recipeId });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}