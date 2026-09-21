import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Lấy danh sách món đã lên lịch theo Bếp hoặc theo User
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const kitchenId = searchParams.get('kitchenId');
  const userId = searchParams.get('userId');

  let query = supabase.from('meal_plans').select('*');

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

// POST: Thêm một món vào bữa ăn của ngày trong tuần
export async function POST(request) {
  try {
    const { day, mealType, recipeId, userId, kitchenId } = await request.json();

    if (!day || !mealType || !recipeId) {
      return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 });
    }

    const insertData = {
      day,
      meal_type: mealType,
      recipe_id: recipeId,
      user_id: userId || null,
      kitchen_id: kitchenId || null,
    };

    const { data, error } = await supabase
      .from('meal_plans')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa món khỏi lịch hoặc dọn toàn bộ lịch tuần
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const day = searchParams.get('day');
    const mealType = searchParams.get('mealType');
    const recipeId = searchParams.get('recipeId');
    const kitchenId = searchParams.get('kitchenId');
    const userId = searchParams.get('userId');

    let query = supabase.from('meal_plans').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (day && mealType && recipeId) {
      query = query.eq('day', day).eq('meal_type', mealType).eq('recipe_id', recipeId);
      if (kitchenId) {
        query = query.eq('kitchen_id', kitchenId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }
    } else {
      // Xóa sạch cả tuần
      if (kitchenId) {
        query = query.eq('kitchen_id', kitchenId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}