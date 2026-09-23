const CACHE_NAME = 'bepnha-cache-v2';

// 1. Cài đặt Service Worker và lưu cache tĩnh cơ bản
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/manifest.json', '/favicon.ico']);
    })
  );
  self.skipWaiting();
});

// 2. Kích hoạt và dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 3. Xử lý offline fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Trả về cache đồng thời gọi mạng cập nhật ngầm
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// 4. LẮNG NGHE THÔNG BÁO ĐẨY TỪ SERVER (WEB PUSH)
self.addEventListener('push', (event) => {
  let data = {
    title: '🍳 Bếp Nhà Nhắc Bạn',
    body: 'Đến giờ chuẩn bị bữa ăn ngon rồi, xem thực đơn hôm nay nhé!',
    url: '/',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=192&h=192&fit=crop&crop=faces',
    badge: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=96&h=96&fit=crop&crop=faces',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open_app', title: '👀 Xem ngay' },
      { action: 'close', title: 'Đóng' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. XỬ LÝ KHI NGƯỜI DÙNG BẤM VÀO THÔNG BÁO
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});