'use client';
import { useState, useEffect } from 'react';
import AiScannerModal from './AiScannerModal';

// Danh sách các nguyên liệu phổ biến trong căn bếp Việt để chọn nhanh
const COMMON_INGREDIENTS = [
  'Trứng', 'Thịt bò', 'Thịt heo', 'Cà chua', 
  'Cần tây', 'Hành lá', 'Tỏi', 'Đậu phụ', 
  'Cà rốt', 'Khoai tây', 'Nấm', 'Ớt'
];

// Gia vị cơ bản không phạt điểm
const STAPLE_PANTRY = [
  'muối', 'đường', 'tiêu', 'hạt tiêu', 'nước mắm', 'mắm', 'hạt nêm',
  'bột ngọt', 'mì chính', 'dầu ăn', 'mỡ', 'nước tương', 'xì dầu',
  'dầu hào', 'ớt bột', 'gia vị', 'nêm nếm'
];

const isStapleSeasoning = (name = '') => {
  const clean = name.toLowerCase().trim();
  return STAPLE_PANTRY.some(item => clean.includes(item) || item.includes(clean));
};

export default function FridgeCleanerModal({
  isOpen,
  onClose,
  recipes = [],
  fridgeItems = [],            // Nhận kho đồ từ trang chủ truyền vào
  onUpdateFridge,              // Nhận hàm cập nhật từ trang chủ
  onOpenDetail,
  onAddMissingToCart
}) {
  // Dự phòng nếu trang chủ chưa truyền props thì dùng state nội bộ + localStorage
  const [internalItems, setInternalItems] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bepnha_fridge_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        setInternalItems(parsed);
        if (onUpdateFridge && (!fridgeItems || fridgeItems.length === 0)) {
          onUpdateFridge(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Danh sách đang dùng: ưu tiên lấy từ props trang chủ
  const currentFridge = (onUpdateFridge && Array.isArray(fridgeItems)) ? fridgeItems : internalItems;

  const handleSaveFridge = (newItems) => {
    if (onUpdateFridge) {
      onUpdateFridge(newItems);
    }
    setInternalItems(newItems);
    try {
      localStorage.setItem('bepnha_fridge_items', JSON.stringify(newItems));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  // Thêm/bớt nguyên liệu chọn nhanh
  const toggleIngredient = (name) => {
    const lower = name.toLowerCase().trim();
    const updated = currentFridge.includes(lower)
      ? currentFridge.filter((i) => i !== lower)
      : [...currentFridge, lower];
    handleSaveFridge(updated);
  };

  // Thêm nguyên liệu tự gõ
  const handleAddCustom = (e) => {
    e.preventDefault();
    const val = customInput.trim().toLowerCase();
    if (val && !currentFridge.includes(val)) {
      handleSaveFridge([...currentFridge, val]);
      setCustomInput('');
    }
  };

  // Xóa toàn bộ tủ lạnh
  const handleClearAll = () => {
    handleSaveFridge([]);
  };

  // Phân tích và xếp hạng món ăn
  const analyzedRecipes = recipes.map((recipe) => {
    const ingredients = recipe.ingredients || [];
    let matchCount = 0;
    const missingItems = [];
    const availableItems = [];

    const mainIngredients = ingredients.filter(ing => {
      const ingName = (typeof ing === 'string' ? ing : ing.name || '');
      return !isStapleSeasoning(ingName);
    });

    const targetList = mainIngredients.length > 0 ? mainIngredients : ingredients;

    targetList.forEach((ing) => {
      const ingName = (typeof ing === 'string' ? ing : ing.name || '').toLowerCase();
      const isMatched = currentFridge.some((selected) => 
        ingName.includes(selected) || selected.includes(ingName)
      );

      if (isMatched) {
        matchCount++;
        availableItems.push(typeof ing === 'string' ? ing : ing.name);
      } else {
        const itemStr = typeof ing === 'string' 
          ? ing 
          : `${ing.name} (${ing.amount || ing.amountPerPerson || 1} ${ing.unit || ''})`.trim();
        missingItems.push(itemStr);
      }
    });

    const total = targetList.length || 1;
    const matchPercentage = Math.round((matchCount / total) * 100);

    return {
      ...recipe,
      matchCount,
      totalIngredients: total,
      matchPercentage,
      missingItems,
      availableItems,
      canCookNow: missingItems.length === 0 && matchCount > 0,
    };
  })
  .filter((r) => r.matchCount > 0)
  .sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return a.missingItems.length - b.missingItems.length;
  });

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>

          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h2 style={styles.title}>🧊 Dọn tủ lạnh thông minh</h2>
            <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Chọn hoặc chụp ảnh tủ lạnh, Bếp Nhà sẽ tìm món phù hợp nhất!
            </p>
          </div>

          {/* Nút AI Scanner */}
          <div style={{ marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setIsAiScannerOpen(true)}
              style={styles.btnAiScan}
            >
              🤖📸 Quét tủ lạnh / Hóa đơn bằng AI
            </button>
          </div>

          {/* Chọn nhanh */}
          <div style={styles.tagsContainer}>
            {COMMON_INGREDIENTS.map((item) => {
              const isSelected = currentFridge.includes(item.toLowerCase());
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

          {/* Ô nhập */}
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

          {/* Tồn kho tủ lạnh hiện tại */}
          <div style={styles.selectedBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#2d3436', fontWeight: 'bold' }}>
                🧊 Tồn kho tủ lạnh đang có ({currentFridge.length}):
              </span>
              {currentFridge.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {currentFridge.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Tủ lạnh đang trống, hãy chọn nguyên liệu ở trên.</span>
              ) : (
                currentFridge.map((ing) => (
                  <span key={ing} style={styles.badgeItem}>
                    {ing}
                    <button onClick={() => toggleIngredient(ing)} style={styles.badgeRemove}>✕</button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Danh sách món gợi ý */}
          <div style={styles.resultSection}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#2d3436' }}>
              Món gợi ý ({analyzedRecipes.length})
            </h4>

            {currentFridge.length === 0 ? (
              <p style={styles.emptyText}>Hãy bấm chọn hoặc dùng AI quét nguyên liệu ở trên để xem gợi ý.</p>
            ) : analyzedRecipes.length === 0 ? (
              <p style={styles.emptyText}>Chưa có món nào trong sổ tay dùng các nguyên liệu này.</p>
            ) : (
              <div style={styles.recipeList}>
                {analyzedRecipes.map((item) => (
                  <div key={item.id} style={styles.card}>
                    <img 
                      src={item.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=150'} 
                      alt={item.title} 
                      style={styles.cardImg} 
                    />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#2d3436' }}>{item.title}</h4>
                        <span
                          style={{
                            ...styles.matchBadge,
                            backgroundColor: item.canCookNow ? '#e8f8f5' : '#fef9e7',
                            color: item.canCookNow ? '#27ae60' : '#d35400',
                          }}
                        >
                          {item.canCookNow ? '🎉 Nấu được ngay' : `Khớp ${item.matchPercentage}%`}
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
                            if (onOpenDetail) onOpenDetail(item);
                          }}
                          style={styles.btnView}
                        >
                          Xem cách nấu
                        </button>

                        {item.missingItems.length > 0 && onAddMissingToCart && (
                          <button
                            onClick={() => {
                              onAddMissingToCart(item.title, item.missingItems);
                              alert(`Đã thêm nguyên liệu còn thiếu của món "${item.title}" vào giỏ đi chợ!`);
                            }}
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

      <AiScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        onApplyItems={(items) => {
          const newNames = items.map((i) => i.name.toLowerCase().trim());
          const merged = Array.from(new Set([...currentFridge, ...newNames]));
          handleSaveFridge(merged);
        }}
      />
    </>
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
  btnAiScan: {
    width: '100%',
    backgroundColor: '#8e44ad',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(142, 68, 173, 0.25)',
    transition: 'all 0.2s',
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
    padding: '10px 14px',
    borderRadius: '12px',
    marginBottom: '12px',
    textAlign: 'left',
    border: '1px solid #edf2f7',
  },
  badgeItem: {
    backgroundColor: '#e1f5fe',
    color: '#0288d1',
    padding: '3px 9px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  badgeRemove: {
    background: 'none',
    border: 'none',
    color: '#0288d1',
    cursor: 'pointer',
    fontSize: '0.8rem',
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