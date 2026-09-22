'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddRecipeModal({ isOpen, onClose, onRecipeAdded }) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [showAiBox, setShowAiBox] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    cook_time: 20,
    difficulty: 'Dễ',
    base_servings: 2,
    image_url: '',
    ingredients: [{ name: '', amountPerPerson: 100, unit: 'g' }],
    steps: [''],
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 1. Bóc tách AI an toàn
  const handleAIParse = async () => {
    if (!aiText.trim()) {
      alert('Vui lòng dán nội dung bài viết công thức vào khung!');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-recipe',
          text: aiText,
        }),
      });

      const resData = await res.json();

      if (!res.ok || resData.error) {
        throw new Error(resData.error || `Lỗi máy chủ (${res.status})`);
      }

      // Đọc an toàn từ resData.data hoặc trực tiếp resData
      const parsed = resData.data || resData;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Dữ liệu AI trả về không hợp lệ');
      }

      setFormData((prev) => ({
        ...prev,
        title: parsed.title || prev.title || '',
        desc: parsed.desc || parsed.description || prev.desc || '',
        cook_time: Number(parsed.cook_time) || prev.cook_time || 20,
        difficulty: parsed.difficulty || prev.difficulty || 'Dễ',
        base_servings: Number(parsed.base_servings) || prev.base_servings || 2,
        ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
          ? parsed.ingredients.map((ing) => ({
              name: String(ing.name || ''),
              amountPerPerson: Number(ing.amountPerPerson) || 1,
              unit: String(ing.unit || ''),
            }))
          : prev.ingredients,
        steps: Array.isArray(parsed.steps) && parsed.steps.length > 0
          ? parsed.steps.map((s) => (typeof s === 'string' ? s : s?.step || s?.text || ''))
          : prev.steps,
      }));

      alert('🎉 Đã bóc tách thành công! Vui lòng kiểm tra lại thông tin bên dưới.');
    } catch (err) {
      alert('Lỗi AI: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Quản lý nguyên liệu
  const handleIngredientChange = (index, field, value) => {
    const updated = [...formData.ingredients];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, ingredients: updated }));
  };

  const addIngredientRow = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amountPerPerson: 100, unit: 'g' }],
    }));
  };

  const removeIngredientRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  // Quản lý các bước nấu
  const handleStepChange = (index, value) => {
    const updated = [...formData.steps];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, steps: updated }));
  };

  const addStepRow = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  const removeStepRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  // Lưu món ăn vào Database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tên món ăn!');
      return;
    }

    setLoading(true);
    try {
      const cleanIngredients = formData.ingredients
        .filter((item) => item.name && item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          amountPerPerson: Number(item.amountPerPerson) || 1,
          unit: (item.unit || '').trim(),
        }));

      const cleanSteps = formData.steps
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        desc: formData.desc.trim(),
        description: formData.desc.trim(),
        cook_time: Number(formData.cook_time) || 20,
        time: `${Number(formData.cook_time) || 20} phút`,
        difficulty: formData.difficulty,
        base_servings: Number(formData.base_servings) || 2,
        image: formData.image_url.trim() || '[https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80](https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80)',
        image_url: formData.image_url.trim() || '[https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80](https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80)',
        ingredients: cleanIngredients,
        steps: cleanSteps,
        instructions: cleanSteps,
      };

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const savedData = await res.json();
      if (!res.ok) {
        throw new Error(savedData.error || 'Lỗi khi lưu món ăn');
      }

      onRecipeAdded(savedData);
      onClose();
      alert('🎉 Đã thêm công thức món ăn thành công!');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        <h2 style={{ textAlign: 'center', margin: '0 0 4px 0', fontSize: '1.3rem' }}>🍳 Đăng công thức mới</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          Nhập tay hoặc dùng AI tự động điền từ bài viết trên mạng
        </p>

        {/* Khung trợ lý AI */}
        {showAiBox && (
          <div style={modalStyles.aiCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#6c5ce7', fontSize: '0.9rem' }}>🤖 AI Trợ Lý Nhập Liệu</span>
              <button
                type="button"
                onClick={() => setShowAiBox(false)}
                style={{ background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Đóng khung AI
              </button>
            </div>
            <textarea
              rows={4}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Dán toàn bộ bài viết công thức từ Facebook, web, TikTok vào đây..."
              style={modalStyles.textarea}
            />
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleAIParse}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '8px',
                borderRadius: '10px',
                border: 'none',
                background: aiLoading ? '#a29bfe' : '#6c5ce7',
                color: '#fff',
                fontWeight: 'bold',
                cursor: aiLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {aiLoading ? '⏳ Gemini AI đang bóc tách...' : '⚡ Bóc tách & Điền form tự động'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={modalStyles.label}>Tên món ăn (*):</label>
            <input
              type="text"
              name="title"
              required
              placeholder="VD: Thịt kho tàu nước dừa"
              value={formData.title}
              onChange={handleChange}
              style={modalStyles.input}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={modalStyles.label}>Thời gian (phút):</label>
              <input
                type="number"
                name="cook_time"
                value={formData.cook_time}
                onChange={handleChange}
                style={modalStyles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={modalStyles.label}>Độ khó:</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                style={modalStyles.input}
              >
                <option value="Rất dễ">Rất dễ</option>
                <option value="Dễ">Dễ</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Khó">Khó</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={modalStyles.label}>Khẩu phần (người):</label>
              <input
                type="number"
                name="base_servings"
                value={formData.base_servings}
                onChange={handleChange}
                style={modalStyles.input}
              />
            </div>
          </div>

          <div>
            <label style={modalStyles.label}>Mô tả món ăn:</label>
            <input
              type="text"
              name="desc"
              placeholder="Mô tả hương vị, nguồn gốc món ăn..."
              value={formData.desc}
              onChange={handleChange}
              style={modalStyles.input}
            />
          </div>

          <div>
            <label style={modalStyles.label}>Link ảnh món ăn:</label>
            <input
              type="text"
              name="image_url"
              placeholder="[https://images.unsplash.com/](https://images.unsplash.com/)..."
              value={formData.image_url}
              onChange={handleChange}
              style={modalStyles.input}
            />
          </div>

          {/* Danh sách nguyên liệu */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={modalStyles.label}>Nguyên liệu (cho 1 người ăn):</label>
              <button
                type="button"
                onClick={addIngredientRow}
                style={modalStyles.btnSmall}
              >
                + Thêm dòng
              </button>
            </div>

            {formData.ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="text"
                  placeholder="Tên nguyên liệu (VD: Thịt bò)"
                  value={ing.name}
                  onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                  style={{ ...modalStyles.input, flex: 2 }}
                />
                <input
                  type="number"
                  placeholder="Số lượng"
                  value={ing.amountPerPerson}
                  onChange={(e) => handleIngredientChange(idx, 'amountPerPerson', e.target.value)}
                  style={{ ...modalStyles.input, flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="ĐVT (g, quả...)"
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                  style={{ ...modalStyles.input, flex: 1 }}
                />
                {formData.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(idx)}
                    style={modalStyles.btnDel}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Các bước thực hiện */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={modalStyles.label}>Các bước thực hiện:</label>
              <button
                type="button"
                onClick={addStepRow}
                style={modalStyles.btnSmall}
              >
                + Thêm bước
              </button>
            </div>

            {formData.steps.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#e67e22', minWidth: '20px' }}>
                  {idx + 1}
                </span>
                <input
                  type="text"
                  placeholder={`Bước ${idx + 1}...`}
                  value={st}
                  onChange={(e) => handleStepChange(idx, e.target.value)}
                  style={{ ...modalStyles.input, flex: 1 }}
                />
                {formData.steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStepRow(idx)}
                    style={modalStyles.btnDel}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: '#27ae60',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px',
            }}
          >
            {loading ? 'Đang lưu...' : '💾 Lưu công thức món ăn'}
          </button>
        </form>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px',
    position: 'relative',
    boxSizing: 'border-box',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: '#f1f2f6',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  aiCard: {
    background: '#f8f9ff',
    border: '1px solid #dcdde1',
    borderRadius: '14px',
    padding: '12px',
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #dcdde1',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #dcdde1',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  btnSmall: {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #27ae60',
    background: '#eafaf1',
    color: '#27ae60',
    fontSize: '0.78rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnDel: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: 'none',
    background: '#ff7675',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};