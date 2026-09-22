import './globals.css';

export const metadata = {
  title: 'Bếp Nhà Món Ngon',
  description: 'Trợ lý ẩm thực, công thức và đi chợ thông minh',
  manifest: '/manifest.json',
  themeColor: '#e67e22',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bếp Nhà" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body>
        {children}

        {/* Đăng ký Service Worker cho chế độ Offline PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('PWA ServiceWorker đăng ký thành công:', reg.scope);
                    },
                    function(err) {
                      console.log('PWA ServiceWorker đăng ký lỗi:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}