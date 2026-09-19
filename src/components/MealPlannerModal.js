'use client';
import { useState, useEffect } from 'react';

const DAYS_OF_WEEK = [
  { key: 't2', label: 'Thứ 2' },
  { key: 't3', label: 'Thứ 3' },
  { key: 't4', label: 'Thứ 4' },
  { key: 't5', label: 'Thứ 5' },
  { key: 't6', label: 'Thứ 6' },
  { key: 't7', label: 'Thứ 7' },
  { key: 'cn', label: 'Chủ Nhật' },
];

export default function MealPlannerModal({
  isOpen,
  onClose,
  recipes = [],
  onOpenDetail,
  onAddPlanToCart,
}) {
  const [selectedDay, setSelectedDay] = useState('t2');
  const [plannerData, setPlannerData] = useState({});
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickingMealType, setPickingMealType] = useState('lunch'); // 'lunch' hoặc 'dinner'

  // Nạp dữ liệu thực đơn tuần từ LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bepnha_meal_plan');
      if (saved) setPlannerData(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!isOpen) return null;

  const savePlanner = (newData) => {
    setPlannerData(newData);
    try {
      localStorage.setItem('bepnha_meal_plan', JSON.stringify(newData));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRecipeToSlot = (recipe) => {
    const dayData = plannerData[selectedDay] || { lunch: [], dinner: [] };
    const currentList = dayData[pickingMealType] || [];

    if (currentList.some((r) => r.id === recipe.id)) {
      alert('Món này đã có trong bữa ăn rồi!');
      return;
    }

    const updatedDay = {
      ...dayData,
      [pickingMealType]: [...currentList, recipe],
    };

    savePlanner({
      ...plannerData,
      [selectedDay]: updatedDay,
    });

    setIsPickerOpen(false);
  };

  const handleRemoveRecipeFromSlot = (dayKey, mealType, recipeId) => {
    const dayData = plannerData[dayKey] || { lunch: [], dinner: [] };
    const updatedList = (dayData[mealType] || []).filter((r) => r.id !== recipeId);

    savePlanner({
      ...plannerData,
      [dayKey]: {
        ...dayData,
        [mealType]: updatedList,
      },
    });
  };

  // Gom toàn bộ nguyên liệu của cả tuần nạp vào Giỏ đi chợ
  const handleExportAllToCart = () => {
    const allSelectedRecipes = [];
    Object.values(plannerData).forEach((day) => {
      if (day.lunch) allSelectedRecipes.push(...day.lunch);
      if (day.dinner) allSelectedRecipes.push(...day.dinner);
    });

    if (allSelectedRecipes.length === 0) {
      alert('Bạn chưa lên lịch món nào cho cả tuần!');
      return;
    }

    if (onAddPlanToCart) {
      onAddPlanToCart(allSelectedRecipes);
      onClose();
    }
  };

  const currentDayData = plannerData[selectedDay] || { lunch: [], dinner: [] };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📅 Lên lịch thực đơn tuần</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
              Lên trước bữa Trưa & Tối từ Thứ 2 đến Chủ Nhật
            </p>
          </div>
          <button onClick={handleExportAllToCart} style={styles.btnSyncCart}>
            🛒 Nạp cả tuần vào giỏ
          </button>
        </div>

        {/* Thanh chọn ngày trong tuần */}
        <div style={styles.daySelector}>
          {DAYS_OF_WEEK.map((day) => {
            const hasMeals = (plannerData[day.key]?.lunch?.length || 0) + (plannerData[day.key]?.dinner?.length || 0) > 0;
            return (
              <button
                key={day.key}
                onClick={() => setSelectedDay(day.key)}
                style={{
                  ...styles.dayBtn,
                  ...(selectedDay === day.key ? styles.dayBtnActive : {}),
                }}
              >
                <span>{day.label}</span>
                {hasMeals && <span style={styles.dotIndicator}>•</span>}
              </button>
            );
          })}
        </div>

        {/* Khối bữa Trưa */}
        <div style={styles.slotCard}>
          <div style={styles.slotHeader}>
            <span style={styles.slotTitle}>☀️ Bữa Trưa</span>
            <button
              onClick={() => {
                setPickingMealType('lunch');
                setIsPickerOpen(true);
              }}
              style={styles.btnAddDish}
            >
              + Thêm món
            </button>
          </div>

          <div style={styles.dishList}>
            {(currentDayData.lunch || []).length === 0 ? (
              <span style={styles.emptyText}>Chưa có món trưa</span>
            ) : (
              currentDayData.lunch.map((rec) => (
                <div key={rec.id} style={styles.dishTag}>
                  <span onClick={() => onOpenDetail(rec)} style={{ cursor: 'pointer' }}>
                    {rec.title}
                  </span>
                  <button
                    onClick={() => handleRemoveRecipeFromSlot(selectedDay, 'lunch', rec.id)}
                    style={styles.btnRemoveTag}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Khối bữa Tối */}
        <div style={styles.slotCard}>
          <div style={styles.slotHeader}>
            <span style={styles.slotTitle}>🌙 Bữa Tối</span>
            <button
              onClick={() => {
                setPickingMealType('dinner');
                setIsPickerOpen(true);
              }}
              style={styles.btnAddDish}
            >
              + Thêm món
            </button>
          </div>

          <div style={styles.dishList}>
            {(currentDayData.dinner || []).length === 0 ? (
              <span style={styles.emptyText}>Chưa có món tối</span>
            ) : (
              currentDayData.dinner.map((rec) => (
                <div key={rec.id} style={styles.dishTag}>
                  <span onClick={() => onOpenDetail(rec)} style={{ cursor: 'pointer' }}>
                    {rec.title}
                  </span>
                  <button
                    onClick={() => handleRemoveRecipeFromSlot(selectedDay, 'dinner', rec.id)}
                    style={styles.btnRemoveTag}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hộp thoại nhỏ chọn món ăn */}
        {isPickerOpen && (
          <div style={styles.pickerOverlay} onClick={() => setIsPickerOpen(false)}>
            <div style={styles.pickerBox} onClick={(e) => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#2d3436' }}>
                Chọn món cho {pickingMealType === 'lunch' ? 'Bữa Trưa' : 'Bữa Tối'} ({DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label})
              </h4>
              <div style={styles.pickerList}>
                {recipes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleAddRecipeToSlot(r)}
                    style={styles.pickerItem}
                  >
                    <img src={r.image} alt={r.title} style={styles.pickerImg} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>{r.title}</p>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>{r.time} • {r.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setIsPickerOpen(false)} style={styles.btnCancelPicker}>
                Đóng
              </button>
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
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
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
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '16px', paddingRight: '36px',
  },
  title: {
    margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#2d3436',
  },
  btnSyncCart: {
    backgroundColor: '#e67e22', color: '#fff', border: 'none',
    padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem',
    fontWeight: '700', cursor: 'pointer',
  },
  daySelector: {
    display: 'flex', gap: '6px', overflowX: 'auto',
    paddingBottom: '8px', marginBottom: '16px',
  },
  dayBtn: {
    flex: '0 0 auto', padding: '8px 12px', borderRadius: '12px',
    border: '1px solid #e1e8ed', background: '#f8f9fa',
    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  dayBtnActive: {
    background: '#2d3436', color: '#fff', borderColor: '#2d3436',
  },
  dotIndicator: {
    color: '#e67e22', fontSize: '1.2rem', lineHeight: '0',
  },
  slotCard: {
    backgroundColor: '#f8f9fa', borderRadius: '16px',
    padding: '14px', marginBottom: '12px', border: '1px solid #f1f2f6',
  },
  slotHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px',
  },
  slotTitle: {
    fontSize: '0.95rem', fontWeight: '700', color: '#2d3436',
  },
  btnAddDish: {
    background: 'transparent', border: 'none', color: '#2980b9',
    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
  },
  dishList: {
    display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '36px',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '0.8rem', color: '#a4b0be', fontStyle: 'italic',
  },
  dishTag: {
    backgroundColor: '#fff', border: '1px solid #dcdde1',
    borderRadius: '10px', padding: '6px 10px', fontSize: '0.85rem',
    fontWeight: '600', color: '#2f3542', display: 'flex',
    alignItems: 'center', gap: '6px',
  },
  btnRemoveTag: {
    background: 'none', border: 'none', color: '#e74c3c',
    cursor: 'pointer', fontSize: '0.8rem', padding: 0,
  },
  pickerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: '24px', zIndex: 10, padding: '16px',
  },
  pickerBox: {
    backgroundColor: '#fff', borderRadius: '18px', padding: '16px',
    width: '100%', maxHeight: '80%', display: 'flex', flexDirection: 'column',
  },
  pickerList: {
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
    gap: '8px', maxHeight: '250px', marginBottom: '12px',
  },
  pickerItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px', borderRadius: '10px', border: '1px solid #f1f2f6',
    cursor: 'pointer', transition: 'background 0.2s',
  },
  pickerImg: {
    width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover',
  },
  btnCancelPicker: {
    padding: '8px', borderRadius: '8px', border: 'none',
    backgroundColor: '#f1f2f6', cursor: 'pointer', fontWeight: '600',
  },
};