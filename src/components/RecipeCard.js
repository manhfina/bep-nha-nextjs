'use client';

import { calculateRecipeTotalCost } from '@/lib/priceCalculator';

export default function RecipeCard({
  recipe,
  isFav,
  onToggleFav,
  onOpenDetail,
  onDelete,
  priceMap = {},
}) {
  // Tính tổng chi phí ước tính dựa trên khẩu phần mặc định (2 người)
  const estimatedCost = calculateRecipeTotalCost(recipe, priceMap, recipe.baseServings || 2);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc muốn xóa món "${recipe.title}" không?`)) {
      onDelete(recipe.id);
    }
  };

  const handleHeartClick = (e) => {
    e.stopPropagation();
    onToggleFav(e, recipe.id);
  };

  const cookingMethod = recipe.cooking_method || 'Bếp thường';

  return (
    <div className="recipe-card" onClick={() => onOpenDetail(recipe)}>
      <div className="card-image-wrap" style={{ position: 'relative' }}>
        <img
          src={
            recipe.image ||
            'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80'
          }
          alt={recipe.title}
          style={{ width: '100%', height: '180px', objectFit: 'cover' }}
        />

        {/* Nút yêu thích */}
        <button
          type="button"
          onClick={handleHeartClick}
          title={isFav ? 'Bỏ thích' : 'Yêu thích món này'}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: isFav ? '#ffebee' : 'rgba(255,255,255,0.9)',
            border: isFav ? '1px solid #ff4757' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            cursor: 'pointer',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'transform 0.15s ease',
          }}
        >
          {isFav ? '❤️' : '🤍'}
        </button>

        {/* Nút xóa món */}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            title="Xóa món ăn"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            🗑️
          </button>
        )}
      </div>

      <div style={{ padding: '14px', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>
          {recipe.title}
        </h3>
        <p
          style={{
            margin: '0 0 10px 0',
            fontSize: '0.85rem',
            color: '#666',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {recipe.desc || 'Chưa có mô tả'}
        </p>

        {/* Khu vực huy hiệu: Giá tiền & Phương pháp/Thiết bị nấu */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
          {estimatedCost > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                color: '#27ae60',
                backgroundColor: '#eafaf1',
                padding: '3px 8px',
                borderRadius: '8px',
                fontWeight: '700',
              }}
            >
              💰 ~{estimatedCost.toLocaleString('vi-VN')}đ / {recipe.baseServings || 2} người
            </span>
          )}

          {/* Huy hiệu Icon Nồi chiên không dầu (Không chữ, chỉ icon nổi bật) */}
{cookingMethod === 'Nồi chiên không dầu' && (
  <span
    title="Món làm bằng Nồi chiên không dầu"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff4eb',
      border: '1px solid #ffd8be',
      padding: '3px 7px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(211, 84, 0, 0.08)',
      cursor: 'pointer',
    }}
  >
    <img
      src="https://cdn-icons-png.flaticon.com/512/7154/7154784.png"
      alt="Nồi chiên không dầu"
      style={{
        width: '18px',
        height: '18px',
        objectFit: 'contain',
        display: 'block'
      }}
    />
  </span>
)}

{/* Tương tự cho Lò nướng (nếu có) */}
{cookingMethod === 'Lò nướng' && (
  <span
    title="Món làm bằng Lò nướng"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fbe9e7',
      border: '1px solid #ffccbc',
      padding: '3px 7px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(192, 57, 43, 0.08)',
      cursor: 'pointer',
    }}
  >
    <img
      src="https://cdn-icons-png.flaticon.com/512/2143/2143150.png"
      alt="Lò nướng"
      style={{
        width: '18px',
        height: '18px',
        objectFit: 'contain',
        display: 'block'
      }}
    />
  </span>
)}

          {/* Huy hiệu Lò nướng */}
          {cookingMethod === 'Lò nướng' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.75rem',
                color: '#c0392b',
                backgroundColor: '#fbe9e7',
                border: '1px solid #ffccbc',
                padding: '2px 8px',
                borderRadius: '8px',
                fontWeight: '700',
              }}
            >
              🔥 Lò nướng
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#888',
          }}
        >
          <span>⏱️ {recipe.time}</span>
          <span style={{ color: '#e67e22', fontWeight: 'bold' }}>
            Độ khó: {recipe.difficulty || 'Dễ'}
          </span>
        </div>
      </div>
    </div>
  );
}