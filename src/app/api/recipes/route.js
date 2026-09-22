import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROOT_ADMIN_PHONES } from '@/lib/permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Kiểm tra quyền thực hiện sửa / xóa
 */
async function verifyPermission(phone) {
  if (!phone) return false;
  const cleanPhone = phone.trim();

  // 1. Kiểm tra nếu là 1 trong 2 số Admin tối cao
  if (ROOT_ADMIN_PHONES.includes(cleanPhone)) {
    return true;
  }

  // 2. Tra cứu trong bảng user_roles
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('phone_number', cleanPhone)
    .maybeSingle();

  if (error || !data) return false;
  return data.role === 'admin' || data.role === 'editor';
}

// GET: Lấy danh sách công thức
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

// POST: Thêm món ăn mới
export async function POST(request) {
  try {
    const body = await request.json();
    const { requesterPhone, ...insertData } = body;

    const { data, error } = await supabase
      .from('recipes')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Lỗi Supabase POST:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa công thức
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

// PUT: Cập nhật công thức món ăn
export async function PUT(request) {
  try {
    const body = await request.json();
    
    // TÁCH requesterPhone RA ĐỂ KHÔNG BỊ TRUYỀN VÀO BẢNG RECIPES
    const { id, requesterPhone: bodyPhone, ...rawUpdateData } = body;
    const requesterPhone = request.headers.get('x-user-phone') || bodyPhone;

    // Kiểm tra quyền
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

    // Làm sạch payload: Chỉ gửi các trường hợp lệ lên Supabase
    const sanitizedUpdate = {};
    if (rawUpdateData.title !== undefined) sanitizedUpdate.title = rawUpdateData.title;
    if (rawUpdateData.desc !== undefined) sanitizedUpdate.desc = rawUpdateData.desc;
    if (rawUpdateData.description !== undefined) sanitizedUpdate.description = rawUpdateData.description;
    if (rawUpdateData.time !== undefined) sanitizedUpdate.time = rawUpdateData.time;
    if (rawUpdateData.cook_time !== undefined) sanitizedUpdate.cook_time = rawUpdateData.cook_time;
    if (rawUpdateData.difficulty !== undefined) sanitizedUpdate.difficulty = rawUpdateData.difficulty;
    if (rawUpdateData.image !== undefined) sanitizedUpdate.image = rawUpdateData.image;
    if (rawUpdateData.image_url !== undefined) sanitizedUpdate.image_url = rawUpdateData.image_url;
    if (rawUpdateData.ingredients !== undefined) sanitizedUpdate.ingredients = rawUpdateData.ingredients;
    if (rawUpdateData.steps !== undefined) sanitizedUpdate.steps = rawUpdateData.steps;
    if (rawUpdateData.instructions !== undefined) sanitizedUpdate.instructions = rawUpdateData.instructions;

    const { data, error } = await supabase
      .from('recipes')
      .update(sanitizedUpdate)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Lỗi Supabase PUT:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error('Lỗi Server PUT:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}