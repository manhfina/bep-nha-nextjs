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

  useEffect(() => {
    if (recipe) {
      const ingList = recipe.ingredients || [];
      const ingText = Array.isArray(ingList)
        ? ingList
            .map((ing) => (typeof ing === 'string' ? ing : ing?.name || ''))
            .filter(Boolean)
            .join('\n')
        : '';

      const stepList = recipe.steps || recipe.instructions || [];
      const stepText = Array.isArray(stepList)
        ? stepList.filter(Boolean).join('\n')
        : '';

      const parsedTime = parseInt(recipe.time) || parseInt(recipe.cook_time) || 15;
      const initialImg = recipe.image || recipe.image_url || '';

      setFormData({
        title: recipe.title || '',
        description: recipe.desc || recipe.description || '',
        cook_time: parsedTime,
        difficulty: recipe.difficulty || 'Dễ',
        image_url: initialImg,
        ingredients: ingText,
        instructions: stepText,
      });
      setPreviewImage(initialImg);
    }
  }, [recipe]);

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

  // Trích xuất số điện thoại sạch dạng chuỗi
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
    } catch (e) {
      console.error(e);
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Chuẩn hóa nguyên liệu
      const ingredientsArray = String(formData.ingredients || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((line) => ({
          name: String(line),
          amountPerPerson: 1,
          unit: '',
        }));

      // Chuẩn hóa các bước
      const instructionsArray = String(formData.instructions || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((line) => String(line));

      const phoneStr = getSafeUserPhone();
      const finalImg = String(formData.image_url || previewImage || '').trim();

      // Đóng gói payload thuần túy
      const payload = {
        id: recipe.id,
        title: String(formData.title || '').trim(),
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
        throw new Error(responseData.error || `Lỗi máy chủ (${res.status})`);
      }

      onRecipeUpdated(responseData);
      onClose();
      alert('🎉 Cập nhật công thức thành công!');
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
            <label style={modalStyles.label}>Nguyên liệu (mỗi dòng 1 loại)</label>
            <textarea
              name="ingredients"
              rows={4}
              value={formData.ingredients}
              onChange={handleChange}
              style={modalStyles.textarea}
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