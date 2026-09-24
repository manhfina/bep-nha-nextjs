import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Khởi tạo font Plus Jakarta Sans tối ưu cho tiếng Việt
const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata = {
  title: 'Bếp Nhà Món Ngon',
  description: 'Trợ lý ẩm thực, công thức và đi chợ thông minh',
  manifest: '/manifest.json',
  themeColor: '#e67e22',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bếp Nhà',
  },
  icons: {
    icon: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=192&h=192&fit=crop&crop=faces',
    apple: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=180&h=180&fit=crop&crop=faces',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={fontSans.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bếp Nhà" />

        {/* Thay thế favicon.ico bằng ảnh icon ẩm thực cho iPhone/iPad */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=180&h=180&fit=crop&crop=faces"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=192&h=192&fit=crop&crop=faces"
        />
      </head>
      <body className={fontSans.className}>
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