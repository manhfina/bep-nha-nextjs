import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ROOT_ADMIN_PHONES } from '@/lib/permissions';

// GET: Lấy quyền của số điện thoại HOẶC lấy toàn bộ danh sách (nếu all=true)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const getAll = searchParams.get('all');

    // 1. Lấy danh sách toàn bộ số điện thoại cho trang quản trị
    if (getAll === 'true') {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let list = (data || []).map((item) => ({
        ...item,
        phone: item.phone_number,
      }));

      // Bổ sung các số ROOT_ADMIN_PHONES nếu chưa có trong DB
      ROOT_ADMIN_PHONES.forEach((rootPhone) => {
        if (!list.some((u) => u.phone === rootPhone)) {
          list.unshift({
            phone_number: rootPhone,
            phone: rootPhone,
            role: 'admin',
            created_at: new Date().toISOString(),
          });
        }
      });

      return NextResponse.json({ users: list });
    }

    // 2. Tra cứu vai trò của một số điện thoại cụ thể
    if (!phone) {
      return NextResponse.json({ role: 'viewer' });
    }

    if (ROOT_ADMIN_PHONES.includes(phone)) {
      return NextResponse.json({ role: 'admin' });
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('phone_number', phone)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ role: data?.role || 'viewer' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Admin cấp quyền cho số điện thoại khác (role: 'admin' | 'editor' | 'viewer')
export async function POST(req) {
  try {
    const body = await req.json();
    const { adminPhone, targetPhone, role } = body;

    // Xác thực người thực hiện có phải Admin không
    if (adminPhone && !ROOT_ADMIN_PHONES.includes(adminPhone)) {
      const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('phone_number', adminPhone)
        .maybeSingle();

      if (adminCheck?.role !== 'admin') {
        return NextResponse.json({ error: 'Bạn không có quyền quản trị!' }, { status: 403 });
      }
    }

    const phoneToSet = (targetPhone || body.phone || '').trim();
    if (!phoneToSet) {
      return NextResponse.json({ error: 'Thiếu số điện thoại cần cấp quyền' }, { status: 400 });
    }

    const newRole = ['admin', 'editor'].includes(role) ? role : 'viewer';

    const { data, error } = await supabase
      .from('user_roles')
      .upsert(
        { phone_number: phoneToSet, role: newRole, updated_at: new Date().toISOString() },
        { onConflict: 'phone_number' }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa vai trò / gỡ số điện thoại khỏi danh sách
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const targetPhone = searchParams.get('phone');
    const adminPhone = searchParams.get('adminPhone');

    // Không cho phép xóa số thuộc ROOT_ADMIN_PHONES
    if (ROOT_ADMIN_PHONES.includes(targetPhone)) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản Quản trị viên gốc!' }, { status: 400 });
    }

    if (!targetPhone) {
      return NextResponse.json({ error: 'Thiếu số điện thoại cần xóa' }, { status: 400 });
    }

    // Kiểm tra quyền Admin
    if (adminPhone && !ROOT_ADMIN_PHONES.includes(adminPhone)) {
      const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('phone_number', adminPhone)
        .maybeSingle();

      if (adminCheck?.role !== 'admin') {
        return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này!' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('phone_number', targetPhone.trim());

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}