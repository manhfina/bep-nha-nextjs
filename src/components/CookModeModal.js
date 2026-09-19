'use client';
import { useState, useEffect, useRef } from 'react';

// Hàm quét tự động số phút trong chuỗi văn bản (VD: "5 phút", "10 min", "15p")
const detectMinutes = (text = '') => {
  const match = text.match(/(\d+)\s*(phút|mins?|p\b)/i);
  return match ? parseInt(match[1], 10) : null;
};

// Phát chuông báo bằng Web Audio API không cần tải file ngoài
const playAlarmSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Tạo 3 tiếng bíp liên tiếp
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // Nốt La (A5)
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch (err) {
    console.warn('Audio play blocked:', err);
  }
};

export default function CookModeModal({
  recipe,
  step = 0,
  onClose,
  onPrevStep,
  onNextStep,
}) {
  const steps = recipe?.steps || [];
  const currentStepText = steps[step] || '';

  // Quản lý đồng hồ
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  // Khi chuyển bước nấu, tự nhận diện thời gian gợi ý cho bước đó
  useEffect(() => {
    clearInterval(timerRef.current);
    setIsRunning(false);

    const detected = detectMinutes(currentStepText);
    if (detected) {
      setSecondsLeft(detected * 60);
    } else {
      setSecondsLeft(0);
    }

    return () => clearInterval(timerRef.current);
  }, [step, currentStepText]);

  // Bộ đếm thời gian
  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            playAlarmSound();
            if (navigator.vibrate) navigator.vibrate([300, 200, 300]);
            alert('⏰ Hết giờ cho bước này rồi!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, secondsLeft]);

  if (!recipe) return null;

  // Định dạng mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const addTime = (additionalMins) => {
    setSecondsLeft((prev) => prev + additionalMins * 60);
  };

  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round(((step + 1) / totalSteps) * 100) : 100;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <span style={styles.subTitle}>Chế độ nấu ăn tập trung</span>
            <h2 style={styles.recipeTitle}>{recipe.title}</h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕ Thoát</button>
        </div>

        {/* Thanh tiến độ */}
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
        </div>
        <div style={styles.stepCounter}>
          Bước {step + 1} / {totalSteps || 1} ({progress}%)
        </div>

        {/* Nội dung bước hiện tại */}
        <div style={styles.contentBox}>
          <p style={styles.stepText}>{currentStepText || 'Chưa có hướng dẫn cho bước này.'}</p>
        </div>

        {/* Khối Đồng Hồ Bấm Giờ (Cooking Timer) */}
        <div style={styles.timerCard}>
          <div style={styles.timerDisplay}>
            <span style={{ fontSize: '1.8rem', marginRight: '8px' }}>⏱️</span>
            <span style={styles.timerDigits}>{formatTime(secondsLeft)}</span>
          </div>

          <div style={styles.timerControls}>
            {isRunning ? (
              <button onClick={() => setIsRunning(false)} style={styles.btnPause}>
                ⏸ Tạm dừng
              </button>
            ) : (
              <button
                onClick={() => {
                  if (secondsLeft === 0) setSecondsLeft(180); // Mặc định 3 phút nếu đang là 0
                  setIsRunning(true);
                }}
                style={styles.btnStart}
              >
                ▶ {secondsLeft > 0 ? 'Bắt đầu đếm' : 'Hẹn nhanh 3 phút'}
              </button>
            )}

            <button
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft(0);
              }}
              style={styles.btnReset}
            >
              Đặt lại
            </button>
          </div>

          {/* Các nút bấm cộng nhanh phút */}
          <div style={styles.quickAddRow}>
            <span>Cộng thêm:</span>
            <button onClick={() => addTime(1)} style={styles.quickBtn}>+1p</button>
            <button onClick={() => addTime(3)} style={styles.quickBtn}>+3p</button>
            <button onClick={() => addTime(5)} style={styles.quickBtn}>+5p</button>
          </div>
        </div>

        {/* Nút điều hướng các bước */}
        <div style={styles.navActions}>
          <button
            onClick={onPrevStep}
            disabled={step === 0}
            style={{
              ...styles.btnNav,
              opacity: step === 0 ? 0.4 : 1,
              cursor: step === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Bước trước
          </button>

          <button
            onClick={onNextStep}
            style={{
              ...styles.btnNav,
              backgroundColor: '#e67e22',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
            }}
          >
            {step < totalSteps - 1 ? 'Bước tiếp theo →' : '🎉 Hoàn thành món!'}
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
    backgroundColor: '#1e272e',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10001,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#2f3542',
    color: '#ffffff',
    borderRadius: '24px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  subTitle: {
    fontSize: '0.8rem',
    color: '#a4b0be',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  recipeTitle: {
    margin: '4px 0 0 0',
    fontSize: '1.35rem',
    color: '#ffa502',
    fontWeight: '700',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#ced6e0',
    padding: '6px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2ed573',
    transition: 'width 0.3s ease',
  },
  stepCounter: {
    fontSize: '0.8rem',
    color: '#a4b0be',
    marginBottom: '14px',
  },
  contentBox: {
    backgroundColor: '#3742fa15',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
    minHeight: '110px',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
  },
  stepText: {
    fontSize: '1.15rem',
    lineHeight: '1.6',
    margin: 0,
    color: '#f1f2f6',
    fontWeight: '500',
  },
  timerCard: {
    backgroundColor: '#1e272e',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'center',
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  timerDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  timerDigits: {
    fontSize: '2.5rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#70a1ff',
    letterSpacing: '2px',
  },
  timerControls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  btnStart: {
    backgroundColor: '#2ed573',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  btnPause: {
    backgroundColor: '#ffa502',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  btnReset: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ced6e0',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  quickAddRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    color: '#a4b0be',
  },
  quickBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#70a1ff',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  navActions: {
    display: 'flex',
    gap: '12px',
    marginTop: 'auto',
  },
  btnNav: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    color: '#f1f2f6',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};