'use client';
import { useState, useEffect } from 'react';

const TASTE_OPTIONS = [
  '🌶️ Thích ăn cay',
  '🥗 Ăn thanh đạm / Eat Clean',
  '🚫 Ít đường / Kiêng ngọt',
  '👶 Có trẻ nhỏ (không cay)',
  '🥩 Thích nhiều thịt',
  '🦐 Đậm đà hải sản',
  '🥦 Thuần chay / Bữa chay',
  '🍲 Món truyền thống Bắc',
  '🍜 Món đậm vị Nam',
];

export default function ZeroWasteProfileModal({
  isOpen,
  onClose,
  fridgeItems = [],
  onUpdateFridge,
  onSelectTasteTag,
}) {
  const [selectedTastes, setSelectedTastes] = useState([]);
  const [cookingStreak, setCookingStreak] = useState(1);

  useEffect(() => {
    try {
      const savedTastes = localStorage.getItem('bepnha_family_tastes');
      if (savedTastes) setSelectedTastes(JSON.parse(savedTastes));

      const savedStreak = localStorage.getItem('bepnha_cooking_streak');
      if (savedStreak) setCookingStreak(parseInt(savedStreak, 10) || 1);
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTaste = (taste) => {
    let updated;
    if (selectedTastes.includes(taste)) {
      updated = selectedTastes.filter((t) => t !== taste);
    } else {
      updated = [...selectedTastes, taste];
    }
    setSelectedTastes(updated);
    try {
      localStorage.setItem('bepnha_family_tastes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Tính số lượng thực phẩm cần giải cứu
  const itemsNeedingRescue = fridgeItems.slice(0, 2); // Giả lập ưu tiên món thêm đầu tiên

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🌱 Bếp Sạch - Nhà No</h2>
          <span style={{ fontSize: '0.82rem', color: '#636e72' }}>
            Giảm lãng phí thực phẩm & cá nhân hóa khẩu vị gia đình
          </span>
        </div>

        <div style={styles.body}>
          {/* Card Chuỗi ngày nấu ăn (Streaks) */}
          <div style={styles.streakCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2.5rem' }}>🔥</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.15rem', color: '#d35400' }}>
                    Chuỗi {cookingStreak} ngày vào bếp
                  </strong>
                  <span style={styles.badgeLevel}>Huy hiệu: Đầu Bếp Chăm Chỉ</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#555', marginTop: '3px', display: 'block' }}>
                  Gia đình bạn đang duy trì thói quen nấu nướng và kiểm soát nguyên liệu rất tuyệt vời!
                </span>
              </div>
            </div>
          </div>

          {/* Cảnh báo Zero-Waste giải cứu thực phẩm */}
          <div style={styles.sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.92rem', color: '#2d3436' }}>
                🧊 Tình trạng bảo quản trong tủ lạnh
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#e67e22', fontWeight: '700' }}>
                Zero-Waste Tracking
              </span>
            </div>

            {fridgeItems.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#888' }}>
                Tủ lạnh đang trống. Hãy thêm thực phẩm hoặc quét ảnh để theo dõi hạn dùng!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {fridgeItems.map((item, idx) => {
                  const status = idx === 0 ? 'urgent' : idx === 1 ? 'warning' : 'fresh';
                  return (
                    <div key={idx} style={styles.itemRow}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#2d3436' }}>
                        {item}
                      </span>
                      {status === 'urgent' && (
                        <span style={{ ...styles.statusTag, backgroundColor: '#fff5f5', color: '#e74c3c', border: '1px solid #feb2b2' }}>
                          🔴 Cần nấu hôm nay
                        </span>
                      )}
                      {status === 'warning' && (
                        <span style={{ ...styles.statusTag, backgroundColor: '#fffaf0', color: '#dd6b20', border: '1px solid #fbd38d' }}>
                          🟡 Nên dùng trong 2 ngày
                        </span>
                      )}
                      {status === 'fresh' && (
                        <span style={{ ...styles.statusTag, backgroundColor: '#f0fff4', color: '#38a169', border: '1px solid #9ae6b4' }}>
                          🟢 Tươi mới
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cài đặt khẩu vị gia đình */}
          <div style={styles.sectionBox}>
            <strong style={{ fontSize: '0.92rem', color: '#2d3436', display: 'block', marginBottom: '6px' }}>
              👨‍👩‍👧‍👦 Khẩu vị & Sở thích dinh dưỡng
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#718096', display: 'block', marginBottom: '10px' }}>
              Chọn các đặc điểm ăn uống của gia đình để app tự động đề xuất món phù hợp:
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TASTE_OPTIONS.map((taste) => {
                const isSelected = selectedTastes.includes(taste);
                return (
                  <button
                    key={taste}
                    onClick={() => toggleTaste(taste)}
                    style={{
                      ...styles.tasteBtn,
                      backgroundColor: isSelected ? '#ebf8ff' : '#f8f9fa',
                      borderColor: isSelected ? '#3182ce' : '#e2e8f0',
                      color: isSelected ? '#2b6cb0' : '#4a5568',
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {taste} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={onClose} style={styles.btnSave}>
            ✓ Hoàn tất & Áp dụng hồ sơ
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
    zIndex: 10004,
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
    marginBottom: '16px', paddingRight: '36px',
  },
  title: {
    margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#2d3436',
  },
  body: {
    overflowY: 'auto', maxHeight: '72vh', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  streakCard: {
    backgroundColor: '#fffaf0',
    border: '1px solid #feebc8',
    borderRadius: '16px',
    padding: '14px 16px',
  },
  badgeLevel: {
    backgroundColor: '#dd6b20',
    color: '#fff',
    fontSize: '0.68rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  sectionBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #edf2f7',
    borderRadius: '16px',
    padding: '14px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #edf2f7',
  },
  statusTag: {
    fontSize: '0.72rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  tasteBtn: {
    border: '1px solid #e2e8f0',
    padding: '6px 12px',
    borderRadius: '10px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnSave: {
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
  },
};