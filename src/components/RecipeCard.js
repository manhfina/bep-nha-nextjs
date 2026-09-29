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

          {/* Huy hiệu Nồi chiên không dầu - Đậm nét, to rõ, chuẩn Flat Design */}
{cookingMethod === 'Nồi chiên không dầu' && (
  <span
    title="Món làm bằng Nồi chiên không dầu"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      backgroundColor: '#fff7ed',
      border: '1px solid #fdba74',
      padding: '3px 8px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(234, 88, 12, 0.12)',
      cursor: 'pointer',
    }}
  >
    {/* SVG Nồi chiên không dầu vẽ chuẩn tỉ lệ, to rõ, màu cam/đen công nghệ */}
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      {/* Thân nồi chiên hình vòm bo tròn sang trọng */}
      <rect x="7" y="5" width="34" height="38" rx="8" fill="#ea580c" />
      <path d="M7 13C7 8.58172 10.5817 5 15 5H33C37.4183 5 41 8.58172 41 13V15H7V13Z" fill="#c2410c" />
      
      {/* Bảng điều khiển cảm ứng LED phía trên */}
      <rect x="13" y="8" width="22" height="5" rx="2.5" fill="#1e293b" />
      <circle cx="18" cy="10.5" r="1.2" fill="#38bdf8" />
      <circle cx="24" cy="10.5" r="1.2" fill="#fbbf24" />
      <circle cx="30" cy="10.5" r="1.2" fill="#4ade80" />

      {/* Ngăn kéo chiên tách biệt bên dưới */}
      <rect x="9" y="18" width="30" height="22" rx="5" fill="#fff7ed" stroke="#c2410c" strokeWidth="2" />
      
      {/* Mặt kính quan sát thực phẩm bên trong */}
      <rect x="13" y="21" width="22" height="11" rx="3" fill="#fdba74" />
      <path d="M16 29C18 25 21 25 24 28C27 25 30 25 32 29" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />

      {/* Tay cầm khay chiên kim loại cách nhiệt */}
      <rect x="21" y="33" width="6" height="4" rx="1.5" fill="#475569" />
    </svg>

    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#c2410c' }}>
      Nồi chiên
    </span>
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