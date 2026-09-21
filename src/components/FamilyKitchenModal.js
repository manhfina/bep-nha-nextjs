'use client';
import { useState } from 'react';

export default function FamilyKitchenModal({
  isOpen,
  onClose,
  kitchenData,
  currentUserId,
  onRefreshKitchen,
}) {
  const [kitchenName, setKitchenName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState('view'); // 'view', 'create', 'join'
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const kitchen = kitchenData?.kitchen;
  const members = kitchenData?.members || [];

  const handleCreateKitchen = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: kitchenName || 'Bếp Gia Đình',
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo bếp');
      alert('🎉 Tạo Bếp gia đình thành công!');
      onRefreshKitchen();
      setMode('view');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinKitchen = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: joinCode,
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tham gia bếp');
      alert(`🎉 Đã tham gia vào "${data.kitchen.name}"!`);
      onRefreshKitchen();
      setMode('view');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveKitchen = async () => {
    if (!confirm('Bạn có chắc chắn muốn rời khỏi Bếp này?')) return;
    try {
      const res = await fetch(`/api/kitchen?userId=${currentUserId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Không thể rời bếp');
      alert('Đã rời khỏi bếp!');
      onRefreshKitchen();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(kitchen.code);
    alert(`Đã sao chép mã Bếp: ${kitchen.code}\nGửi mã này cho người thân để cùng vào bếp nhé!`);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '2.2rem' }}>🏡</span>
          <h2 style={styles.title}>Bếp Gia Đình</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Chia sẻ thực đơn & dùng chung một giỏ đi chợ theo thời gian thực
          </p>
        </div>

        {kitchen ? (
          /* Giao diện khi ĐÃ CÓ BẾP */
          <div>
            <div style={styles.kitchenInfoCard}>
              <span style={{ fontSize: '0.8rem', color: '#e67e22', fontWeight: 'bold' }}>TÊN BẾP:</span>
              <h3 style={{ margin: '2px 0 10px 0', fontSize: '1.25rem', color: '#2d3436' }}>{kitchen.name}</h3>

              <div style={styles.codeRow}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>MÃ MỜI VÀO BẾP:</span>
                  <div style={styles.codeText}>{kitchen.code}</div>
                </div>
                <button onClick={copyCode} style={styles.btnCopy}>
                  📋 Sao chép mã
                </button>
              </div>
            </div>

            <h4 style={{ margin: '16px 0 8px 0', fontSize: '0.95rem', color: '#2d3436' }}>
              Thành viên ({members.length})
            </h4>
            <div style={styles.memberList}>
              {members.map((m) => (
                <div key={m.id} style={styles.memberItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👤</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {m.user_identifier || (m.user_id === currentUserId ? 'Bạn' : 'Thành viên')}
                    </span>
                  </div>
                  <span style={styles.roleBadge}>
                    {m.role === 'owner' ? '👑 Chủ bếp' : 'Thành viên'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button onClick={handleLeaveKitchen} style={styles.btnLeave}>
                🚪 Rời khỏi Bếp này
              </button>
            </div>
          </div>
        ) : mode === 'create' ? (
          /* Form tạo bếp mới */
          <form onSubmit={handleCreateKitchen} style={styles.form}>
            <label style={styles.label}>Đặt tên cho Bếp của bạn</label>
            <input
              type="text"
              required
              placeholder="VD: Bếp Nhà Mạnh, Bếp Vợ Chồng Son..."
              value={kitchenName}
              onChange={(e) => setKitchenName(e.target.value)}
              style={styles.input}
            />
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? 'Đang tạo...' : 'Tạo Bếp ngay'}
            </button>
            <button type="button" onClick={() => setMode('view')} style={styles.btnSecondary}>
              Quay lại
            </button>
          </form>
        ) : mode === 'join' ? (
          /* Form tham gia bếp bằng mã */
          <form onSubmit={handleJoinKitchen} style={styles.form}>
            <label style={styles.label}>Nhập Mã Bếp (6 ký tự)</label>
            <input
              type="text"
              required
              placeholder="VD: BEP-82X"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
            />
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? 'Đang kiểm tra...' : 'Vào Bếp'}
            </button>
            <button type="button" onClick={() => setMode('view')} style={styles.btnSecondary}>
              Quay lại
            </button>
          </form>
        ) : (
          /* Chưa có bếp: Chọn Tạo hoặc Tham gia */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={styles.choiceCard} onClick={() => setMode('create')}>
              <span style={{ fontSize: '1.8rem' }}>✨</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Tạo Bếp gia đình mới</strong>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  Tạo không gian riêng cho gia đình và lấy mã chia sẻ
                </span>
              </div>
            </div>

            <div style={styles.choiceCard} onClick={() => setMode('join')}>
              <span style={{ fontSize: '1.8rem' }}>🔑</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Tham gia Bếp có sẵn</strong>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  Nhập mã mời từ người thân hoặc bạn cùng phòng
                </span>
              </div>
            </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10002,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '440px',
    width: '100%',
    padding: '24px',
    boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
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
  title: {
    margin: '6px 0 0 0', fontSize: '1.35rem', fontWeight: '700', color: '#2d3436',
  },
  kitchenInfoCard: {
    backgroundColor: '#fffaf0',
    border: '1px solid #feebc8',
    borderRadius: '16px',
    padding: '16px',
  },
  codeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px dashed #e67e22',
  },
  codeText: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#e67e22',
    letterSpacing: '1.5px',
  },
  btnCopy: {
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  memberList: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    maxHeight: '160px', overflowY: 'auto',
  },
  memberItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', backgroundColor: '#f8f9fa', borderRadius: '10px',
  },
  roleBadge: {
    fontSize: '0.75rem', fontWeight: '600', color: '#27ae60',
    backgroundColor: '#eafaf1', padding: '3px 8px', borderRadius: '6px',
  },
  btnLeave: {
    background: 'transparent', border: 'none', color: '#e74c3c',
    fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
  },
  choiceCard: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '16px', borderRadius: '14px', border: '1px solid #e1e8ed',
    cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#f8f9fa',
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  label: {
    fontSize: '0.85rem', fontWeight: '700', color: '#2d3436',
  },
  input: {
    padding: '12px', borderRadius: '12px', border: '1px solid #dcdde1',
    fontSize: '0.95rem', outline: 'none',
  },
  btnPrimary: {
    backgroundColor: '#e67e22', color: '#fff', border: 'none',
    padding: '12px', borderRadius: '12px', fontWeight: '700',
    fontSize: '0.95rem', cursor: 'pointer', marginTop: '6px',
  },
  btnSecondary: {
    backgroundColor: 'transparent', color: '#636e72', border: 'none',
    padding: '8px', fontSize: '0.85rem', cursor: 'pointer',
  },
};