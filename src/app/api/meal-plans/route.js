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

// POST: Thêm một món HOẶC thêm hàng loạt món vào bữa ăn
export async function POST(request) {
  try {
    const body = await request.json();

    // Trường hợp 1: Chèn hàng loạt (Bulk insert từ AI Meal Planner)
    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return NextResponse.json([]);
      }

      const rowsToInsert = body.items.map((item) => ({
        day: item.day,
        meal_type: item.mealType || item.meal_type,
        recipe_id: item.recipeId || item.recipe_id,
        user_id: item.userId || body.userId || null,
        kitchen_id: item.kitchenId || body.kitchenId || null,
      }));

      const { data, error } = await supabase
        .from('meal_plans')
        .insert(rowsToInsert)
        .select();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Trường hợp 2: Chèn 1 món lẻ (Chọn tay)
    const { day, mealType, recipeId, userId, kitchenId } = body;

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