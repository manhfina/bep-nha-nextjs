import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { title, body, url = '/', targetUserId, targetKitchenId } = await req.json().catch(() => ({}));

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@bepnha.com';

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình NEXT_PUBLIC_VAPID_PUBLIC_KEY hoặc VAPID_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    // Lấy danh sách thiết bị cần gửi từ Supabase
    let query = supabase.from('push_subscriptions').select('*');
    if (targetKitchenId) {
      query = query.eq('kitchen_id', targetKitchenId);
    } else if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: subs, error } = await query;
    if (error) throw error;

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'Không có thiết bị nào đăng ký nhận thông báo' });
    }

    const payload = JSON.stringify({
      title: title || '🍳 Bếp Nhà Món Ngon',
      body: body || 'Đến giờ vào bếp rồi! Xem gợi ý món ngon hôm nay nhé.',
      url,
    });

    const sendPromises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        // Nếu token hết hạn hoặc thiết bị hủy đăng ký (410 / 404), xóa khỏi database
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, count: subs.length });
  } catch (err) {
    console.error('Lỗi gửi Web Push:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}