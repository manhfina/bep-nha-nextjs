'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        // Đăng ký tài khoản mới
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('🎉 Đăng ký thành công! Bạn có thể sử dụng ngay.');
        if (onAuthSuccess) onAuthSuccess(data.user);
        onClose();
      } else {
        // Đăng nhập
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '2rem' }}>👨‍🍳</span>
          <h2 style={styles.title}>{isSignUp ? 'Tạo tài khoản Bếp Nhà' : 'Đăng nhập Bếp Nhà'}</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '6px 0 0 0' }}>
            Đồng bộ công thức, giỏ đi chợ và thực đơn trên mọi thiết bị
          </p>
        </div>

        {errorMsg && (
          <div style={styles.errorBox}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            required
            placeholder="vd: bepnha@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Mật khẩu</label>
          <input
            type="password"
            required
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

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
    padding: '28px',
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
    margin: '8px 0 0 0',
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#2d3436',
  },
  errorBox: {
    backgroundColor: '#ffeaa7',
    color: '#d63031',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    marginBottom: '16px',
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
    marginBottom: '-6px',
  },
  input: {
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid #dcdde1',
    fontSize: '0.9rem',
    outline: 'none',
  },
  btnSubmit: {
    marginTop: '8px',
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
    marginTop: '18px',
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