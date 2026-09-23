import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const { subscription, userId, kitchenId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Dữ liệu đăng ký không hợp lệ' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Lưu hoặc cập nhật subscription của thiết bị vào Supabase
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          user_id: userId || null,
          kitchen_id: kitchenId || null,
        },
        { onConflict: 'endpoint' }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Lỗi lưu push subscription:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}