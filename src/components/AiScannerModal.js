'use client';
import { useState, useRef } from 'react';

export default function AiScannerModal({ isOpen, onClose, onApplyItems }) {
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [detectedItems, setDetectedItems] = useState([]);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
      processImageWithAI(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const processImageWithAI = async (base64Img) => {
    setLoading(true);
    setDetectedItems([]);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan-vision',
          imageBase64: base64Img,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi quét hình ảnh');

      setDetectedItems(data.items || []);
    } catch (err) {
      alert('Không thể nhận diện ảnh: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (detectedItems.length > 0) {
      onApplyItems(detectedItems);
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '2.2rem' }}>🤖📸</span>
          <h2 style={styles.title}>Quét Tủ Lạnh / Hóa Đơn (AI Vision)</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Chụp ảnh các ngăn tủ lạnh hoặc hóa đơn siêu thị để AI tự động nhận diện nguyên liệu
          </p>
        </div>

        {/* Khu vực chọn / tải ảnh */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {!previewImage ? (
          <div style={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
            <span style={{ fontSize: '2.5rem' }}>📷</span>
            <strong style={{ marginTop: '8px', color: '#2d3436' }}>Chụp ảnh hoặc Chọn từ thư viện</strong>
            <span style={{ fontSize: '0.78rem', color: '#888', marginTop: '4px' }}>
              Hỗ trợ chụp hóa đơn mua hàng hoặc đồ ăn trong tủ lạnh
            </span>
          </div>
        ) : (
          <div style={styles.previewContainer}>
            <img src={previewImage} alt="Preview" style={styles.previewImg} />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={styles.btnRetake}
              disabled={loading}
            >
              🔄 Chụp lại ảnh khác
            </button>
          </div>
        )}

        {/* Trạng thái AI đang xử lý */}
        {loading && (
          <div style={styles.loadingBox}>
            <div className="spinner" style={{ fontSize: '1.4rem', marginBottom: '6px' }}>⏳</div>
            <strong style={{ color: '#e67e22', fontSize: '0.9rem' }}>
              Gemini AI đang phân tích nguyên liệu trong ảnh...
            </strong>
          </div>
        )}

        {/* Danh sách thực phẩm nhận diện được */}
        {detectedItems.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#2d3436' }}>
              Đã nhận diện ({detectedItems.length} món):
            </h4>
            <div style={styles.itemList}>
              {detectedItems.map((item, idx) => (
                <div key={idx} style={styles.itemTag}>
                  <span>✅ {item.name}</span>
                  {item.quantity && (
                    <span style={{ color: '#718096', fontSize: '0.8rem' }}>
                      {item.quantity} {item.unit || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleConfirm} style={styles.btnApply}>
              ✨ Đưa tất cả vào Tủ Lạnh của bạn
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10006,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '460px',
    width: '100%',
    padding: '24px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    position: 'relative',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
  },
  title: {
    margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#2d3436',
  },
  uploadBox: {
    border: '2px dashed #cbd5e0',
    borderRadius: '16px',
    padding: '30px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa',
    transition: 'all 0.2s',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  previewImg: {
    maxHeight: '180px',
    borderRadius: '12px',
    objectFit: 'cover',
    width: '100%',
  },
  btnRetake: {
    background: 'none',
    border: 'none',
    color: '#3498db',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '16px 0',
  },
  itemList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    maxHeight: '140px',
    overflowY: 'auto',
    marginBottom: '14px',
  },
  itemTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#edf2f7',
    padding: '6px 12px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#2d3436',
  },
  btnApply: {
    width: '100%',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
  },
};