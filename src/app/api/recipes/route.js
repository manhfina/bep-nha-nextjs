import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROOT_ADMIN_PHONES } from '@/lib/permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPermission(phone) {
  if (!phone) return false;
  const cleanPhone = String(phone).trim();

  if (ROOT_ADMIN_PHONES.includes(cleanPhone)) {
    return true;
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('phone_number', cleanPhone)
    .maybeSingle();

  if (error || !data) return false;
  return data.role === 'admin' || data.role === 'editor';
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { requesterPhone, ...insertData } = body;

    // Chuẩn hóa và đồng bộ 2 chiều các bước nấu và mô tả khi tạo mới
    const finalSteps = Array.isArray(insertData.steps) && insertData.steps.length > 0
      ? insertData.steps
      : (Array.isArray(insertData.instructions) ? insertData.instructions : []);

    const payload = {
      ...insertData,
      cooking_method: insertData.cooking_method || 'Bếp thường',
      base_servings: Number(insertData.base_servings) || 2,
      steps: finalSteps,
      instructions: finalSteps,
      desc: insertData.desc || insertData.description || '',
      description: insertData.desc || insertData.description || '',
    };

    const { data, error } = await supabase
      .from('recipes')
      .insert([payload])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requesterPhone = request.headers.get('x-user-phone') || searchParams.get('phone');

    const hasPermission = await verifyPermission(requesterPhone);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Bạn không có quyền xóa công thức món ăn này!' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID món ăn' }, { status: 400 });
    }

    // 1. Thử xóa theo chuỗi ID
    let { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    // 2. Nếu id là số nguyên, thử xóa theo dạng Number
    if (error && !isNaN(Number(id))) {
      const retry = await supabase
        .from('recipes')
        .delete()
        .eq('id', Number(id));
      error = retry.error;
    }

    if (error) {
      console.error('Lỗi Supabase DELETE:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, requesterPhone: bodyPhone, ...rawUpdateData } = body;
    const requesterPhone = request.headers.get('x-user-phone') || bodyPhone;

    const hasPermission = await verifyPermission(requesterPhone);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Bạn không có quyền chỉnh sửa công thức món ăn này!' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID món ăn cần cập nhật' }, { status: 400 });
    }

    const cleanUpdate = {};
    if (rawUpdateData.title !== undefined) cleanUpdate.title = String(rawUpdateData.title).trim();
    
    // Đồng bộ cả desc và description
    if (rawUpdateData.desc !== undefined || rawUpdateData.description !== undefined) {
      const textDesc = String(rawUpdateData.desc || rawUpdateData.description || '').trim();
      cleanUpdate.desc = textDesc;
      cleanUpdate.description = textDesc;
    }

    if (rawUpdateData.cooking_method !== undefined) cleanUpdate.cooking_method = String(rawUpdateData.cooking_method).trim();
    if (rawUpdateData.base_servings !== undefined) cleanUpdate.base_servings = Number(rawUpdateData.base_servings) || 2;
    if (rawUpdateData.time !== undefined) cleanUpdate.time = String(rawUpdateData.time).trim();
    if (rawUpdateData.cook_time !== undefined) cleanUpdate.cook_time = Number(rawUpdateData.cook_time) || 15;
    if (rawUpdateData.difficulty !== undefined) cleanUpdate.difficulty = String(rawUpdateData.difficulty).trim();
    if (rawUpdateData.image !== undefined) cleanUpdate.image = String(rawUpdateData.image);
    if (rawUpdateData.image_url !== undefined) cleanUpdate.image_url = String(rawUpdateData.image_url);

    if (rawUpdateData.ingredients !== undefined) {
      cleanUpdate.ingredients = Array.isArray(rawUpdateData.ingredients) ? rawUpdateData.ingredients : [];
    }

    // ĐỒNG BỘ CẢ steps LẪN instructions (Khắc phục triệt để lỗi thiếu bước)
    if (rawUpdateData.steps !== undefined || rawUpdateData.instructions !== undefined) {
      const stepsArr = Array.isArray(rawUpdateData.steps) 
        ? rawUpdateData.steps 
        : (Array.isArray(rawUpdateData.instructions) ? rawUpdateData.instructions : []);
      cleanUpdate.steps = stepsArr;
      cleanUpdate.instructions = stepsArr;
    }

    let result = await supabase
      .from('recipes')
      .update(cleanUpdate)
      .eq('id', id)
      .select();

    if ((!result.data || result.data.length === 0) && !isNaN(Number(id))) {
      result = await supabase
        .from('recipes')
        .update(cleanUpdate)
        .eq('id', Number(id))
        .select();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data?.[0] || { success: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}