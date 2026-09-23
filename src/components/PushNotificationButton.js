'use client';
import { useState, useEffect } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationButton({ currentUser, currentKitchen }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const handleSubscribe = async () => {
    if (!supported) {
      alert('Trình duyệt của bạn chưa hỗ trợ Web Push Notification.');
      return;
    }

    setLoading(true);
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Chưa cấu hình NEXT_PUBLIC_VAPID_PUBLIC_KEY trên Vercel.');
      }

      const registration = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Bạn cần cấp quyền Cho phép (Allow) để nhận thông báo nhắc giờ nấu ăn!');
        setLoading(false);
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: currentUser?.id || null,
          kitchenId: currentKitchen?.id || null,
        }),
      });

      const resJson = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resJson.error || 'Server không thể lưu thông tin đăng ký');
      }

      setIsSubscribed(true);
      alert('🔔 Kích hoạt chuông thành công! Bếp Nhà sẽ nhắc giờ nấu ăn hàng ngày.');

      // Gửi thông báo thử nghiệm
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Kích hoạt thành công!',
          body: 'Bếp Nhà đã sẵn sàng nhắc bạn vào 10:45 trưa và 16:45 chiều mỗi ngày.',
          targetUserId: currentUser?.id,
        }),
      });
    } catch (err) {
      console.error(err);
      alert('Lỗi kích hoạt thông báo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || isSubscribed}
      style={{
        padding: '7px 12px',
        borderRadius: '10px',
        border: isSubscribed ? '1px solid #27ae60' : '1px solid #3498db',
        background: isSubscribed ? '#f0fff4' : '#ebf8ff',
        color: isSubscribed ? '#27ae60' : '#2980b9',
        fontSize: '0.82rem',
        cursor: isSubscribed ? 'default' : 'pointer',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
      title={isSubscribed ? 'Đang bật nhắc giờ nấu ăn hàng ngày' : 'Nhận thông báo nhắc giờ nấu trưa và chiều'}
    >
      {isSubscribed ? '🔔 Đã bật nhắc giờ' : loading ? '⏳ Đang bật...' : '🔔 Nhắc giờ ăn'}
    </button>
  );
}