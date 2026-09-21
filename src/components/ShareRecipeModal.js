'use client';
import { useState, useEffect } from 'react';

export default function ShareRecipeModal({ isOpen, recipe, onClose }) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && recipe?.id) {
      const url = `${window.location.origin}/?recipe=${recipe.id}`;
      setShareUrl(url);
      setCopied(false);
    }
  }, [recipe?.id]);

  if (!isOpen || !recipe) return null;

  // Tạo URL mã QR bằng QRServer API (nhẹ, nhanh và không cần cài thêm thư viện)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    shareUrl
  )}&bgcolor=ffffff&color=2d3436&margin=2`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareZalo = () => {
    const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}`;
    window.open(zaloUrl, '_blank');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '2rem' }}>📱</span>
          <h2 style={styles.title}>Chia sẻ công thức</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Quét mã QR hoặc gửi link để người khác xem ngay món này
          </p>
        </div>

        {/* Khung hiển thị Mã QR */}
        <div style={styles.qrCard}>
          <img
            src={qrApiUrl}
            alt="Mã QR món ăn"
            style={styles.qrImage}
            title="Quét để mở món ăn trên điện thoại"
          />
          <strong style={{ display: 'block', marginTop: '10px', fontSize: '0.95rem', color: '#2d3436' }}>
            {recipe.title}
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#888' }}>
            Mở camera điện thoại quét mã để xem
          </span>
        </div>

        {/* Khung sao chép liên kết */}
        <div style={styles.copyRow}>
          <input
            type="text"
            readOnly
            value={shareUrl}
            style={styles.linkInput}
            onClick={(e) => e.target.select()}
          />
          <button onClick={handleCopyLink} style={styles.btnCopy}>
            {copied ? '✅ Đã chép' : '📋 Chép link'}
          </button>
        </div>

        {/* Chia sẻ qua Zalo */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button onClick={handleShareZalo} style={styles.btnZalo}>
            💬 Gửi qua Zalo
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10003,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '400px',
    width: '100%',
    padding: '24px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    position: 'relative',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
  },
  title: {
    margin: '4px 0 0 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#2d3436',
  },
  qrCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #edf2f7',
    borderRadius: '16px',
    padding: '16px',
    margin: '12px 0 16px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrImage: {
    width: '180px',
    height: '180px',
    borderRadius: '12px',
    border: '2px solid #fff',
    boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
  },
  copyRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  linkInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    fontSize: '0.82rem',
    outline: 'none',
    backgroundColor: '#f1f2f6',
    color: '#555',
  },
  btnCopy: {
    backgroundColor: '#2d3436',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnZalo: {
    width: '100%',
    backgroundColor: '#0068ff',
    color: '#fff',
    border: 'none',
    padding: '11px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
};