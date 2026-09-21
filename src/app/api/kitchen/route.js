import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Sinh mã bếp ngẫu nhiên 6 ký tự (VD: BEP-82X)
const generateKitchenCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'BEP-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// GET: Lấy thông tin Bếp và danh sách thành viên mà user đang tham gia
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ kitchen: null, members: [] });
  }

  try {
    // 1. Tìm bếp mà user này tham gia
    const { data: memberRecord, error: memErr } = await supabase
      .from('kitchen_members')
      .select('kitchen_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (memErr) throw memErr;
    if (!memberRecord) {
      return NextResponse.json({ kitchen: null, members: [] });
    }

    // 2. Lấy thông tin chi tiết của bếp
    const { data: kitchen, error: kErr } = await supabase
      .from('kitchens')
      .select('*')
      .eq('id', memberRecord.kitchen_id)
      .single();

    if (kErr) throw kErr;

    // 3. Lấy tất cả thành viên trong bếp đó
    const { data: members, error: allMemErr } = await supabase
      .from('kitchen_members')
      .select('id, user_id, user_identifier, role, joined_at')
      .eq('kitchen_id', memberRecord.kitchen_id);

    if (allMemErr) throw allMemErr;

    return NextResponse.json({
      kitchen,
      role: memberRecord.role,
      members: members || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Tạo bếp mới HOẶC Tham gia bếp bằng mã code
export async function POST(request) {
  try {
    const { action, name, code, userId, userIdentifier } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (action === 'create') {
      // 1. Tạo Bếp mới
      const kitchenCode = generateKitchenCode();
      const { data: newKitchen, error: createErr } = await supabase
        .from('kitchens')
        .insert([{
          name: name || 'Bếp Gia Đình',
          code: kitchenCode,
          owner_id: userId,
        }])
        .select()
        .single();

      if (createErr) throw createErr;

      // 2. Thêm chủ bếp vào danh sách thành viên
      await supabase.from('kitchen_members').insert([{
        kitchen_id: newKitchen.id,
        user_id: userId,
        user_identifier: userIdentifier || 'Chủ bếp',
        role: 'owner',
      }]);

      return NextResponse.json({ success: true, kitchen: newKitchen });
    } else if (action === 'join') {
      // Tìm bếp theo mã
      const cleanCode = (code || '').trim().toUpperCase();
      const { data: kitchen, error: findErr } = await supabase
        .from('kitchens')
        .select('id, name')
        .eq('code', cleanCode)
        .maybeSingle();

      if (findErr || !kitchen) {
        return NextResponse.json({ error: 'Mã Bếp không chính xác hoặc không tồn tại' }, { status: 404 });
      }

      // Kiểm tra xem đã là thành viên chưa
      const { data: exists } = await supabase
        .from('kitchen_members')
        .select('id')
        .eq('kitchen_id', kitchen.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (exists) {
        return NextResponse.json({ error: 'Bạn đã là thành viên của Bếp này rồi!' }, { status: 400 });
      }

      // Thêm vào bếp
      const { error: joinErr } = await supabase.from('kitchen_members').insert([{
        kitchen_id: kitchen.id,
        user_id: userId,
        user_identifier: userIdentifier || 'Thành viên',
        role: 'member',
      }]);

      if (joinErr) throw joinErr;

      return NextResponse.json({ success: true, kitchen });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Rời khỏi bếp
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });

    const { error } = await supabase
      .from('kitchen_members')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}