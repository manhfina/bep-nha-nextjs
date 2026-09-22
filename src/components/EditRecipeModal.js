'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function EditRecipeModal({
  isOpen,
  recipe,
  onClose,
  onRecipeUpdated,
  currentUser,
}) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cook_time: 15,
    difficulty: 'Dễ',
    image_url: '',
    ingredients: '',
    instructions: '',
  });

  // Chuyển đổi an toàn chuỗi/mảng bất kỳ
  const safeParseArray = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return raw.split('\n').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  useEffect(() => {
    if (recipe && isOpen) {
      const baseServings = recipe.baseServings || recipe.base_servings || 2;

      // 1. Phân tích nguyên liệu & GIỮ NGUYÊN ĐƠN VỊ TÍNH
      const rawIngs = safeParseArray(recipe.ingredients);
      const ingLines = rawIngs
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const name = item.name || '';
            const unit = item.unit || '';
            const amount =
              item.amount != null
                ? item.amount
                : item.amountPerPerson != null
                ? item.amountPerPerson * baseServings
                : '';

            // Nếu trong tên đã chứa sẵn ": " và số thì giữ nguyên
            if (name.includes(':') && (name.includes(unit) || !unit)) {
              return name;
            }

            if (amount !== '' && unit !== '') {
              return `${name}: ${amount} ${unit}`.trim();
            }
            if (amount !== '') {
              return `${name}: ${amount}`.trim();
            }
            if (unit !== '') {
              return `${name} (${unit})`.trim();
            }
            return name;
          }
          return '';
        })
        .filter(Boolean);

      // 2. Phân tích các bước nấu
      const rawSteps = safeParseArray(recipe.steps || recipe.instructions);
      const stepLines = rawSteps
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            return item.step || item.text || item.description || '';
          }
          return '';
        })
        .filter(Boolean);

      const parsedTime = parseInt(recipe.time) || parseInt(recipe.cook_time) || 15;
      const initialImg = recipe.image || recipe.image_url || '';

      setFormData({
        title: recipe.title || '',
        description: recipe.desc || recipe.description || '',
        cook_time: parsedTime,
        difficulty: recipe.difficulty || 'Dễ',
        image_url: initialImg,
        ingredients: ingLines.join('\n'),
        instructions: stepLines.join('\n'),
      });
      setPreviewImage(initialImg);
    }
  }, [recipe, isOpen]);

  if (!isOpen || !recipe) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewImage(URL.createObjectURL(file));
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('recipes')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicData } = supabase.storage
        .from('recipes')
        .getPublicUrl(filePath);

      const uploadedUrl = publicData.publicUrl;
      setFormData((prev) => ({ ...prev, image_url: uploadedUrl }));
      setPreviewImage(uploadedUrl);
    } catch (err) {
      alert('Lỗi tải ảnh: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const getSafeUserPhone = () => {
    if (!currentUser) return '';
    try {
      if (currentUser.user_metadata?.raw_phone) {
        return String(currentUser.user_metadata.raw_phone).trim();
      }
      const email = String(currentUser.email || '').trim();
      if (email.endsWith('@bep-nha-nextjs.vercel.app')) {
        return email.replace('@bep-nha-nextjs.vercel.app', '');
      }
      if (email.endsWith('@phone.bepnha.com')) {
        return email.replace('@phone.bepnha.com', '');
      }
      const firstPart = email.split('@')[0];
      if (/^\d+$/.test(firstPart)) return firstPart;
    } catch (e) {}
    return '';
  };

  // Hàm bóc tách thông minh dòng chữ thành { name, amountPerPerson, unit }
  const parseIngredientLine = (line, baseServings = 2) => {
    const trimmed = String(line).trim();
    if (!trimmed) return null;

    // Định dạng: "Cà tím: 2 quả" hoặc "Cà tím: 200 gram"
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const name = parts[0].trim();
      const rest = parts.slice(1).join(':').trim();

      const match = rest.match(/^([\d.,]+)\s*(.*)$/);
      if (match) {
        const num = parseFloat(match[1].replace(',', '.'));
        const unit = match[2] ? match[2].trim() : '';
        return {
          name,
          amountPerPerson: !isNaN(num) ? num / baseServings : 1,
          unit: unit || 'phần',
        };
      }
      return { name, amountPerPerson: 1, unit: rest || 'phần' };
    }

    // Định dạng không có dấu hai chấm: "2 quả cà tím" hoặc "500g thịt bò"
    const regex = /^([\d.,]+)\s*(kilogram|kg|gam|gram|gr|g|lạng|quả|trái|củ|nhánh|cọng|tép|bó|mớ|miếng|hộp|chai|lít|lit|ml|thìa cà phê|muỗng cà phê|thìa canh|muỗng canh|thìa|muỗng|bát|chén)?\s*(.*)$/i;
    const match = trimmed.match(regex);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'));
      const unit = match[2] ? match[2].trim() : 'phần';
      const name = match[3] ? match[3].trim() : trimmed;
      return {
        name: name || trimmed,
        amountPerPerson: !isNaN(num) ? num / baseServings : 1,
        unit,
      };
    }

    return {
      name: trimmed,
      amountPerPerson: 1,
      unit: '',
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Tên món ăn không được để trống!');
      return;
    }

    setLoading(true);

    try {
      const baseServings = recipe.baseServings || recipe.base_servings || 2;

      // 1. Phân tích nguyên liệu & GIỮ ĐẦY ĐỦ ĐƠN VỊ TÍNH (ĐVT)
      const ingredientsArray = String(formData.ingredients || '')
        .split('\n')
        .map((line) => parseIngredientLine(line, baseServings))
        .filter(Boolean);

      // 2. Chuẩn hóa các bước nấu
      const instructionsArray = String(formData.instructions || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((line) => String(line));

      const phoneStr = getSafeUserPhone();
      const finalImg = String(formData.image_url || previewImage || '').trim();

      const payload = {
        id: recipe.id,
        title: String(formData.title).trim(),
        desc: String(formData.description || '').trim(),
        description: String(formData.description || '').trim(),
        time: `${Number(formData.cook_time) || 15} phút`,
        cook_time: Number(formData.cook_time) || 15,
        difficulty: String(formData.difficulty || 'Dễ'),
        image: finalImg,
        image_url: finalImg,
        ingredients: ingredientsArray,
        steps: instructionsArray,
      };

      const res = await fetch('/api/recipes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': phoneStr,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(responseData.error || `Lỗi cập nhật (${res.status})`);
      }

      onRecipeUpdated(responseData);
      onClose();
      alert('🎉 Đã cập nhật công thức và đơn vị tính thành công!');
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể cập nhật'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        <h2 style={modalStyles.title}>✏️ Chỉnh sửa công thức</h2>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Tên món ăn *</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Mô tả</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.row}>
            <div style={{ flex: 1 }}>
              <label style={modalStyles.label}>Thời gian nấu (phút)</label>
              <input
                type="number"
                name="cook_time"
                value={formData.cook_time}
                onChange={handleChange}
                style={modalStyles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={modalStyles.label}>Độ khó</label>
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
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Đổi ảnh mới (tùy chọn)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ ...modalStyles.input, padding: '8px' }}
            />
            {uploading && <span style={{ fontSize: '0.8rem', color: '#e67e22' }}>Đang tải ảnh...</span>}
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', marginTop: '6px' }}
              />
            )}
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>
              Nguyên liệu (Mỗi dòng 1 loại: Tên: Số lượng ĐVT)
            </label>
            <textarea
              name="ingredients"
              rows={5}
              value={formData.ingredients}
              onChange={handleChange}
              style={modalStyles.textarea}
              placeholder="Ví dụ:&#10;Cà tím: 2 quả&#10;Ớt cay: 2 quả&#10;Tỏi: 1 củ&#10;Nước mắm: 2 thìa canh"
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Các bước nấu (mỗi dòng 1 bước)</label>
            <textarea
              name="instructions"
              rows={4}
              value={formData.instructions}
              onChange={handleChange}
              style={modalStyles.textarea}
              placeholder="Bước 1: Sơ chế...&#10;Bước 2: Nấu..."
            />
          </div>

          <div style={modalStyles.actions}>
            <button type="button" onClick={onClose} style={modalStyles.btnCancel}>Hủy</button>
            <button type="submit" disabled={loading || uploading} style={modalStyles.btnSubmit}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
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
    maxWidth: '540px',
    width: '100%',
    maxHeight: '88vh',
    overflowY: 'auto',
    padding: '28px',
    position: 'relative',
    boxSizing: 'border-box',
  },
  closeBtn: {
    position: 'absolute',
    top: '18px',
    right: '20px',
    background: '#f1f2f6',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  title: { margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: '700' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' },
  row: { display: 'flex', gap: '12px', textAlign: 'left' },
  label: { fontSize: '0.85rem', fontWeight: '600', color: '#4b5563' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dcdde1', fontSize: '0.9rem', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dcdde1', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid #eee' },
  btnCancel: { padding: '10px 18px', borderRadius: '10px', border: '1px solid #ccc', background: '#f8f9fa', cursor: 'pointer' },
  btnSubmit: { padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#2980b9', color: '#fff', fontWeight: '700', cursor: 'pointer' },
};