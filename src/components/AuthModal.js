'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' hoặc 'email'
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Chuẩn hóa số điện thoại về định dạng auth
  const getIdentifier = () => {
    if (authMethod === 'phone') {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 11) {
        throw new Error('Số điện thoại không hợp lệ (cần từ 9 - 11 chữ số)');
      }
      return `${cleanPhone}@phone.bepnha.local`;
    }
    return email.trim().toLowerCase();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const loginId = getIdentifier();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: loginId,
          password: password,
          options: {
            data: {
              raw_phone: authMethod === 'phone' ? phone.trim() : null,
              login_type: authMethod,
            },
          },
        });
        if (error) throw error;
        alert('🎉 Đăng ký thành công! Bạn có thể sử dụng ngay.');
        if (onAuthSuccess) onAuthSuccess(data.user);
        onClose();
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginId,
          password: password,
        });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess(data.user);
        onClose();
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Sai số điện thoại/email hoặc mật khẩu!');
      } else if (msg.includes('already registered')) {
        setErrorMsg('Tài khoản này đã được đăng ký trước đó!');
      } else {
        setErrorMsg(msg || 'Đã có lỗi xảy ra');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '2rem' }}>👨‍🍳</span>
          <h2 style={styles.title}>{isSignUp ? 'Tạo tài khoản Bếp Nhà' : 'Đăng nhập Bếp Nhà'}</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Đồng bộ thực đơn và giỏ đi chợ trên mọi thiết bị
          </p>
        </div>

        {/* Tab chuyển đổi Số điện thoại / Email */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => { setAuthMethod('phone'); setErrorMsg(''); }}
            style={{
              ...styles.tabBtn,
              ...(authMethod === 'phone' ? styles.tabActive : {}),
            }}
          >
            📱 Số điện thoại
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('email'); setErrorMsg(''); }}
            style={{
              ...styles.tabBtn,
              ...(authMethod === 'email' ? styles.tabActive : {}),
            }}
          >
            ✉️ Email
          </button>
        </div>

        {errorMsg && (
          <div style={styles.errorBox}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} style={styles.form}>
          {authMethod === 'phone' ? (
            <div>
              <label style={styles.label}>Số điện thoại</label>
              <input
                type="tel"
                required
                placeholder="VD: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
              />
            </div>
          ) : (
            <div>
              <label style={styles.label}>Địa chỉ Email</label>
              <input
                type="email"
                required
                placeholder="VD: bepnha@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>
          )}

          <div>
            <label style={styles.label}>Mật khẩu</label>
            <input
              type="password"
              required
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.btnSubmit}>
            {loading ? 'Đang xử lý...' : isSignUp ? 'Đăng ký tài khoản' : 'Đăng nhập'}
          </button>
        </form>

        <div style={styles.footerSwitch}>
          {isSignUp ? (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                style={styles.switchBtn}
              >
                Đăng nhập ngay
              </button>
            </span>
          ) : (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                style={styles.switchBtn}
              >
                Đăng ký miễn phí
              </button>
            </span>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10002,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '420px',
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
    margin: '6px 0 0 0',
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#2d3436',
  },
  tabContainer: {
    display: 'flex',
    gap: '6px',
    background: '#f1f2f6',
    padding: '4px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  tabBtn: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '8px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#636e72',
    cursor: 'pointer',
  },
  tabActive: {
    background: '#fff',
    color: '#2d3436',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
  },
  errorBox: {
    backgroundColor: '#ffeaa7',
    color: '#d63031',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    marginBottom: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: '4px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #dcdde1',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnSubmit: {
    marginTop: '6px',
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  footerSwitch: {
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#636e72',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#0984e3',
    fontWeight: '700',
    cursor: 'pointer',
    padding: 0,
  },
};