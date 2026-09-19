'use client';
import { useState } from 'react';

// Danh sách các nguyên liệu phổ biến trong căn bếp Việt để chọn nhanh
const COMMON_INGREDIENTS = [
  'Trứng', 'Thịt bò', 'Thịt heo', 'Cà chua', 
  'Cần tây', 'Hành lá', 'Tỏi', 'Đậu phụ', 
  'Cà rốt', 'Khoai tây', 'Nấm', 'Ớt'
];

export default function FridgeCleanerModal({
  isOpen,
  onClose,
  recipes = [],
  onOpenDetail,
  onAddMissingToCart
}) {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [customInput, setCustomInput] = useState('');

  if (!isOpen) return null;

  // Thêm/bớt nguyên liệu chọn nhanh
  const toggleIngredient = (name) => {
    const lower = name.toLowerCase();
    setSelectedIngredients((prev) =>
      prev.includes(lower) ? prev.filter((i) => i !== lower) : [...prev, lower]
    );
  };

  // Thêm nguyên liệu tự gõ
  const handleAddCustom = (e) => {
    e.preventDefault();
    const val = customInput.trim().toLowerCase();
    if (val && !selectedIngredients.includes(val)) {
      setSelectedIngredients((prev) => [...prev, val]);
      setCustomInput('');
    }
  };

  // Logic phân tích và xếp hạng món ăn
  const analyzedRecipes = recipes.map((recipe) => {
    const ingredients = recipe.ingredients || [];
    let matchCount = 0;
    const missingItems = [];

    ingredients.forEach((ing) => {
      const ingName = (typeof ing === 'string' ? ing : ing.name || '').toLowerCase();
      const isMatched = selectedIngredients.some((selected) => ingName.includes(selected));
      if (isMatched) {
        matchCount++;
      } else {
        missingItems.push(typeof ing === 'string' ? ing : `${ing.name} (${ing.amountPerPerson || 1} ${ing.unit || ''})`.trim());
      }
    });

    const total = ingredients.length || 1;
    const matchPercentage = Math.round((matchCount / total) * 100);

    return {
      ...recipe,
      matchCount,
      totalIngredients: total,
      matchPercentage,
      missingItems,
    };
  })
  // Chỉ lấy những món có ít nhất 1 nguyên liệu trùng khớp và sắp xếp theo độ phù hợp
  .filter((r) => r.matchCount > 0)
  .sort((a, b) => b.matchPercentage - a.matchPercentage);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={styles.title}>🧊 Dọn tủ lạnh thông minh</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Chọn những nguyên liệu bạn đang có sẵn, Bếp Nhà sẽ tìm món phù hợp nhất!
          </p>
        </div>

        {/* Danh sách chọn nhanh nguyên liệu */}
        <div style={styles.tagsContainer}>
          {COMMON_INGREDIENTS.map((item) => {
            const isSelected = selectedIngredients.includes(item.toLowerCase());
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleIngredient(item)}
                style={{
                  ...styles.tagBtn,
                  backgroundColor: isSelected ? '#27ae60' : '#f1f2f6',
                  color: isSelected ? '#fff' : '#2d3436',
                  borderColor: isSelected ? '#27ae60' : 'transparent',
                }}
              >
                {isSelected ? '✓ ' : '+ '} {item}
              </button>
            );
          })}
        </div>

        {/* Ô nhập nguyên liệu khác */}
        <form onSubmit={handleAddCustom} style={styles.customForm}>
          <input
            type="text"
            placeholder="Hoặc gõ thêm nguyên liệu khác..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            style={styles.customInput}
          />
          <button type="submit" style={styles.btnAddCustom}>Thêm</button>
        </form>

        {/* Đã chọn */}
        {selectedIngredients.length > 0 && (
          <div style={styles.selectedBox}>
            <span style={{ fontSize: '0.8rem', color: '#555', fontWeight: 'bold' }}>Tủ lạnh đang có:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {selectedIngredients.map((ing) => (
                <span key={ing} style={styles.badgeItem}>
                  {ing}
                  <button onClick={() => toggleIngredient(ing)} style={styles.badgeRemove}>✕</button>
                </span>
              ))}
              <button
                onClick={() => setSelectedIngredients([])}
                style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '6px' }}
              >
                Xóa hết
              </button>
            </div>
          </div>
        )}

        {/* Kết quả món gợi ý */}
        <div style={styles.resultSection}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#2d3436' }}>
            Món gợi ý ({analyzedRecipes.length})
          </h4>

          {selectedIngredients.length === 0 ? (
            <p style={styles.emptyText}>Hãy bấm chọn ít nhất một nguyên liệu ở trên để xem gợi ý.</p>
          ) : analyzedRecipes.length === 0 ? (
            <p style={styles.emptyText}>Chưa có món nào trong sổ tay dùng các nguyên liệu này.</p>
          ) : (
            <div style={styles.recipeList}>
              {analyzedRecipes.map((item) => (
                <div key={item.id} style={styles.card}>
                  <img src={item.image} alt={item.title} style={styles.cardImg} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#2d3436' }}>{item.title}</h4>
                      <span
                        style={{
                          ...styles.matchBadge,
                          backgroundColor: item.matchPercentage === 100 ? '#e8f8f5' : '#fef9e7',
                          color: item.matchPercentage === 100 ? '#27ae60' : '#d35400',
                        }}
                      >
                        {item.matchPercentage === 100 ? '🎉 Nấu được ngay' : `Khớp ${item.matchPercentage}%`}
                      </span>
                    </div>

                    {item.missingItems.length > 0 && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#7f8c8d' }}>
                        Còn thiếu: <span style={{ color: '#e74c3c' }}>{item.missingItems.join(', ')}</span>
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenDetail(item);
                        }}
                        style={styles.btnView}
                      >
                        Xem cách nấu
                      </button>

                      {item.missingItems.length > 0 && onAddMissingToCart && (
                        <button
                          onClick={() => onAddMissingToCart(item.title, item.missingItems)}
                          style={styles.btnAddCart}
                        >
                          + Mua đồ còn thiếu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
    position: 'relative',
    boxSizing: 'border-box',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
  },
  title: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#2d3436',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
    maxHeight: '110px',
    overflowY: 'auto',
  },
  tagBtn: {
    padding: '5px 10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  customForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  customInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '0.85rem',
    outline: 'none',
  },
  btnAddCustom: {
    padding: '8px 14px',
    background: '#2d3436',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  selectedBox: {
    backgroundColor: '#f8f9fa',
    padding: '8px 12px',
    borderRadius: '10px',
    marginBottom: '12px',
    textAlign: 'left',
  },
  badgeItem: {
    backgroundColor: '#e1f5fe',
    color: '#0288d1',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  badgeRemove: {
    background: 'none',
    border: 'none',
    color: '#0288d1',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: 0,
  },
  resultSection: {
    flex: 1,
    overflowY: 'auto',
    textAlign: 'left',
    borderTop: '1px solid #eee',
    paddingTop: '12px',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: '0.85rem',
    padding: '30px 0',
  },
  recipeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    display: 'flex',
    gap: '12px',
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid #eee',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cardImg: {
    width: '65px',
    height: '65px',
    borderRadius: '8px',
    objectFit: 'cover',
  },
  matchBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  btnView: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    background: '#fff',
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  btnAddCart: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: 'none',
    background: '#0068FF',
    color: '#fff',
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
};