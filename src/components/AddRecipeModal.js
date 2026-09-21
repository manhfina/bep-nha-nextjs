'use client';
import { useState } from 'react';

export default function AddRecipeModal({ isOpen, onClose, onRecipeAdded }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cookTime, setCookTime] = useState(20);
  const [difficulty, setDifficulty] = useState('Dễ');
  const [baseServings, setBaseServings] = useState(2);
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState([
    { name: '', amountPerPerson: 100, unit: 'g' },
  ]);
  const [steps, setSteps] = useState(['']);
  
  // Trạng thái cho tính năng AI Auto-Fill
  const [rawText, setRawText] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Xử lý AI phân tích và điền tự động
  const handleAiParse = async () => {
    if (!rawText.trim()) {
      alert('Vui lòng dán văn bản công thức cần phân tích!');
      return;
    }

    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-recipe',
          text: rawText,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Lỗi bóc tách công thức');

      const { data } = result;
      if (data.title) setTitle(data.title);
      if (data.desc) setDesc(data.desc);
      if (data.cook_time) setCookTime(data.cook_time);
      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.base_servings) setBaseServings(data.base_servings);

      if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        setIngredients(
          data.ingredients.map((ing) => ({
            name: ing.name || '',
            amountPerPerson: ing.amountPerPerson || 1,
            unit: ing.unit || 'phần',
          }))
        );
      }

      if (Array.isArray(data.steps) && data.steps.length > 0) {
        setSteps(data.steps);
      }

      setShowAiInput(false);
      setRawText('');
      alert('✨ AI đã điền tự động thành công! Bạn có thể xem lại và tinh chỉnh trước khi lưu.');
    } catch (err) {
      alert('Lỗi AI: ' + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Quản lý danh sách nguyên liệu
  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { name: '', amountPerPerson: 50, unit: 'g' }]);
  };

  const removeIngredientRow = (index) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, idx) => idx !== index));
  };

  // Quản lý các bước
  const handleStepChange = (index, value) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  const addStepRow = () => {
    setSteps([...steps, '']);
  };

  const removeStepRow = (index) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  // Submit lưu công thức
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tên món ăn!');
      return;
    }

    const validIngredients = ingredients.filter((item) => item.name.trim() !== '');
    const validSteps = steps.filter((step) => step.trim() !== '');

    setSubmitting(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          desc,
          cook_time: Number(cookTime),
          difficulty,
          base_servings: Number(baseServings),
          image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
          ingredients: validIngredients,
          steps: validSteps,
        }),
      });

      const newRecipe = await res.json();
      if (!res.ok) throw new Error(newRecipe.error || 'Lỗi lưu công thức');

      if (onRecipeAdded) onRecipeAdded(newRecipe);
      onClose();
      alert('Đã thêm món ăn mới vào sổ tay thành công!');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h2 style={styles.title}>🍳 Đăng công thức mới</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Nhập tay hoặc dùng AI tự động điền từ bài viết trên mạng
          </p>
        </div>

        {/* Khung trợ lý AI Auto-Fill */}
        <div style={styles.aiBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#8e44ad', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🤖 AI Trợ Lý Nhập Liệu
            </span>
            <button
              type="button"
              onClick={() => setShowAiInput(!showAiInput)}
              style={styles.btnToggleAi}
            >
              {showAiInput ? 'Đóng khung AI' : '✨ Dán công thức thô vào đây'}
            </button>
          </div>

          {showAiInput && (
            <div style={{ marginTop: '10px' }}>
              <textarea
                rows="4"
                placeholder="Dán bài viết hoặc ghi chú nguyên liệu vào đây... (Ví dụ: Món sườn xào chua ngọt cần 500g sườn thăn, 2 quả cà chua, tỏi ớt băm... Bước 1 chặt sườn luộc sơ, Bước 2 pha nước sốt...)"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                style={styles.aiTextarea}
              />
              <button
                type="button"
                onClick={handleAiParse}
                disabled={isAiLoading}
                style={styles.btnAiAction}
              >
                {isAiLoading ? '⏳ Gemini AI đang bóc tách...' : '⚡ Bóc tách & Điền form tự động'}
              </button>
            </div>
          )}
        </div>

        {/* Form nhập liệu chính */}
        <form onSubmit={handleSubmit} style={styles.formContent}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên món ăn (*):</label>
            <input
              type="text"
              required
              placeholder="VD: Thịt kho tàu nước dừa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Thời gian (phút):</label>
              <input
                type="number"
                min="1"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Độ khó:</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                style={styles.input}
              >
                <option value="Rất dễ">Rất dễ</option>
                <option value="Dễ">Dễ</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Khó">Khó</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Khẩu phần (người):</label>
              <input
                type="number"
                min="1"
                value={baseServings}
                onChange={(e) => setBaseServings(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mô tả món ăn:</label>
            <input
              type="text"
              placeholder="Mô tả hương vị, nguồn gốc món ăn..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Link ảnh món ăn:</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Danh sách nguyên liệu */}
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ ...styles.label, margin: 0 }}>Nguyên liệu (cho 1 người ăn):</label>
              <button type="button" onClick={addIngredientRow} style={styles.btnAddMini}>
                + Thêm dòng
              </button>
            </div>

            {ingredients.map((item, idx) => (
              <div key={idx} style={styles.ingredientRow}>
                <input
                  type="text"
                  placeholder="Tên nguyên liệu (VD: Thịt bò)"
                  value={item.name}
                  onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                  style={{ flex: 3, ...styles.input }}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Lượng"
                  value={item.amountPerPerson}
                  onChange={(e) => handleIngredientChange(idx, 'amountPerPerson', parseFloat(e.target.value) || 0)}
                  style={{ flex: 1.2, ...styles.input }}
                />
                <input
                  type="text"
                  placeholder="Đơn vị (g, quả..)"
                  value={item.unit}
                  onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                  style={{ flex: 1.5, ...styles.input }}
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(idx)}
                    style={styles.btnRemoveRow}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Các bước nấu */}
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ ...styles.label, margin: 0 }}>Các bước thực hiện:</label>
              <button type="button" onClick={addStepRow} style={styles.btnAddMini}>
                + Thêm bước
              </button>
            </div>

            {steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={styles.stepIndex}>{idx + 1}</span>
                <input
                  type="text"
                  placeholder={`Bước ${idx + 1}...`}
                  value={step}
                  onChange={(e) => handleStepChange(idx, e.target.value)}
                  style={{ flex: 1, ...styles.input }}
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStepRow(idx)}
                    style={styles.btnRemoveRow}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Nút lưu hoàn tất */}
          <div style={{ marginTop: '20px' }}>
            <button type="submit" disabled={submitting} style={styles.btnSubmit}>
              {submitting ? 'Đang lưu vào Supabase...' : '💾 Lưu công thức món ăn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10001,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    position: 'relative',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
  },
  title: {
    margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#2d3436',
  },
  aiBox: {
    backgroundColor: '#fbf7ff',
    border: '1px solid #e8d7ff',
    borderRadius: '16px',
    padding: '12px 14px',
    marginBottom: '14px',
  },
  btnToggleAi: {
    background: '#8e44ad',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  aiTextarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #dcd0ea',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  btnAiAction: {
    width: '100%',
    marginTop: '8px',
    backgroundColor: '#8e44ad',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  formContent: {
    overflowY: 'auto',
    flex: 1,
    paddingRight: '4px',
  },
  formGroup: {
    marginBottom: '10px',
  },
  row: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#4a5568',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #dcdde1',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnAddMini: {
    background: '#e8f5e9',
    color: '#2e7d32',
    border: '1px solid #c8e6c9',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  ingredientRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  stepIndex: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#e67e22',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnRemoveRow: {
    background: 'none',
    border: 'none',
    color: '#e74c3c',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0 4px',
  },
  btnSubmit: {
    width: '100%',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
  },
};