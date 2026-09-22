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

    const { data, error } = await supabase
      .from('recipes')
      .insert([insertData])
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

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) {
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

    // 1. Kiểm tra quyền
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

    // 2. Chuẩn hóa payload an toàn
    const cleanUpdate = {};

    if (rawUpdateData.title !== undefined) cleanUpdate.title = String(rawUpdateData.title).trim();
    if (rawUpdateData.desc !== undefined) cleanUpdate.desc = String(rawUpdateData.desc).trim();
    if (rawUpdateData.description !== undefined) cleanUpdate.description = String(rawUpdateData.description).trim();
    if (rawUpdateData.time !== undefined) cleanUpdate.time = String(rawUpdateData.time).trim();
    if (rawUpdateData.cook_time !== undefined) cleanUpdate.cook_time = Number(rawUpdateData.cook_time) || 15;
    if (rawUpdateData.difficulty !== undefined) cleanUpdate.difficulty = String(rawUpdateData.difficulty).trim();
    if (rawUpdateData.image !== undefined) cleanUpdate.image = String(rawUpdateData.image);
    if (rawUpdateData.image_url !== undefined) cleanUpdate.image_url = String(rawUpdateData.image_url);

    // Mảng JSON cho ingredients và steps
    if (rawUpdateData.ingredients !== undefined) {
      cleanUpdate.ingredients = Array.isArray(rawUpdateData.ingredients)
        ? rawUpdateData.ingredients
        : [];
    }
    if (rawUpdateData.steps !== undefined) {
      cleanUpdate.steps = Array.isArray(rawUpdateData.steps)
        ? rawUpdateData.steps
        : [];
    }

    // 3. Thực thi cập nhật Supabase
    let result = await supabase
      .from('recipes')
      .update(cleanUpdate)
      .eq('id', id)
      .select();

    // Nếu không khớp chuỗi UUID, thử ép kiểu sang Number
    if ((!result.data || result.data.length === 0) && !isNaN(Number(id))) {
      result = await supabase
        .from('recipes')
        .update(cleanUpdate)
        .eq('id', Number(id))
        .select();
    }

    if (result.error) {
      console.error('Lỗi chi tiết Supabase PUT:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data?.[0] || { success: true, id });
  } catch (err) {
    console.error('Lỗi Server PUT:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}