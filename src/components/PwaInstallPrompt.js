'use client';
import { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Nếu app đã được cài đặt và đang chạy ở chế độ standalone thì ẩn banner
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // 2. Không làm phiền nếu người dùng đã từng bấm tắt trong 7 ngày qua
    const dismissedAt = localStorage.getItem('bepnha_pwa_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // 3. Nhận diện thiết bị iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      setShowPrompt(true);
      return;
    }

    // 4. Bắt sự kiện cài đặt trên Android/Chromium Desktop
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem('bepnha_pwa_dismissed', Date.now().toString());
    } catch (e) {}
  };

  if (!showPrompt) return null;

  return (
    <div style={styles.bannerContainer}>
      <div style={styles.contentWrapper}>
        <div style={styles.iconBox}>🍳</div>
        <div style={styles.textWrapper}>
          <strong style={{ fontSize: '0.9rem', color: '#2d3436' }}>
            Cài đặt Bếp Nhà vào điện thoại
          </strong>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#636e72' }}>
            {isIos
              ? 'Bấm nút "Chia sẻ" (Share) trên Safari rồi chọn "Thêm vào MH chính" 📲'
              : 'Mở ứng dụng nhanh chóng, mượt mà và dùng được offline!'}
          </p>
        </div>
      </div>

      <div style={styles.actions}>
        {!isIos && deferredPrompt && (
          <button onClick={handleInstallClick} style={styles.btnInstall}>
            Cài đặt ngay
          </button>
        )}
        <button onClick={handleDismiss} style={styles.btnClose}>
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  bannerContainer: {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: '480px',
    backgroundColor: '#ffffff',
    padding: '12px 16px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    border: '1px solid #edf2f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
  },
  contentWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  iconBox: {
    fontSize: '1.8rem',
    backgroundColor: '#fffaf0',
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  btnInstall: {
    backgroundColor: '#e67e22',
    color: '#ffffff',
    border: 'none',
    padding: '7px 14px',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: '#b2bec3',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '4px',
  },
};