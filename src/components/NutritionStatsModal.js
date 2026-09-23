'use client';
import { useMemo } from 'react';

// Bảng từ khóa phân loại dinh dưỡng
const NUTRITION_GROUPS = {
  protein: {
    name: 'Đạm động vật',
    color: '#e74c3c',
    icon: '🥩',
    keywords: ['thịt', 'bò', 'heo', 'lợn', 'gà', 'trứng', 'đậu phụ', 'tàu hũ'],
  },
  seafood: {
    name: 'Hải sản (Omega-3)',
    color: '#3498db',
    icon: '🦐',
    keywords: ['tôm', 'cua', 'mực', 'cá', 'nghêu', 'sò', 'ốc'],
  },
  fiber: {
    name: 'Rau xanh & Chất xơ',
    color: '#2ecc71',
    icon: '🥬',
    keywords: ['rau', 'cải', 'cà rốt', 'cà chua', 'cần tây', 'nấm', 'hành', 'dưa', 'khoai'],
  },
  carbs: {
    name: 'Tinh bột & Khác',
    color: '#f39c12',
    icon: '🍜',
    keywords: ['mì', 'bún', 'phở', 'miến', 'gạo', 'bột'],
  },
};

export default function NutritionStatsModal({
  isOpen,
  onClose,
  recipes = [],
  shoppingList = [],
  fridgeItems = [],
  priceMap = {},
}) {
  if (!isOpen) return null;

  // 1. Tính toán phân bổ dinh dưỡng từ các món ăn hiện có hoặc giỏ hàng
  const nutritionStats = useMemo(() => {
    let counts = { protein: 0, seafood: 0, fiber: 0, carbs: 0 };
    let totalIngredients = 0;

    const sourceTexts = shoppingList.length > 0 
      ? shoppingList.map((i) => i.text.toLowerCase())
      : recipes.flatMap((r) => (r.ingredients || []).map((ing) => (typeof ing === 'string' ? ing : ing.name || '').toLowerCase()));

    sourceTexts.forEach((text) => {
      let matched = false;
      for (const [groupKey, group] of Object.entries(NUTRITION_GROUPS)) {
        if (group.keywords.some((k) => text.includes(k))) {
          counts[groupKey]++;
          matched = true;
          break;
        }
      }
      if (matched) totalIngredients++;
    });

    if (totalIngredients === 0) totalIngredients = 1;

    const percentages = {
      protein: Math.round((counts.protein / totalIngredients) * 100),
      seafood: Math.round((counts.seafood / totalIngredients) * 100),
      fiber: Math.round((counts.fiber / totalIngredients) * 100),
      carbs: Math.round((counts.carbs / totalIngredients) * 100),
    };

    // Đánh giá chỉ số cân đối (Score / 100)
    let score = 70;
    if (percentages.fiber >= 30) score += 15;
    if (percentages.seafood >= 15) score += 10;
    if (percentages.protein >= 25 && percentages.protein <= 45) score += 5;
    score = Math.min(score, 100);

    return { counts, percentages, totalIngredients, score };
  }, [recipes, shoppingList]);

  // 2. Tính toán tài chính: Ngân sách cần chi & Số tiền tiết kiệm nhờ tủ lạnh
  const financialStats = useMemo(() => {
    const fridgeSet = new Set(fridgeItems.map((f) => f.toLowerCase().trim()));
    let savedMoney = 0;
    let actualSpending = 0;

    shoppingList.forEach((item) => {
      const text = item.text.toLowerCase();
      const inFridge = Array.from(fridgeSet).some((f) => text.includes(f));
      
      // Ước tính trung bình món nguyên liệu
      const itemEstPrice = 15000; 
      if (inFridge) {
        savedMoney += itemEstPrice;
      } else {
        actualSpending += itemEstPrice;
      }
    });

    return { savedMoney, actualSpending };
  }, [shoppingList, fridgeItems]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        {/* Tiêu đề */}
        <div style={styles.header}>
          <h2 style={styles.title}>📊 Báo Cáo Dinh Dưỡng & Chi Tiêu</h2>
          <span style={{ fontSize: '0.82rem', color: '#636e72' }}>
            Tổng hợp mức cân đối thực phẩm & ngân sách gia đình
          </span>
        </div>

        <div style={styles.body}>
          {/* Card Tiết Kiệm (Reward Loop) */}
          <div style={styles.rewardCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '2rem' }}>💰</span>
              <div>
                <strong style={{ fontSize: '1.05rem', color: '#27ae60' }}>
                  Tiết kiệm: ~{financialStats.savedMoney.toLocaleString('vi-VN')} VNĐ
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#4a5568', display: 'block', marginTop: '2px' }}>
                  Nhờ tận dụng sẵn {fridgeItems.length} nguyên liệu trong tủ lạnh mà không phải mua thêm!
                </span>
              </div>
            </div>
          </div>

          {/* Điểm Cân Bằng Dinh Dưỡng */}
          <div style={styles.scoreBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#2d3436' }}>Chỉ số bữa ăn lành mạnh</strong>
                <span style={{ fontSize: '0.75rem', color: '#718096', display: 'block' }}>
                  Dựa trên tỷ lệ rau củ, hải sản và lượng protein
                </span>
              </div>
              <div style={styles.scoreBadge}>
                {nutritionStats.score} <span style={{ fontSize: '0.65rem' }}>/ 100</span>
              </div>
            </div>

            {/* Thanh dinh dưỡng tổng hợp */}
            <div style={styles.progressBarWrapper}>
              <div style={{ ...styles.progressSegment, width: `${nutritionStats.percentages.fiber}%`, backgroundColor: '#2ecc71' }} title="Rau xanh" />
              <div style={{ ...styles.progressSegment, width: `${nutritionStats.percentages.protein}%`, backgroundColor: '#e74c3c' }} title="Đạm động vật" />
              <div style={{ ...styles.progressSegment, width: `${nutritionStats.percentages.seafood}%`, backgroundColor: '#3498db' }} title="Hải sản" />
              <div style={{ ...styles.progressSegment, width: `${nutritionStats.percentages.carbs}%`, backgroundColor: '#f39c12' }} title="Tinh bột" />
            </div>
          </div>

          {/* Chi tiết từng nhóm dưỡng chất */}
          <div style={styles.groupGrid}>
            {Object.entries(NUTRITION_GROUPS).map(([key, group]) => {
              const pct = nutritionStats.percentages[key] || 0;
              return (
                <div key={key} style={styles.groupCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2d3436' }}>
                      {group.icon} {group.name}
                    </span>
                    <strong style={{ color: group.color, fontSize: '0.9rem' }}>{pct}%</strong>
                  </div>
                  <div style={styles.miniBarBackground}>
                    <div style={{ ...styles.miniBarFill, width: `${pct}%`, backgroundColor: group.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lời khuyên thông minh từ Bếp Nhà */}
          <div style={styles.adviceBox}>
            <strong style={{ fontSize: '0.85rem', color: '#8e44ad', display: 'block', marginBottom: '4px' }}>
              💡 Lời khuyên đầu bếp:
            </strong>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#4a5568', lineHeight: '1.4' }}>
              {nutritionStats.percentages.fiber < 25
                ? 'Tuần này thực đơn hơi ít chất xơ. Bạn nên bổ sung thêm các món luộc hoặc canh rau củ tươi nhé!'
                : nutritionStats.percentages.seafood < 15
                ? 'Lượng hải sản trong tuần khá thấp. Thêm 1-2 bữa tôm, mực hoặc cá sẽ giúp bổ sung dồi dào Omega-3 và canxi.'
                : 'Thực đơn của gia đình bạn đang rất cân đối và chuẩn dinh dưỡng. Hãy tiếp tục duy trì nhé!'}
            </p>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10003,
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
  rewardCard: {
    backgroundColor: '#f0fff4',
    border: '1px solid #c6f6d5',
    borderRadius: '16px',
    padding: '14px 16px',
  },
  scoreBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  scoreBadge: {
    backgroundColor: '#27ae60',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '1rem',
  },
  progressBarWrapper: {
    height: '10px',
    backgroundColor: '#edf2f7',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
  },
  progressSegment: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  groupGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  groupCard: {
    backgroundColor: '#fff',
    border: '1px solid #edf2f7',
    borderRadius: '12px',
    padding: '10px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  miniBarBackground: {
    height: '6px',
    backgroundColor: '#f1f2f6',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '6px',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: '4px',
  },
  adviceBox: {
    backgroundColor: '#fbf7ff',
    border: '1px solid #e9d8fd',
    borderRadius: '14px',
    padding: '12px 14px',
  },
};