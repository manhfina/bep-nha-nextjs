import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ROOT_ADMIN_PHONES } from '@/lib/permissions';

// GET: Lấy quyền của số điện thoại hiện tại
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

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

// POST: Admin cấp quyền cho số điện thoại khác (role: 'editor' hoặc 'viewer')
export async function POST(req) {
  try {
    const body = await req.json();
    const { adminPhone, targetPhone, role } = body;

    // Xác thực người thực hiện có phải Admin không
    if (!ROOT_ADMIN_PHONES.includes(adminPhone)) {
      const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('phone_number', adminPhone)
        .maybeSingle();

      if (adminCheck?.role !== 'admin') {
        return NextResponse.json({ error: 'Bạn không có quyền quản trị!' }, { status: 403 });
      }
    }

    if (!targetPhone) {
      return NextResponse.json({ error: 'Thiếu số điện thoại cần cấp quyền' }, { status: 400 });
    }

    const cleanTarget = targetPhone.trim();
    const newRole = role === 'editor' ? 'editor' : 'viewer';

    const { data, error } = await supabase
      .from('user_roles')
      .upsert(
        { phone_number: cleanTarget, role: newRole, updated_at: new Date().toISOString() },
        { onConflict: 'phone_number' }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}