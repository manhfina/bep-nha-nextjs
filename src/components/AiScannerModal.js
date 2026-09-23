'use client';
import { useState, useRef } from 'react';

export default function AiScannerModal({
  isOpen,
  onClose,
  onAddFridgeItems,
  onAddCartItems,
}) {
  const [mode, setMode] = useState('fridge'); // 'fridge' | 'receipt'
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
      setScanResult(null);
      setSelectedItems({});
    };
    reader.readAsDataURL(file);
  };

  const handleStartScan = async () => {
    if (!selectedImage) {
      alert('Vui lòng chụp ảnh hoặc chọn ảnh từ thiết bị trước!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/vision-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: imageMime,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quét ảnh thất bại');

      setScanResult(data);

      // Mặc định chọn tất cả nguyên liệu nhận diện được
      const initialChecked = {};
      (data.items || []).forEach((item, idx) => {
        initialChecked[idx] = true;
      });
      setSelectedItems(initialChecked);
    } catch (err) {
      alert('Lỗi nhận diện: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCheck = (idx) => {
    setSelectedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Xác nhận lưu vào hệ thống
  const handleApply = () => {
    if (!scanResult?.items || scanResult.items.length === 0) return;

    const checkedElements = scanResult.items.filter((_, idx) => selectedItems[idx]);
    if (checkedElements.length === 0) {
      alert('Bạn chưa chọn nguyên liệu nào!');
      return;
    }

    if (mode === 'fridge') {
      const namesToAdd = checkedElements.map((i) => i.name.trim());
      onAddFridgeItems(namesToAdd);
      alert(`🎉 Đã thêm thành công ${namesToAdd.length} nguyên liệu vào tủ lạnh!`);
      handleClose();
    } else {
      // mode === 'receipt'
      const cartItemsToAdd = checkedElements.map((i) => ({
        dish: scanResult.store ? `Hóa đơn: ${scanResult.store}` : 'Mua sắm ngoài chợ',
        text: `${i.name}: ${i.quantity || 1} ${i.unit || ''}`.trim(),
      }));
      onAddCartItems(cartItemsToAdd);
      alert(`🛒 Đã nạp ${cartItemsToAdd.length} món từ hóa đơn vào Giỏ đi chợ!`);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setScanResult(null);
    setSelectedItems({});
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} style={styles.closeBtn}>✕</button>

        {/* Tiêu đề & Chọn chế độ */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📸 Quét Ảnh AI Siêu Tốc</h2>
            <span style={{ fontSize: '0.8rem', color: '#636e72' }}>
              Nhận diện nguyên liệu trong tủ lạnh hoặc bóc tách hóa đơn tự động
            </span>
          </div>
        </div>

        <div style={styles.tabContainer}>
          <button
            onClick={() => {
              setMode('fridge');
              setScanResult(null);
            }}
            style={{
              ...styles.tabBtn,
              ...(mode === 'fridge' ? styles.tabActive : {}),
            }}
          >
            🧊 Chụp Ngăn Tủ Lạnh
          </button>
          <button
            onClick={() => {
              setMode('receipt');
              setScanResult(null);
            }}
            style={{
              ...styles.tabBtn,
              ...(mode === 'receipt' ? styles.tabActive : {}),
            }}
          >
            🧾 Quét Hóa Đơn Đi Chợ
          </button>
        </div>

        {/* Khung tải ảnh / chụp ảnh */}
        <div style={styles.body}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {!selectedImage ? (
            <div
              style={styles.uploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <span style={{ fontSize: '2.5rem' }}>📷</span>
              <strong style={{ marginTop: '8px', color: '#2d3436' }}>
                Bấm để Chụp ảnh hoặc Chọn ảnh
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#888', marginTop: '4px' }}>
                {mode === 'fridge'
                  ? 'Chụp rõ các ngăn chứa thực phẩm trong tủ lạnh'
                  : 'Chụp hóa đơn siêu thị / phiếu tính tiền chợ rõ chữ'}
              </span>
            </div>
          ) : (
            <div style={styles.previewContainer}>
              <img src={selectedImage} alt="Preview" style={styles.previewImage} />
              <div style={styles.previewActions}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={styles.btnSecondary}
                >
                  🔄 Đổi ảnh khác
                </button>
                <button
                  onClick={handleStartScan}
                  disabled={loading}
                  style={styles.btnPrimary}
                >
                  {loading ? '⚡ AI Đang phân tích...' : '✨ Bắt đầu nhận diện'}
                </button>
              </div>
            </div>
          )}

          {/* Kết quả nhận diện */}
          {scanResult && (
            <div style={styles.resultContainer}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#27ae60' }}>
                  ✓ Nhận diện được {scanResult.items?.length || 0} nguyên liệu:
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                  Tick chọn các món muốn áp dụng
                </span>
              </div>

              {scanResult.summary && (
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#4a5568', fontStyle: 'italic' }}>
                  💡 {scanResult.summary}
                </p>
              )}

              <div style={styles.resultList}>
                {(scanResult.items || []).map((item, idx) => (
                  <label
                    key={idx}
                    style={{
                      ...styles.resultItem,
                      backgroundColor: selectedItems[idx] ? '#f0fff4' : '#f8f9fa',
                      borderColor: selectedItems[idx] ? '#68d391' : '#edf2f7',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedItems[idx]}
                      onChange={() => toggleItemCheck(idx)}
                      style={{ transform: 'scale(1.15)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, marginLeft: '8px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#2d3436' }}>{item.name}</strong>
                      {item.category && (
                        <span style={styles.badgeCategory}>{item.category}</span>
                      )}
                      {item.quantity && (
                        <span style={styles.badgeQty}>
                          {item.quantity} {item.unit || ''}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <button onClick={handleApply} style={styles.btnApply}>
                {mode === 'fridge' ? '🧊 Lưu vào Tồn kho Tủ lạnh' : '🛒 Thêm vào Giỏ đi chợ'}
              </button>
            </div>
          )}
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
    zIndex: 10002,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    position: 'relative',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '18px', right: '18px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
  },
  header: {
    marginBottom: '14px', paddingRight: '36px',
  },
  title: {
    margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#2d3436',
  },
  tabContainer: {
    display: 'flex', gap: '8px',
    background: '#f1f2f6', padding: '4px', borderRadius: '12px',
    marginBottom: '14px',
  },
  tabBtn: {
    flex: 1, border: 'none', background: 'transparent',
    padding: '8px 10px', borderRadius: '8px', fontSize: '0.82rem',
    fontWeight: '600', color: '#636e72', cursor: 'pointer',
  },
  tabActive: {
    background: '#fff', color: '#2d3436', boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
  },
  body: {
    overflowY: 'auto', maxHeight: '72vh', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  uploadArea: {
    border: '2px dashed #cbd5e0',
    borderRadius: '16px',
    padding: '36px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  previewContainer: {
    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center',
  },
  previewImage: {
    width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '14px',
    border: '1px solid #edf2f7',
  },
  previewActions: {
    display: 'flex', gap: '8px', width: '100%',
  },
  btnSecondary: {
    flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e0',
    backgroundColor: '#fff', color: '#4a5568', fontWeight: '600', fontSize: '0.82rem',
    cursor: 'pointer',
  },
  btnPrimary: {
    flex: 2, padding: '10px', borderRadius: '10px', border: 'none',
    backgroundColor: '#3182ce', color: '#fff', fontWeight: '700', fontSize: '0.85rem',
    cursor: 'pointer',
  },
  resultContainer: {
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  resultList: {
    display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '30vh', overflowY: 'auto',
  },
  resultItem: {
    display: 'flex', alignItems: 'center', padding: '8px 12px',
    borderRadius: '10px', border: '1px solid #edf2f7', cursor: 'pointer',
  },
  badgeCategory: {
    fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#4a5568',
    padding: '2px 6px', borderRadius: '6px', marginLeft: '6px', fontWeight: '600',
  },
  badgeQty: {
    fontSize: '0.7rem', backgroundColor: '#ebf8ff', color: '#2b6cb0',
    padding: '2px 6px', borderRadius: '6px', marginLeft: '6px', fontWeight: '600',
  },
  btnApply: {
    backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '12px',
    borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
    width: '100%', marginTop: '6px',
  },
};