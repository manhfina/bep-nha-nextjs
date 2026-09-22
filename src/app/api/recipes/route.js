import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROOT_ADMIN_PHONES } from '@/lib/permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Hàm kiểm tra quyền thực hiện thao tác sửa / xóa
 */
async function verifyPermission(phone) {
  if (!phone) return false;

  const cleanPhone = phone.trim();

  // 1. Kiểm tra nếu là 1 trong 2 số Admin chính
  if (ROOT_ADMIN_PHONES.includes(cleanPhone)) {
    return true;
  }

  // 2. Tra cứu quyền trong bảng user_roles trên Supabase
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('phone_number', cleanPhone)
    .maybeSingle();

  if (error || !data) return false;

  return data.role === 'admin' || data.role === 'editor';
}

// GET: Lấy danh sách công thức món ăn (Công khai cho mọi người)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Lỗi Supabase:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Lỗi Server:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Đăng công thức mới
export async function POST(request) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('recipes')
      .insert([body])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa công thức (Bắt buộc quyền Admin hoặc Editor)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requesterPhone = request.headers.get('x-user-phone') || searchParams.get('phone');

    // Kiểm tra quyền
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

// PUT: Cập nhật công thức món ăn (Bắt buộc quyền Admin hoặc Editor)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, requesterPhone: bodyPhone, ...updateData } = body;
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

    const { data, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}