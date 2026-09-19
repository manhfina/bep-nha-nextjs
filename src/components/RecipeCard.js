'use client';

export default function RecipeCard({ recipe, isFav, onToggleFav, onOpenDetail, onDelete }) {
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

  return (
    <div className="recipe-card" onClick={() => onOpenDetail(recipe)}>
      <div className="card-image-wrap" style={{ position: 'relative' }}>
        <img
          src={recipe.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80'}
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
        <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#666', lineHeight: '1.4' }}>
          {recipe.desc || 'Chưa có mô tả'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888' }}>
          <span>⏱️ {recipe.time}</span>
          <span style={{ color: '#e67e22', fontWeight: 'bold' }}>Độ khó: {recipe.difficulty}</span>
        </div>
      </div>
    </div>
  );
}