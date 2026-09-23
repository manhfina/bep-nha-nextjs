'use client';
import { useState, useEffect } from 'react';
import ShareRecipeModal from './ShareRecipeModal';
import { calculateIngredientCost, calculateRecipeTotalCost } from '@/lib/priceCalculator';

// Bảng dữ liệu dinh dưỡng cục bộ (trên 100g hoặc 1 đơn vị đếm)
const NUTRITION_DATABASE = {
  'thịt bò': { cal: 250, protein: 26, carbs: 0, fat: 15 },
  'bắp bò': { cal: 215, protein: 28, carbs: 0, fat: 11 },
  'thịt heo': { cal: 242, protein: 27, carbs: 0, fat: 14 },
  'thịt lợn': { cal: 242, protein: 27, carbs: 0, fat: 14 },
  'thịt ba chỉ': { cal: 518, protein: 12, carbs: 0, fat: 53 },
  'thịt xay': { cal: 260, protein: 18, carbs: 0, fat: 21 },
  'thịt gà': { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  'ức gà': { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  'cua đồng': { cal: 89, protein: 12.3, carbs: 2, fat: 3.3 },
  'tôm': { cal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  'mực': { cal: 92, protein: 15.6, carbs: 3.1, fat: 1.4 },
  'cá': { cal: 105, protein: 18, carbs: 0, fat: 3.5 },
  'trứng': { cal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  'đậu phụ': { cal: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  'mì': { cal: 138, protein: 4.5, carbs: 28, fat: 1.1 },
  'bún': { cal: 110, protein: 1.7, carbs: 25.7, fat: 0 },
  'cơm': { cal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
  'cà chua': { cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  'cà tím': { cal: 25, protein: 1, carbs: 6, fat: 0.2 },
  'cà rốt': { cal: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
  'khoai tây': { cal: 77, protein: 2, carbs: 17, fat: 0.1 },
  'rau cải': { cal: 15, protein: 1.5, carbs: 2.2, fat: 0.2 },
  'cải ngọt': { cal: 16, protein: 1.7, carbs: 2.5, fat: 0.2 },
  'rau muống': { cal: 19, protein: 3, carbs: 2.1, fat: 0.4 },
  'cần tây': { cal: 16, protein: 0.7, carbs: 3, fat: 0.2 },
  'nấm': { cal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  'dầu ăn': { cal: 884, protein: 0, carbs: 0, fat: 100 },
};

function getNutrientInfo(rawName = '') {
  const name = rawName.toLowerCase();
  for (const [key, val] of Object.entries(NUTRITION_DATABASE)) {
    if (name.includes(key) || key.includes(name)) return val;
  }
  return { cal: 35, protein: 1.2, carbs: 6, fat: 0.5 };
}

function parseIngData(ing) {
  if (typeof ing === 'object' && ing !== null) {
    return {
      name: (ing.name || '').toLowerCase().trim(),
      amount: parseFloat(ing.amount || ing.amountPerPerson || 100) || 100,
      unit: (ing.unit || 'g').toLowerCase().trim(),
    };
  }

  const rawText = String(ing || '').toLowerCase().trim();
  let name = rawText;
  let amount = 100;
  let unit = 'g';

  const matchColon = rawText.match(/^(.*?):\s*([\d.,]+)\s*(.*)$/);
  if (matchColon) {
    name = matchColon[1].trim();
    amount = parseFloat(matchColon[2].replace(',', '.')) || 100;
    unit = matchColon[3].trim() || 'g';
  } else {
    const matchPrefix = rawText.match(/^([\d.,]+)\s*([a-zA-Zà-ỹ]+)?\s+(.+)$/);
    if (matchPrefix) {
      amount = parseFloat(matchPrefix[1].replace(',', '.')) || 100;
      unit = matchPrefix[2]?.trim() || 'g';
      name = matchPrefix[3].trim();
    }
  }

  return { name, amount, unit };
}

function calcNutrition(ingredients = [], servings = 2, baseServings = 2) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, caloriesPerServing: 0 };
  }

  const ratio = (servings || 2) / (baseServings || 2);
  let totalCal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  ingredients.forEach((ing) => {
    const { name, amount, unit } = parseIngData(ing);
    const info = getNutrientInfo(name);

    let weightFactor = 1;
    if (['g', 'gram', 'gr'].includes(unit)) {
      weightFactor = amount / 100;
    } else if (unit === 'kg') {
      weightFactor = (amount * 1000) / 100;
    } else if (unit === 'lạng') {
      weightFactor = (amount * 100) / 100;
    } else if (['quả', 'trái', 'bìa', 'miếng', 'vắt', 'củ'].includes(unit)) {
      weightFactor = amount;
    } else if (['thìa', 'muỗng', 'ít', 'chút'].includes(unit)) {
      weightFactor = 0.1;
    }

    const cur = weightFactor * ratio;
    totalCal += info.cal * cur;
    totalProtein += info.protein * cur;
    totalCarbs += info.carbs * cur;
    totalFat += info.fat * cur;
  });

  const finalCal = Math.round(totalCal);
  const count = Math.max(1, servings);

  return {
    calories: finalCal,
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    caloriesPerServing: Math.round(finalCal / count),
  };
}

export default function RecipeDetailModal({
  recipe,
  servings = 2,
  onClose,
  onChangeServings,
  onAddToCart,
  onEdit,
  onStartCook,
  currentUser,
  currentKitchen,
  priceMap = {},
}) {
  const [activeTab, setActiveTab] = useState('recipe');
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const fetchNotes = async () => {
    if (!recipe?.id) return;
    setLoadingNotes(true);
    try {
      const kitchenParam = currentKitchen?.id ? `&kitchenId=${currentKitchen.id}` : '';
      const res = await fetch(`/api/recipe-notes?recipeId=${recipe.id}${kitchenParam}`);
      const data = await res.json();
      if (Array.isArray(data)) setNotes(data);
    } catch (err) {
      console.error('Lỗi tải ghi chú:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (recipe?.id) {
      fetchNotes();
      setActiveTab('recipe');
      setNewNote('');
      setNewRating(5);
      setIsShareOpen(false);
    }
  }, [recipe?.id]);

  if (!recipe) return null;

  const totalCost = calculateRecipeTotalCost(recipe, priceMap, servings);
  const nutrition = calcNutrition(recipe.ingredients || [], servings, recipe.baseServings || 2);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const userIdentifier =
        currentUser?.user_metadata?.raw_phone ||
        (currentUser?.email?.includes('@phone.bepnha.com')
          ? currentUser.email.replace('@phone.bepnha.com', '')
          : currentUser?.email?.includes('@bep-nha-nextjs.vercel.app')
          ? currentUser.email.replace('@bep-nha-nextjs.vercel.app', '')
          : currentUser?.email?.split('@')[0] || 'Khách');

      const res = await fetch('/api/recipe-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: recipe.id,
          kitchenId: currentKitchen?.id || null,
          userId: currentUser?.id || null,
          userIdentifier,
          rating: newRating,
          note: newNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể lưu ghi chú');

      setNotes((prev) => [data, ...prev]);
      setNewNote('');
      setNewRating(5);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) return;
    try {
      const res = await fetch(`/api/recipe-notes?id=${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa');
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      alert(err.message);
    }
  };

  const avgRating =
    notes.length > 0
      ? (notes.reduce((sum, n) => sum + (n.rating || 5), 0) / notes.length).toFixed(1)
      : null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Đóng">✕</button>

          {/* Ảnh và tiêu đề */}
          <div style={styles.imageContainer}>
            <img src={recipe.image} alt={recipe.title} style={styles.image} />
            <div style={styles.headerInfo}>
              <h2 style={styles.title}>{recipe.title}</h2>
              <div style={styles.metaRow}>
                <span>⏱️ {recipe.time}</span>
                <span>🔥 {recipe.difficulty || 'Dễ'}</span>
                {avgRating && (
                  <span style={styles.avgBadge}>
                    ⭐ {avgRating} ({notes.length})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab */}
          <div style={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab('recipe')}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'recipe' ? styles.tabActive : {}),
              }}
            >
              📖 Công thức & Các bước
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'notes' ? styles.tabActive : {}),
              }}
            >
              ⭐ Mẹo & Đánh giá ({notes.length})
            </button>
          </div>

          {/* Nội dung */}
          <div style={styles.bodyContent}>
            {activeTab === 'recipe' ? (
              <>
                {/* Khẩu phần ăn */}
                <div style={styles.servingsCard}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2d3436' }}>
                    Khẩu phần ăn:
                  </span>
                  <div style={styles.servingsControls}>
                    <button
                      onClick={() => onChangeServings(Math.max(1, servings - 1))}
                      style={styles.servingsBtn}
                      disabled={servings <= 1}
                    >
                      -
                    </button>
                    <span style={styles.servingsValue}>{servings} người</span>
                    <button
                      onClick={() => onChangeServings(servings + 1)}
                      style={styles.servingsBtn}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* BẢNG DINH DƯỠNG & MACRO */}
                <div style={styles.macroCard}>
                  <div style={styles.macroHeader}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#2d3436' }}>
                      📊 Dinh dưỡng ước tính ({servings} người):
                    </span>
                    <span style={styles.calPerPerson}>
                      ~{nutrition.caloriesPerServing} kcal/người
                    </span>
                  </div>

                  <div style={styles.macroGrid}>
                    <div style={{ ...styles.macroItem, backgroundColor: '#fff5f5' }}>
                      <span style={styles.macroLabel}>🔥 Năng lượng</span>
                      <strong style={{ ...styles.macroVal, color: '#e74c3c' }}>{nutrition.calories} kcal</strong>
                    </div>
                    <div style={{ ...styles.macroItem, backgroundColor: '#f0fff4' }}>
                      <span style={styles.macroLabel}>🥩 Đạm</span>
                      <strong style={{ ...styles.macroVal, color: '#27ae60' }}>{nutrition.protein}g</strong>
                    </div>
                    <div style={{ ...styles.macroItem, backgroundColor: '#fffaf0' }}>
                      <span style={styles.macroLabel}>🌾 Tinh bột</span>
                      <strong style={{ ...styles.macroVal, color: '#d35400' }}>{nutrition.carbs}g</strong>
                    </div>
                    <div style={{ ...styles.macroItem, backgroundColor: '#ebf8ff' }}>
                      <span style={styles.macroLabel}>🥑 Chất béo</span>
                      <strong style={{ ...styles.macroVal, color: '#3182ce' }}>{nutrition.fat}g</strong>
                    </div>
                  </div>
                </div>

                {/* Hộp chi phí ước tính */}
                {totalCost > 0 && (
                  <div style={styles.costBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>💰</span>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#27ae60', fontWeight: '600' }}>
                          Ước tính chi phí chợ ({servings} người)
                        </div>
                        <div style={{ fontSize: '1.1rem', color: '#2d3436', fontWeight: '800' }}>
                          ~{totalCost.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>
                      ~{Math.round(totalCost / servings).toLocaleString('vi-VN')} đ/người
                    </span>
                  </div>
                )}

                <h3 style={styles.sectionTitle}>Nguyên liệu cần chuẩn bị</h3>
                <ul style={styles.ingredientList}>
                  {(recipe.ingredients || []).map((item, idx) => {
                    const ingCostInfo = calculateIngredientCost(
                      item,
                      priceMap,
                      recipe.baseServings || 2,
                      servings
                    );

                    return (
                      <li key={idx} style={styles.ingredientItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span>
                            {typeof item === 'string' ? (
                              item
                            ) : (
                              <>
                                <strong>{item.name}</strong>:{' '}
                                {((item.amountPerPerson || 1) * servings)
                                  .toFixed(1)
                                  .replace(/\.0$/, '')}{' '}
                                {item.unit}
                              </>
                            )}
                          </span>

                          {ingCostInfo?.cost > 0 && (
                            <span style={styles.ingCostTag}>
                              ~{ingCostInfo.cost.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <h3 style={styles.sectionTitle}>Các bước thực hiện</h3>
                <div style={styles.stepList}>
                  {(recipe.steps || []).map((step, idx) => (
                    <div key={idx} style={styles.stepItem}>
                      <span style={styles.stepBadge}>{idx + 1}</span>
                      <p style={styles.stepText}>{step}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <form onSubmit={handleAddNote} style={styles.noteForm}>
                  <div style={styles.ratingPickerRow}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2d3436' }}>
                      Chấm điểm:
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            padding: 0,
                            opacity: star <= newRating ? 1 : 0.25,
                          }}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    required
                    rows="2"
                    placeholder="Ghi lại kinh nghiệm của nhà mình (VD: bớt 1 thìa muối, nướng thêm 3 phút thơm hơn...)"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    style={styles.noteInput}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={submittingNote} style={styles.btnSaveNote}>
                      {submittingNote ? 'Đang lưu...' : '💾 Lưu kinh nghiệm'}
                    </button>
                  </div>
                </form>

                {loadingNotes ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                    Đang tải mẹo nấu của bếp...
                  </p>
                ) : notes.length === 0 ? (
                  <div style={styles.emptyNotes}>
                    <span style={{ fontSize: '2rem' }}>📝</span>
                    <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '0.88rem' }}>
                      Chưa có ghi chú nào cho món này. Hãy chia sẻ mẹo nấu của bạn!
                    </p>
                  </div>
                ) : (
                  <div style={styles.notesFeed}>
                    {notes.map((item) => (
                      <div key={item.id} style={styles.noteCard}>
                        <div style={styles.noteHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#2d3436' }}>
                              👤 {item.user_identifier}
                            </span>
                            <span style={styles.starDisplay}>
                              {'⭐'.repeat(item.rating || 5)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#a4b0be' }}>
                              {new Date(item.created_at).toLocaleDateString('vi-VN')}
                            </span>
                            {currentUser?.id === item.user_id && (
                              <button
                                onClick={() => handleDeleteNote(item.id)}
                                style={styles.btnDeleteNote}
                                title="Xóa ghi chú"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={styles.noteContent}>{item.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer nút hành động */}
          <div style={styles.footer}>
            <button onClick={onStartCook} style={styles.btnCook}>
              👨‍🍳 Bắt đầu nấu
            </button>
            <button onClick={onAddToCart} style={styles.btnCart}>
              🛒 Thêm vào giỏ
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              style={styles.btnShareMini}
              title="Chia sẻ mã QR / Link"
            >
              📤
            </button>
            {onEdit && (
              <button onClick={() => onEdit(recipe)} style={styles.btnEdit}>
                ✏️ Sửa
              </button>
            )}
          </div>
        </div>
      </div>

      <ShareRecipeModal
        isOpen={isShareOpen}
        recipe={recipe}
        onClose={() => setIsShareOpen(false)}
      />
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '540px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '50%',
    width: '32px', height: '32px',
    cursor: 'pointer',
    fontWeight: 'bold',
    zIndex: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '180px',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  headerInfo: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
    padding: '16px 20px 10px 20px',
    color: '#fff',
  },
  title: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: '800',
  },
  metaRow: {
    display: 'flex',
    gap: '14px',
    marginTop: '6px',
    fontSize: '0.82rem',
    alignItems: 'center',
  },
  avgBadge: {
    backgroundColor: '#f39c12',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: '700',
  },
  tabsContainer: {
    display: 'flex',
    borderBottom: '1px solid #edf2f7',
    background: '#f8f9fa',
  },
  tabBtn: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: 'transparent',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#718096',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
  },
  tabActive: {
    color: '#e67e22',
    borderBottom: '3px solid #e67e22',
    background: '#fff',
  },
  bodyContent: {
    padding: '18px 22px',
    overflowY: 'auto',
    flex: 1,
  },
  servingsCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#fffaf0',
    border: '1px solid #feebc8',
    borderRadius: '12px',
    marginBottom: '10px',
  },
  servingsControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  servingsBtn: {
    width: '28px', height: '28px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  servingsValue: {
    fontWeight: '700',
    fontSize: '0.9rem',
    minWidth: '65px',
    textAlign: 'center',
  },
  macroCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #edf2f7',
    borderRadius: '14px',
    padding: '10px 12px',
    marginBottom: '12px',
  },
  macroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  calPerPerson: {
    fontSize: '0.75rem',
    color: '#e67e22',
    fontWeight: '700',
    backgroundColor: '#fffaf0',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid #feebc8',
  },
  macroGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  macroItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 2px',
    borderRadius: '8px',
  },
  macroLabel: {
    fontSize: '0.65rem',
    color: '#718096',
    marginBottom: '2px',
  },
  macroVal: {
    fontSize: '0.82rem',
    fontWeight: '800',
  },
  costBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#eafaf1',
    border: '1px solid #c2f0d4',
    borderRadius: '12px',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    margin: '14px 0 8px 0',
    color: '#2d3436',
    fontWeight: '700',
  },
  ingredientList: {
    paddingLeft: '0',
    listStyleType: 'none',
    margin: '0 0 14px 0',
    fontSize: '0.9rem',
    color: '#4a5568',
  },
  ingredientItem: {
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    marginBottom: '6px',
    display: 'flex',
  },
  ingCostTag: {
    fontSize: '0.78rem',
    color: '#27ae60',
    fontWeight: '700',
    backgroundColor: '#fff',
    padding: '2px 6px',
    borderRadius: '6px',
    border: '1px solid #e1f5fe',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  stepItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: '22px', height: '22px',
    borderRadius: '50%',
    backgroundColor: '#e67e22',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    flexShrink: 0,
    marginTop: '2px',
  },
  stepText: {
    margin: 0,
    fontSize: '0.88rem',
    color: '#2d3436',
    lineHeight: '1.5',
  },
  noteForm: {
    backgroundColor: '#f8f9fa',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid #edf2f7',
    marginBottom: '16px',
  },
  ratingPickerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  noteInput: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  btnSaveNote: {
    marginTop: '8px',
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  emptyNotes: {
    textAlign: 'center',
    padding: '30px 10px',
  },
  notesFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  noteCard: {
    backgroundColor: '#fff',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #edf2f7',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  starDisplay: {
    fontSize: '0.8rem',
  },
  btnDeleteNote: {
    background: 'none',
    border: 'none',
    color: '#b2bec3',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  noteContent: {
    margin: 0,
    fontSize: '0.88rem',
    color: '#2d3436',
    lineHeight: '1.45',
  },
  footer: {
    display: 'flex',
    gap: '8px',
    padding: '14px 20px',
    borderTop: '1px solid #edf2f7',
    background: '#fff',
  },
  btnCook: {
    flex: 2,
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    padding: '11px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  btnCart: {
    flex: 2,
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    padding: '11px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  btnShareMini: {
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    padding: '11px 16px',
    borderRadius: '12px',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEdit: {
    flex: 1,
    backgroundColor: '#f1f2f6',
    color: '#2d3436',
    border: 'none',
    padding: '11px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
};