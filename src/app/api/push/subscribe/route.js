import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { subscription, userId, kitchenId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Dữ liệu đăng ký không hợp lệ' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Chuẩn hóa UUID an toàn, tránh lỗi cú pháp UUID rỗng
    const validUserId = typeof userId === 'string' && userId.length > 20 ? userId : null;
    const validKitchenId = typeof kitchenId === 'string' && kitchenId.length > 20 ? kitchenId : null;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          user_id: validUserId,
          kitchen_id: validKitchenId,
        },
        { onConflict: 'endpoint' }
      )
      .select();

    if (error) {
      console.error('Lỗi Supabase khi lưu push subscription:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Lỗi server /api/push/subscribe:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}