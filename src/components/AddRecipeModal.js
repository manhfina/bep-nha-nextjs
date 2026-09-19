'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AddRecipeModal({ isOpen, onClose, onRecipeAdded }) {
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

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Tải ảnh trực tiếp lên Supabase Storage
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
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicData } = supabase.storage
        .from('recipes')
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: publicData.publicUrl }));
    } catch (err) {
      alert('Lỗi tải ảnh: ' + err.message);
      setPreviewImage('');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Chuẩn hóa nguyên liệu thành mảng Object phù hợp tính năng đổi khẩu phần
      const ingredientsArray = formData.ingredients
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((line) => {
          return {
            name: line,
            amountPerPerson: 1,
            unit: '',
          };
        });

      // Chuẩn hóa các bước nấu thành mảng chuỗi
      const instructionsArray = formData.instructions
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      // Map chính xác tên cột với bảng recipes trong Supabase
      const payload = {
        title: formData.title,
        desc: formData.description,
        time: `${formData.cook_time} phút`,
        difficulty: formData.difficulty,
        image:
          formData.image_url ||
          'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
        base_servings: 2,
        ingredients: ingredientsArray,
        steps: instructionsArray,
      };

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi lưu món ăn');
      }

      const newRecipe = await res.json();
      onRecipeAdded(newRecipe);
      onClose();

      // Reset form sau khi thêm thành công
      setFormData({
        title: '',
        description: '',
        cook_time: 15,
        difficulty: 'Dễ',
        image_url: '',
        ingredients: '',
        instructions: '',
      });
      setPreviewImage('');
      alert('Đã thêm món mới thành công!');
    } catch (err) {
      alert('Không thể tạo công thức: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <button onClick={onClose} style={modalStyles.closeBtn}>
          ✕
        </button>

        <h2 style={modalStyles.title}>🍳 Đăng công thức mới</h2>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Tên món ăn *</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="VD: Cà tím rim mắm tỏi"
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Mô tả ngắn</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="VD: Món này làm siêu nhanh, nguyên liệu rẻ tiền mà tốn cơm..."
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
            <label style={modalStyles.label}>Chọn ảnh từ máy tính</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ ...modalStyles.input, padding: '8px' }}
            />
            {uploading && (
              <span style={{ fontSize: '0.8rem', color: '#e67e22', fontWeight: 'bold' }}>
                ⏳ Đang tải ảnh lên Supabase Storage...
              </span>
            )}
            {previewImage && (
              <div style={{ marginTop: '8px' }}>
                <img
                  src={previewImage}
                  alt="Xem trước ảnh"
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px' }}
                />
              </div>
            )}
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Nguyên liệu (mỗi dòng 1 loại)</label>
            <textarea
              name="ingredients"
              rows={3}
              value={formData.ingredients}
              onChange={handleChange}
              placeholder="1 trái ớt cay&#10;2 thìa nước mắm&#10;1 thìa đường"
              style={modalStyles.textarea}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Các bước nấu (mỗi dòng 1 bước)</label>
            <textarea
              name="instructions"
              rows={3}
              value={formData.instructions}
              onChange={handleChange}
              placeholder="Bước 1: Cà tím chẻ dọc, cắt miếng vừa ăn...&#10;Bước 2: Rán áp chảo vàng 2 mặt...&#10;Bước 3: Rưới nước mắm tỏi ớt vào rim..."
              style={modalStyles.textarea}
            />
          </div>

          <div style={modalStyles.actions}>
            <button type="button" onClick={onClose} style={modalStyles.btnCancel}>
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              style={modalStyles.btnSubmit}
            >
              {loading ? 'Đang lưu...' : 'Lưu công thức'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
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
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    position: 'relative',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
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
    color: '#666',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '1.4rem',
    color: '#2d3436',
    fontWeight: '700',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
  },
  row: {
    display: 'flex',
    gap: '12px',
    textAlign: 'left',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#4b5563',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #dcdde1',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
  },
  btnCancel: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    background: '#f8f9fa',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#555',
  },
  btnSubmit: {
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    background: '#27ae60',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
  },
};