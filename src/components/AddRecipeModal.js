'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Bộ phân tích dự phòng thông minh ngay tại Client khi AI trả về thiếu hoặc lỗi
function parseRecipeLocally(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  
  let title = '';
  let desc = '';
  let cook_time = 30;
  let difficulty = 'Dễ';
  let base_servings = 2;
  let cooking_method = 'Bếp thường';
  const ingredients = [];
  const steps = [];

  // Tìm tiêu đề: Dòng đầu tiên ngắn gọn hoặc theo mẫu
  for (let line of lines) {
    const clean = line.replace(/^[#*\-0-9.\s]+/, '').trim();
    if (clean.length > 3 && clean.length < 70 && !clean.toLowerCase().includes('nguyên liệu') && !clean.toLowerCase().includes('bước')) {
      title = clean.replace(/[:–-].*$/, '').trim();
      break;
    }
  }

  // Tự động nhận diện thiết bị nấu
  const lowerAll = rawText.toLowerCase();
  if (lowerAll.includes('nồi chiên không dầu') || lowerAll.includes('nckd')) {
    cooking_method = 'Nồi chiên không dầu';
  } else if (lowerAll.includes('lò nướng')) {
    cooking_method = 'Lò nướng';
  }

  // Tự động nhận diện khẩu phần
  const servingMatch = rawText.match(/(\d+)\s*(?:-\s*(\d+))?\s*(?:người|khẩu phần|phần)/i);
  if (servingMatch) {
    base_servings = parseInt(servingMatch[2] || servingMatch[1], 10) || 2;
  }

  // Quét thời gian nấu
  const timeMatch = rawText.match(/(\d+)\s*(?:phút|tiếng|h)/i);
  if (timeMatch) {
    let t = parseInt(timeMatch[1], 10);
    if (/tiếng|h/i.test(timeMatch[0])) t *= 60;
    cook_time = t;
  }

  let currentSection = ''; // 'ing' hoặc 'step'

  for (let line of lines) {
    const lower = line.toLowerCase();
    
    // Nhận diện chuyển phần
    if (lower.includes('nguyên liệu') || lower.includes('phần cơm') || lower.includes('phần thịt')) {
      currentSection = 'ing';
      continue;
    }
    if (lower.includes('bước') || lower.includes('thực hiện') || lower.includes('cách làm') || lower.includes('chế biến') || lower.includes('thưởng thức')) {
      currentSection = 'step';
      continue;
    }

    // Xử lý dòng nguyên liệu
    if (currentSection === 'ing') {
      const cleanLine = line.replace(/^[-•*+–—]\s*/, '').trim();
      if (!cleanLine || cleanLine.startsWith('Cho phần') || cleanLine.endsWith(':')) continue;

      const parts = cleanLine.split(/[:–—]/);
      if (parts.length >= 2) {
        let name = parts[0].replace(/\(.*?\)/g, '').replace(/^[-•*+–—]\s*/, '').trim();
        let rest = parts.slice(1).join(' ').trim();
        
        // Bóc tách số lượng và đơn vị
        const m = rest.match(/([\d.,]+)\s*([a-zA-ZÀ-ỹ]+)?/);
        let amount = m ? parseFloat(m[1].replace(',', '.')) : 100;
        let unit = m && m[2] ? m[2].toLowerCase().trim() : 'g';

        if (name && name.length < 50) {
          ingredients.push({
            name,
            amountPerPerson: Math.round((amount / base_servings) * 10) / 10 || 1,
            unit: unit || 'g',
          });
        }
      }
    }

    // Xử lý dòng bước thực hiện
    if (currentSection === 'step') {
      const cleanStep = line.replace(/^(\d+\.|\d+\)|\*|-|•)\s*/, '').trim();
      if (cleanStep.length > 15) {
        steps.push(cleanStep);
      }
    }
  }

  return {
    title: title || 'Món ăn mới',
    desc: lines[0] && lines[0].length > 20 ? lines[0] : 'Công thức nấu ăn hấp dẫn, chuẩn vị.',
    cook_time: Math.min(cook_time, 180),
    difficulty,
    base_servings,
    cooking_method,
    ingredients: ingredients.length > 0 ? ingredients : [{ name: 'Nguyên liệu chính', amountPerPerson: 100, unit: 'g' }],
    steps: steps.length > 0 ? steps : ['Sơ chế nguyên liệu.', 'Tiến hành chế biến.', 'Hoàn thành và thưởng thức.'],
  };
}

export default function AddRecipeModal({ isOpen, onClose, onRecipeAdded }) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [showAiBox, setShowAiBox] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    cooking_method: 'Bếp thường',
    cook_time: 30,
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

  // Bóc tách dữ liệu thông minh kết hợp API AI và Local Parser
  const handleAIParse = async () => {
    if (!aiText.trim()) {
      alert('Vui lòng dán nội dung bài viết công thức vào khung!');
      return;
    }

    setAiLoading(true);

    try {
      let parsed = null;

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
        if (res.ok && !resData.error) {
          parsed = resData.data || resData;
        }
      } catch (networkErr) {
        console.warn('API AI gặp sự cố, tự động kích hoạt bộ bóc tách dự phòng:', networkErr);
      }

      // Kích hoạt bộ phân giải dự phòng cục bộ nếu AI trả về thiếu nguyên liệu
      if (!parsed || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
        parsed = parseRecipeLocally(aiText);
      }

      const servings = Number(parsed.base_servings || parsed.servings) || 2;

      // Chuẩn hóa danh sách nguyên liệu
      const formattedIngredients = (parsed.ingredients || []).map((ing) => {
        if (typeof ing === 'string') {
          const parts = ing.split(/[:–—]/);
          return {
            name: (parts[0] || '').replace(/[-•*+]/g, '').trim(),
            amountPerPerson: 50,
            unit: parts[1] ? parts[1].replace(/[0-9.,]/g, '').trim() : 'g',
          };
        }
        const rawAmt = ing.amountPerPerson ?? ing.amount ?? 1;
        return {
          name: String(ing.name || '').trim(),
          amountPerPerson: Math.round((Number(rawAmt) / (ing.amountPerPerson ? 1 : servings)) * 10) / 10 || 1,
          unit: String(ing.unit || 'g').trim(),
        };
      }).filter((item) => item.name);

      // Chuẩn hóa các bước nấu
      const formattedSteps = (parsed.steps || parsed.instructions || [])
        .map((s) => (typeof s === 'string' ? s : s?.step || s?.text || ''))
        .map((s) => s.trim())
        .filter(Boolean);

      setFormData((prev) => ({
        ...prev,
        title: (parsed.title || prev.title || 'Món ngon mỗi ngày').replace(/^[0-9.:–-\s]+/, '').trim(),
        desc: parsed.desc || parsed.description || prev.desc || '',
        cook_time: Number(parsed.cook_time || parsed.time) || prev.cook_time || 30,
        difficulty: parsed.difficulty || prev.difficulty || 'Dễ',
        cooking_method: parsed.cooking_method || prev.cooking_method || 'Bếp thường',
        base_servings: servings,
        ingredients: formattedIngredients.length > 0 ? formattedIngredients : prev.ingredients,
        steps: formattedSteps.length > 0 ? formattedSteps : prev.steps,
      }));

      alert('🎉 Đã bóc tách thành công toàn bộ nguyên liệu và công thức!');
    } catch (err) {
      alert('Lỗi bóc tách: ' + err.message);
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

      const defaultImage = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80';
      const finalImage = formData.image_url.trim() || defaultImage;

      const payload = {
        title: formData.title.trim(),
        desc: formData.desc.trim(),
        description: formData.desc.trim(),
        cooking_method: formData.cooking_method,
        cook_time: Number(formData.cook_time) || 30,
        time: `${Number(formData.cook_time) || 30} phút`,
        difficulty: formData.difficulty,
        base_servings: Number(formData.base_servings) || 2,
        image: finalImage,
        image_url: finalImage,
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
              {aiLoading ? '⏳ Đang bóc tách dữ liệu...' : '⚡ Bóc tách & Điền form tự động'}
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
              placeholder="VD: Cơm âm phủ xứ Huế"
              value={formData.title}
              onChange={handleChange}
              style={modalStyles.input}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px' }}>
              <label style={modalStyles.label}>Thiết bị nấu:</label>
              <select
                name="cooking_method"
                value={formData.cooking_method}
                onChange={handleChange}
                style={modalStyles.input}
              >
                <option value="Bếp thường">🍳 Bếp thường</option>
                <option value="Nồi chiên không dầu">⚡ Nồi chiên không dầu</option>
                <option value="Lò nướng">🔥 Lò nướng</option>
              </select>
            </div>

            <div style={{ flex: '1 1 100px' }}>
              <label style={modalStyles.label}>Thời gian (phút):</label>
              <input
                type="number"
                name="cook_time"
                value={formData.cook_time}
                onChange={handleChange}
                style={modalStyles.input}
              />
            </div>

            <div style={{ flex: '1 1 100px' }}>
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

            <div style={{ flex: '1 1 100px' }}>
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
              placeholder="https://images.unsplash.com/..."
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
                  placeholder="Tên nguyên liệu (VD: Thịt heo)"
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