'use client';
import { useState, useEffect, useMemo } from 'react';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export default function MealPlannerModal({
  isOpen,
  recipes = [],
  onClose,
  onOpenDetail,
  onAddPlanToCart,
  currentUserId,
  currentKitchenId,
}) {
  const [planner, setPlanner] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null); // { day, meal: 'lunch' | 'dinner' }
  const [searchTerm, setSearchTerm] = useState('');

  // State cho tính năng AI Copilot
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Tải dữ liệu thực đơn từ Supabase API
  const fetchMealPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentKitchenId) params.set('kitchenId', currentKitchenId);
      else if (currentUserId) params.set('userId', currentUserId);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/meal-plans${queryStr}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        const formatted = {};
        data.forEach((row) => {
          const key = `${row.day}_${row.meal_type}`;
          if (!formatted[key]) formatted[key] = [];
          formatted[key].push(String(row.recipe_id));
        });
        setPlanner(formatted);
      }
    } catch (err) {
      console.error('Lỗi tải lịch thực đơn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMealPlans();
      setIsAiOpen(false);
      setAiSuggestion(null);
    }
  }, [isOpen, currentUserId, currentKitchenId]);

  const recipeMap = useMemo(() => {
    const map = {};
    recipes.forEach((r) => {
      map[String(r.id)] = r;
    });
    return map;
  }, [recipes]);

  if (!isOpen) return null;

  const handleAddDishToSlot = async (recipeId) => {
    if (!activeSlot) return;
    const { day, meal } = activeSlot;
    const slotKey = `${day}_${meal}`;

    const currentList = planner[slotKey] || [];
    if (currentList.includes(String(recipeId))) {
      alert('Món này đã có trong bữa ăn rồi!');
      return;
    }

    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          mealType: meal,
          recipeId,
          userId: currentUserId || null,
          kitchenId: currentKitchenId || null,
        }),
      });

      if (!res.ok) throw new Error('Không thể thêm món');

      setPlanner((prev) => ({
        ...prev,
        [slotKey]: [...currentList, String(recipeId)],
      }));
      setActiveSlot(null);
      setSearchTerm('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveDishFromSlot = async (e, day, meal, recipeId) => {
    e.stopPropagation();
    const slotKey = `${day}_${meal}`;

    try {
      const params = new URLSearchParams({
        day,
        mealType: meal,
        recipeId,
      });
      if (currentKitchenId) params.set('kitchenId', currentKitchenId);
      else if (currentUserId) params.set('userId', currentUserId);

      const res = await fetch(`/api/meal-plans?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Không thể xóa món');

      setPlanner((prev) => ({
        ...prev,
        [slotKey]: (prev[slotKey] || []).filter((id) => id !== String(recipeId)),
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearWeek = async () => {
    if (!confirm('Bạn có chắc muốn xóa sạch toàn bộ thực đơn tuần này?')) return;
    try {
      const params = new URLSearchParams();
      if (currentKitchenId) params.set('kitchenId', currentKitchenId);
      else if (currentUserId) params.set('userId', currentUserId);

      await fetch(`/api/meal-plans?${params.toString()}`, { method: 'DELETE' });
      setPlanner({});
    } catch (err) {
      alert(err.message);
    }
  };

  // Gọi Gemini AI để lập thực đơn thông minh
  const handleGenerateAiPlan = async (customPrompt) => {
    const promptToSend = customPrompt || aiPrompt;
    if (!promptToSend.trim()) {
      alert('Vui lòng nhập nhu cầu thực đơn của gia đình bạn!');
      return;
    }

    setAiLoading(true);
    try {
      let savedFridge = [];
      try {
        savedFridge = JSON.parse(localStorage.getItem('bepnha_fridge_items') || '[]');
      } catch (e) {}

      const res = await fetch('/api/ai/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          recipes,
          fridgeItems: savedFridge,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo thực đơn AI');

      setAiSuggestion(data);
    } catch (err) {
      alert('Lỗi AI: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Áp dụng thực đơn AI gợi ý vào tuần hiện tại bằng Bulk Insert
  const handleApplyAiPlan = async () => {
    if (!aiSuggestion?.plan) return;
    if (!confirm('Hành động này sẽ cập nhật thực đơn tuần theo gợi ý của AI. Bạn có muốn tiếp tục?')) return;

    setLoading(true);
    try {
      // 1. Xóa lịch cũ trước
      const params = new URLSearchParams();
      if (currentKitchenId) params.set('kitchenId', currentKitchenId);
      else if (currentUserId) params.set('userId', currentUserId);
      await fetch(`/api/meal-plans?${params.toString()}`, { method: 'DELETE' });

      // 2. Chuẩn bị mảng bản ghi để chèn hàng loạt (Bulk Insert)
      const itemsToInsert = [];
      const newPlanner = {};

      aiSuggestion.plan.forEach((item) => {
        const { day, lunch = [], dinner = [] } = item;

        lunch.forEach((recipeId) => {
          if (recipeMap[recipeId]) {
            itemsToInsert.push({ day, mealType: 'lunch', recipeId });
            const key = `${day}_lunch`;
            newPlanner[key] = [...(newPlanner[key] || []), String(recipeId)];
          }
        });

        dinner.forEach((recipeId) => {
          if (recipeMap[recipeId]) {
            itemsToInsert.push({ day, mealType: 'dinner', recipeId });
            const key = `${day}_dinner`;
            newPlanner[key] = [...(newPlanner[key] || []), String(recipeId)];
          }
        });
      });

      // 3. Gửi 1 request Bulk Insert duy nhất
      if (itemsToInsert.length > 0) {
        const bulkRes = await fetch('/api/meal-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: itemsToInsert,
            userId: currentUserId || null,
            kitchenId: currentKitchenId || null,
          }),
        });

        if (!bulkRes.ok) throw new Error('Không thể lưu thực đơn hàng loạt');
      }

      setPlanner(newPlanner);
      setIsAiOpen(false);
      setAiSuggestion(null);
      alert('🎉 Đã áp dụng thực đơn AI thành công!');
    } catch (err) {
      alert('Lỗi áp dụng thực đơn: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const plannedRecipes = Object.values(planner)
    .flat()
    .map((id) => recipeMap[id])
    .filter(Boolean);

  const filteredPickerRecipes = recipes.filter((r) =>
    r.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        {/* Header Modal */}
        <div style={styles.header}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={styles.title}>📅 Lên Lịch Thực Đơn Tuần</h2>
              <button
                onClick={() => setIsAiOpen(!isAiOpen)}
                style={{
                  ...styles.btnAiToggle,
                  backgroundColor: isAiOpen ? '#8e44ad' : '#f3e8ff',
                  color: isAiOpen ? '#fff' : '#8e44ad',
                }}
              >
                ✨ AI Chef Copilot
              </button>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#636e72' }}>
              {currentKitchenId ? 'Đang đồng bộ trực tiếp với Bếp Gia Đình' : 'Thực đơn cá nhân'}
            </span>
          </div>
          {plannedRecipes.length > 0 && (
            <button onClick={handleClearWeek} style={styles.btnClear}>
              Xóa lịch tuần
            </button>
          )}
        </div>

        {/* Khối Trợ lý AI Copilot */}
        {isAiOpen && (
          <div style={styles.aiBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#6b21a8' }}>
                🤖 Trợ lý AI lên thực đơn tuần tự động
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#9333ea' }}>Gemini 1.5 Flash</span>
            </div>

            <div style={styles.aiQuickTags}>
              <button
                type="button"
                onClick={() => {
                  setAiPrompt('Lên thực đơn tuần giàu Protein, ít tinh bột, ưu tiên thịt nạc, trứng và cá');
                  handleGenerateAiPlan('Lên thực đơn tuần giàu Protein, ít tinh bột, ưu tiên thịt nạc, trứng và cá');
                }}
                style={styles.aiTagBtn}
              >
                🥩 Nhiều đạm (High-Protein)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiPrompt('Lên thực đơn tuần tiết kiệm ngân sách, món dễ nấu dưới 25 phút');
                  handleGenerateAiPlan('Lên thực đơn tuần tiết kiệm ngân sách, món dễ nấu dưới 25 phút');
                }}
                style={styles.aiTagBtn}
              >
                💰 Tiết kiệm & Nhanh gọn
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiPrompt('Tận dụng tối đa các nguyên liệu đang có trong tủ lạnh để không lãng phí');
                  handleGenerateAiPlan('Tận dụng tối đa các nguyên liệu đang có trong tủ lạnh để không lãng phí');
                }}
                style={styles.aiTagBtn}
              >
                🧊 Ưu tiên dùng đồ trong tủ lạnh
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                placeholder="Nhập yêu cầu riêng (VD: 4 người ăn, ngân sách 1 triệu, nhiều rau xanh...)"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                style={styles.aiInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateAiPlan();
                }}
              />
              <button
                onClick={() => handleGenerateAiPlan()}
                disabled={aiLoading}
                style={styles.btnAiSubmit}
              >
                {aiLoading ? 'Đang phân tích...' : 'Lập thực đơn'}
              </button>
            </div>

            {/* Kết quả AI gợi ý */}
            {aiSuggestion && (
              <div style={styles.aiResultBox}>
                <div style={{ fontSize: '0.85rem', color: '#4a044e', fontWeight: '600', marginBottom: '8px' }}>
                  💡 {aiSuggestion.summary}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setAiSuggestion(null)} style={styles.btnCancelAi}>
                    Đóng gợi ý
                  </button>
                  <button onClick={handleApplyAiPlan} style={styles.btnApplyAi}>
                    ⚡ Áp dụng vào lịch tuần ngay
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lưới Lịch 7 Ngày */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#888', padding: '30px' }}>Đang nạp dữ liệu thực đơn...</p>
        ) : (
          <div style={styles.grid}>
            {DAYS.map((day) => (
              <div key={day} style={styles.dayCard}>
                <div style={styles.dayTitle}>{day}</div>

                {/* Bữa Trưa */}
                <div style={styles.mealSlot}>
                  <div style={styles.slotHeader}>
                    <span>☀️ Trưa</span>
                    <button
                      onClick={() => setActiveSlot({ day, meal: 'lunch' })}
                      style={styles.btnAddMini}
                    >
                      + Món
                    </button>
                  </div>
                  <div style={styles.dishList}>
                    {(planner[`${day}_lunch`] || []).map((id) => {
                      const dish = recipeMap[id];
                      if (!dish) return null;
                      return (
                        <div
                          key={id}
                          style={styles.dishItem}
                          onClick={() => onOpenDetail(dish)}
                        >
                          <span style={styles.dishTitleText}>{dish.title}</span>
                          <button
                            onClick={(e) => handleRemoveDishFromSlot(e, day, 'lunch', id)}
                            style={styles.btnRemoveMini}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bữa Tối */}
                <div style={styles.mealSlot}>
                  <div style={styles.slotHeader}>
                    <span>🌙 Tối</span>
                    <button
                      onClick={() => setActiveSlot({ day, meal: 'dinner' })}
                      style={styles.btnAddMini}
                    >
                      + Món
                    </button>
                  </div>
                  <div style={styles.dishList}>
                    {(planner[`${day}_dinner`] || []).map((id) => {
                      const dish = recipeMap[id];
                      if (!dish) return null;
                      return (
                        <div
                          key={id}
                          style={styles.dishItem}
                          onClick={() => onOpenDetail(dish)}
                        >
                          <span style={styles.dishTitleText}>{dish.title}</span>
                          <button
                            onClick={(e) => handleRemoveDishFromSlot(e, day, 'dinner', id)}
                            style={styles.btnRemoveMini}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nút nạp cả tuần vào giỏ */}
        {plannedRecipes.length > 0 && (
          <div style={styles.footer}>
            <button
              onClick={() => onAddPlanToCart(plannedRecipes)}
              style={styles.btnCartWeek}
            >
              🛒 Nạp toàn bộ nguyên liệu cả tuần ({plannedRecipes.length} món) vào Giỏ đi chợ
            </button>
          </div>
        )}

        {/* Modal chọn món ăn vào ngày cụ thể */}
        {activeSlot && (
          <div style={styles.pickerOverlay} onClick={() => setActiveSlot(null)}>
            <div style={styles.pickerModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.pickerHeader}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  Chọn món cho: {activeSlot.day} ({activeSlot.meal === 'lunch' ? 'Bữa Trưa' : 'Bữa Tối'})
                </h3>
                <button onClick={() => setActiveSlot(null)} style={styles.closeBtnSmall}>✕</button>
              </div>

              <input
                type="text"
                placeholder="🔍 Tìm nhanh món ăn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.pickerSearch}
              />

              <div style={styles.pickerList}>
                {filteredPickerRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    style={styles.pickerItem}
                    onClick={() => handleAddDishToSlot(recipe.id)}
                  >
                    <img src={recipe.image} alt={recipe.title} style={styles.pickerThumb} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.9rem', color: '#2d3436' }}>{recipe.title}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#888' }}>
                        ⏱ {recipe.time} • {recipe.difficulty || 'Dễ'}
                      </span>
                    </div>
                    <button style={styles.btnSelectMini}>+ Chọn</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
    zIndex: 10001,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '920px',
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
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '16px', paddingRight: '40px',
  },
  title: {
    margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#2d3436',
  },
  btnAiToggle: {
    border: 'none',
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  aiBox: {
    backgroundColor: '#faf5ff',
    border: '1px solid #e9d5ff',
    borderRadius: '16px',
    padding: '14px',
    marginBottom: '16px',
  },
  aiQuickTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  aiTagBtn: {
    backgroundColor: '#fff',
    border: '1px solid #d8b4fe',
    borderRadius: '8px',
    padding: '4px 8px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#7e22ce',
    cursor: 'pointer',
  },
  aiInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #d8b4fe',
    fontSize: '0.85rem',
    outline: 'none',
    background: '#fff',
  },
  btnAiSubmit: {
    backgroundColor: '#8e44ad',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '0.82rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  aiResultBox: {
    marginTop: '12px',
    backgroundColor: '#f3e8ff',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #d8b4fe',
  },
  btnCancelAi: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  btnApplyAi: {
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  btnClear: {
    background: 'none', border: 'none', color: '#e74c3c',
    fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '12px',
    overflowY: 'auto',
    maxHeight: '62vh',
    padding: '4px',
  },
  dayCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '16px',
    padding: '12px',
    border: '1px solid #edf2f7',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  dayTitle: {
    fontWeight: '800',
    fontSize: '0.95rem',
    color: '#8e44ad',
    borderBottom: '2px solid #8e44ad22',
    paddingBottom: '4px',
    textAlign: 'center',
  },
  mealSlot: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '8px',
    border: '1px solid #e2e8f0',
    minHeight: '75px',
    display: 'flex',
    flexDirection: 'column',
  },
  slotHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#636e72',
    marginBottom: '6px',
  },
  btnAddMini: {
    backgroundColor: '#8e44ad18',
    color: '#8e44ad',
    border: 'none',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '0.72rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  dishList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flex: 1,
  },
  dishItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f2f6',
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  dishTitleText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '105px',
    fontWeight: '600',
    color: '#2d3436',
  },
  btnRemoveMini: {
    border: 'none',
    background: 'none',
    color: '#b2bec3',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '0 2px',
  },
  footer: {
    marginTop: '14px',
    paddingTop: '10px',
    borderTop: '1px solid #f1f2f6',
  },
  btnCartWeek: {
    width: '100%',
    backgroundColor: '#8e44ad',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  pickerOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10005,
    padding: '16px',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    maxWidth: '420px',
    width: '100%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '75vh',
  },
  pickerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  closeBtnSmall: {
    background: '#f1f2f6', border: 'none', borderRadius: '50%',
    width: '28px', height: '28px', cursor: 'pointer',
  },
  pickerSearch: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    marginBottom: '12px',
    fontSize: '0.85rem',
    outline: 'none',
  },
  pickerList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '50vh',
  },
  pickerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: '10px',
    border: '1px solid #edf2f7',
    cursor: 'pointer',
  },
  pickerThumb: {
    width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover',
  },
  btnSelectMini: {
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
};