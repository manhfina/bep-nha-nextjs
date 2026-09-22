'use client';
import { useState, useEffect } from 'react';
import { ROOT_ADMIN_PHONES, extractUserPhone } from '@/lib/permissions';

export default function AdminRolesModal({ isOpen, onClose, currentUser }) {
  const [targetPhone, setTargetPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const currentPhone = extractUserPhone(currentUser);

  const handleGrantRole = async (e) => {
    e.preventDefault();
    if (!targetPhone.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPhone: currentPhone,
          targetPhone: targetPhone.trim(),
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cấp quyền thất bại');

      setMessage(`✅ Đã cập nhật quyền [${selectedRole === 'editor' ? 'Đầu bếp' : 'Người xem'}] cho số ${targetPhone}!`);
      setTargetPhone('');
    } catch (err) {
      setMessage(`❌ Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#2d3436' }}>
          🛡️ Quản lý Phân Quyền
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#636e72' }}>
          Chỉ có tài khoản được cấp quyền <b>Đầu bếp (Editor)</b> mới có thể đăng, sửa và xóa công thức món ăn.
        </p>

        {/* Danh sách Admin cứng */}
        <div style={styles.infoCard}>
          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#e74c3c', marginBottom: '4px' }}>
            👑 Admin Tối Cao (Mặc định toàn quyền):
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ROOT_ADMIN_PHONES.map((p) => (
              <span key={p} style={styles.badgeAdmin}>
                📞 {p}
              </span>
            ))}
          </div>
        </div>

        {/* Form phân quyền */}
        <form onSubmit={handleGrantRole} style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>
            Số điện thoại thành viên:
          </label>
          <input
            type="text"
            required
            placeholder="Ví dụ: 0912345678"
            value={targetPhone}
            onChange={(e) => setTargetPhone(e.target.value)}
            style={styles.input}
          />

          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', margin: '12px 0 6px 0' }}>
            Vai trò cấp:
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={styles.select}
          >
            <option value="editor">👨‍🍳 Đầu bếp (Được thêm / sửa / xóa công thức)</option>
            <option value="viewer">👀 Người xem (Chỉ được xem, tính tiền & nấu)</option>
          </select>

          {message && (
            <div style={{ margin: '12px 0', fontSize: '0.85rem', fontWeight: '600' }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>
              Đóng
            </button>
            <button type="submit" disabled={loading} style={styles.btnSubmit}>
              {loading ? 'Đang lưu...' : 'Lưu quyền'}
            </button>
          </div>
        </form>
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
    zIndex: 10001,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    maxWidth: '460px',
    width: '100%',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    position: 'relative',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: 'none', border: 'none',
    fontSize: '1.1rem', cursor: 'pointer',
    color: '#888', fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '12px',
    padding: '10px 14px',
  },
  badgeAdmin: {
    background: '#e74c3c',
    color: '#fff',
    fontSize: '0.78rem',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    fontSize: '0.9rem',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  },
  btnCancel: {
    padding: '9px 16px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    background: '#f1f2f6',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  btnSubmit: {
    padding: '9px 18px',
    borderRadius: '10px',
    border: 'none',
    background: '#27ae60',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '0.85rem',
  },
};