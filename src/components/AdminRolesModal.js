'use client';
import { useState, useEffect } from 'react';
import { ROOT_ADMIN_PHONES, extractUserPhone } from '@/lib/permissions';

export default function AdminRolesModal({ isOpen, onClose, currentUser }) {
  const [userList, setUserList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State cấp quyền cho số mới
  const [targetPhone, setTargetPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const currentPhone = extractUserPhone(currentUser) || '';

  // Lấy toàn bộ danh sách số điện thoại trong hệ thống
  const fetchAllUsers = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/roles?all=true');
      const data = await res.json();
      if (Array.isArray(data.users)) {
        setUserList(data.users);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
      setSearchTerm('');
      setTargetPhone('');
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Cấp hoặc cập nhật vai trò qua form
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
      fetchAllUsers();
    } catch (err) {
      setMessage(`❌ Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Đổi vai trò nhanh trực tiếp trên danh sách
  const handleQuickChangeRole = async (phone, role) => {
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPhone: currentPhone,
          targetPhone: phone,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể cập nhật quyền');

      setUserList((prev) =>
        prev.map((u) => ((u.phone || u.phone_number) === phone ? { ...u, role } : u))
      );
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Xóa tài khoản / gỡ quyền
  const handleDeleteRole = async (phone) => {
    if (ROOT_ADMIN_PHONES.includes(phone)) {
      alert('Không thể xóa Quản trị viên tối cao!');
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa quyền của số ${phone}?`)) return;

    try {
      const res = await fetch(`/api/roles?phone=${phone}&adminPhone=${currentPhone}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xóa thất bại');

      setUserList((prev) => prev.filter((u) => (u.phone || u.phone_number) !== phone));
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Lọc số điện thoại theo thanh tìm kiếm
  const filteredUsers = userList.filter((u) => {
    const p = u.phone || u.phone_number || '';
    return p.includes(searchTerm.trim());
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn} aria-label="Đóng">✕</button>

        {/* Tiêu đề */}
        <div style={styles.header}>
          <h2 style={styles.title}>🛡️ Quản Lý Người Dùng & Phân Quyền</h2>
          <p style={styles.subtitle}>
            Quản trị viên đang đăng nhập: <strong>{currentPhone || 'Admin'}</strong>
          </p>
        </div>

        <div style={styles.bodyContent}>
          {/* Card Thống kê Tổng số tài khoản */}
          <div style={styles.statCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#718096', display: 'block' }}>
                  Tổng tài khoản đã đăng ký:
                </span>
                <strong style={{ fontSize: '1.35rem', color: '#2d3436' }}>
                  📱 {userList.length} số điện thoại
                </strong>
              </div>
              <button onClick={fetchAllUsers} style={styles.btnRefresh} title="Tải lại danh sách">
                🔄 Cập nhật
              </button>
            </div>
          </div>

          {/* Danh sách Admin cứng */}
          <div style={styles.infoCard}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#e74c3c', marginBottom: '6px' }}>
              👑 Quản Trị Viên Tối Cao:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ROOT_ADMIN_PHONES.map((p) => (
                <span key={p} style={styles.badgeAdmin}>
                  📞 {p}
                </span>
              ))}
            </div>
          </div>

          {/* Form thêm hoặc cấp quyền */}
          <form onSubmit={handleGrantRole} style={styles.formCard}>
            <strong style={{ fontSize: '0.88rem', color: '#2d3436', display: 'block', marginBottom: '8px' }}>
              + Cấp quyền / Thêm tài khoản mới:
            </strong>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                required
                placeholder="Nhập số điện thoại (VD: 0912345678)..."
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                style={styles.inputPhone}
              />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={styles.selectRole}
              >
                <option value="editor">👨‍🍳 Đầu bếp (Đăng/Sửa)</option>
                <option value="viewer">👀 Người xem</option>
              </select>
              <button type="submit" disabled={loading} style={styles.btnSubmit}>
                {loading ? 'Đang lưu...' : 'Lưu quyền'}
              </button>
            </div>
            {message && <div style={styles.formMessage}>{message}</div>}
          </form>

          {/* Danh sách người dùng & Tìm kiếm */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: '#2d3436' }}>
                Danh sách thành viên ({filteredUsers.length})
              </strong>
            </div>

            <input
              type="text"
              placeholder="🔍 Tìm nhanh số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />

            <div style={styles.userListContainer}>
              {loadingList ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px 0', margin: 0 }}>
                  Đang tải danh sách tài khoản...
                </p>
              ) : filteredUsers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px 0', margin: 0 }}>
                  Không tìm thấy số điện thoại nào.
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const phone = u.phone || u.phone_number;
                  const isRoot = ROOT_ADMIN_PHONES.includes(phone);

                  return (
                    <div key={phone} style={styles.userRow}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.92rem', color: '#2d3436' }}>
                            📞 {phone}
                          </strong>
                          {isRoot && <span style={styles.badgeRoot}>CHỦ BẾP</span>}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#a0aec0', display: 'block', marginTop: '2px' }}>
                          Đăng ký: {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : 'Mặc định'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                          value={u.role || 'viewer'}
                          onChange={(e) => handleQuickChangeRole(phone, e.target.value)}
                          disabled={isRoot}
                          style={styles.roleDropdown}
                        >
                          <option value="viewer">Người xem</option>
                          <option value="editor">Đầu bếp</option>
                          {isRoot && <option value="admin">Admin</option>}
                        </select>

                        {!isRoot && (
                          <button
                            onClick={() => handleDeleteRole(phone)}
                            style={styles.btnDelete}
                            title="Xóa quyền số này"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
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
    zIndex: 10005,
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
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    position: 'relative',
    textAlign: 'left',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  header: {
    padding: '20px 24px 12px 24px',
    borderBottom: '1px solid #edf2f7',
  },
  title: {
    margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#2d3436',
  },
  subtitle: {
    margin: '4px 0 0 0', fontSize: '0.82rem', color: '#636e72',
  },
  bodyContent: {
    padding: '16px 24px 24px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  statCard: {
    backgroundColor: '#ebf8ff',
    border: '1px solid #bee3f8',
    borderRadius: '14px',
    padding: '12px 16px',
  },
  btnRefresh: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #3182ce',
    background: '#fff',
    color: '#3182ce',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
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
  formCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '12px',
  },
  inputPhone: {
    flex: '1 1 180px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.85rem',
    outline: 'none',
  },
  selectRole: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.85rem',
    background: '#fff',
  },
  btnSubmit: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#27ae60',
    color: '#fff',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  formMessage: {
    marginTop: '8px',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fdfdfd',
  },
  userListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '260px',
    overflowY: 'auto',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#fff',
    border: '1px solid #edf2f7',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  badgeRoot: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: '800',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  roleDropdown: {
    padding: '5px 8px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.78rem',
    fontWeight: '600',
    background: '#fff',
  },
  btnDelete: {
    background: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '8px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};