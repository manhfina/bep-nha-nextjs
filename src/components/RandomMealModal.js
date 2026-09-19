'use client';
import { useState, useEffect } from 'react';

export default function RandomMealModal({ isOpen, onClose, recipes = [], onOpenDetail }) {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Hàm random 1 món hoặc mâm cơm
  const pickRandom = () => {
    if (recipes.length === 0) return;
    setIsSpinning(true);
    
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * recipes.length);
      setSelectedMeal(recipes[randomIndex]);
      setIsSpinning(false);
    }, 400);
  };

  useEffect(() => {
    if (isOpen) {
      pickRandom();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <h2 style={styles.title}>🎲 Hôm nay ăn gì?</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '-10px', marginBottom: '16px' }}>
          Gợi ý món ngon ngẫu nhiên cho bữa cơm gia đình
        </p>

        {isSpinning ? (
          <div style={styles.loadingBox}>
            <p style={{ fontSize: '2.5rem', animation: 'spin 1s infinite' }}>🍳</p>
            <p style={{ fontWeight: '600', color: '#e67e22' }}>Đang chọn món ngon cho bạn...</p>
          </div>
        ) : selectedMeal ? (
          <div style={styles.resultCard}>
            <img 
              src={selectedMeal.image} 
              alt={selectedMeal.title} 
              style={styles.image} 
            />
            <h3 style={styles.dishTitle}>{selectedMeal.title}</h3>
            <p style={styles.desc}>{selectedMeal.desc || 'Món ăn thanh đạm, thơm ngon dễ làm.'}</p>
            
            <div style={styles.meta}>
              <span>⏱️ {selectedMeal.time}</span>
              <span>⭐ {selectedMeal.difficulty}</span>
            </div>

            <div style={styles.actions}>
              <button 
                onClick={pickRandom} 
                style={styles.btnSecondary}
              >
                🔄 Đổi món khác
              </button>
              <button 
                onClick={() => {
                  onClose();
                  onOpenDetail(selectedMeal);
                }} 
                style={styles.btnPrimary}
              >
                📖 Xem cách nấu
              </button>
            </div>
          </div>
        ) : (
          <p>Chưa có món ăn nào trong danh sách!</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '420px',
    width: '100%',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    textAlign: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '1.4rem',
    color: '#2d3436',
  },
  loadingBox: {
    padding: '40px 0',
  },
  resultCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  image: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    borderRadius: '16px',
  },
  dishTitle: {
    margin: '8px 0 2px 0',
    fontSize: '1.25rem',
    color: '#2d3436',
  },
  desc: {
    fontSize: '0.85rem',
    color: '#7f8c8d',
    margin: '0 0 8px 0',
    lineHeight: 1.4,
  },
  meta: {
    display: 'flex',
    gap: '15px',
    fontSize: '0.85rem',
    color: '#e67e22',
    fontWeight: '600',
    marginBottom: '10px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    marginTop: '6px',
  },
  btnSecondary: {
    flex: 1,
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid #ccc',
    background: '#f8f9fa',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#444',
  },
  btnPrimary: {
    flex: 1,
    padding: '10px',
    borderRadius: '12px',
    border: 'none',
    background: '#e67e22',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
  },
};