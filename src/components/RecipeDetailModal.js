'use client';

export default function RecipeDetailModal({
  recipe,
  servings,
  onClose,
  onChangeServings,
  onAddToCart,
  onStartCook,
  onEdit,
}) {
  if (!recipe) return null;

  const base = recipe.baseServings || 2;
  const ratio = servings / base;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Nút đóng */}
        <button onClick={onClose} style={styles.closeBtn}>
          ✕
        </button>
        {/* Nút sửa ✏️ (nằm lùi sang trái một chút, right: 58px) */}
        {onEdit && (
          <button
            onClick={() => onEdit(recipe)}
            style={{ ...styles.closeBtn, right: '58px', fontSize: '0.9rem' }}
            title="Chỉnh sửa công thức"
          >
            ✏️
          </button>
        )}
        {/* Khung ảnh */}
        <div style={styles.imageContainer}>
          <img src={recipe.image} alt={recipe.title} style={styles.image} />
          <div style={styles.imageOverlay} />
          <div style={styles.headerInfo}>
            <span style={styles.badge}>{recipe.difficulty}</span>
            <h2 style={styles.title}>{recipe.title}</h2>
            <p style={styles.time}>⏱️ {recipe.time}</p>
          </div>
        </div>

        {/* Nội dung chi tiết */}
        <div style={styles.body}>
          {recipe.desc && <p style={styles.desc}>{recipe.desc}</p>}

          {/* Điều chỉnh khẩu phần */}
          <div style={styles.servingsBar}>
            <div>
              <span style={styles.servingsTitle}>Khẩu phần ăn</span>
              <p style={styles.servingsSub}>Định lượng tự động cân chỉnh</p>
            </div>
            <div style={styles.counter}>
              <button
                onClick={() => onChangeServings(Math.max(1, servings - 1))}
                style={styles.btnCount}
              >
                -
              </button>
              <span style={styles.countText}>{servings} người</span>
              <button
                onClick={() => onChangeServings(servings + 1)}
                style={styles.btnCount}
              >
                +
              </button>
            </div>
          </div>

          {/* Nguyên liệu */}
          <div>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>🛒 Nguyên liệu chuẩn bị</h3>
              <button onClick={onAddToCart} style={styles.btnAddCart}>
                + Thêm vào giỏ
              </button>
            </div>

            <div style={styles.ingredientGrid}>
              {(recipe.ingredients || []).map((ing, idx) => {
                if (typeof ing === 'string') {
                  return (
                    <div key={idx} style={styles.ingredientCard}>
                      <span style={styles.dot}>•</span>
                      <span>{ing}</span>
                    </div>
                  );
                }

                const calculatedAmount = ing.amountPerPerson
                  ? Math.round(ing.amountPerPerson * servings * 10) / 10
                  : ing.amount
                  ? Math.round(ing.amount * ratio * 10) / 10
                  : null;

                return (
                  <div key={idx} style={styles.ingredientCard}>
                    <span>{ing.name}</span>
                    <strong>
                      {calculatedAmount ? `${calculatedAmount} ` : ''}
                      {ing.unit || ''}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Các bước nấu */}
          <div>
            <h3 style={styles.sectionTitle}>📝 Các bước thực hiện</h3>
            <div style={styles.stepsList}>
              {(recipe.steps || []).map((step, idx) => (
                <div key={idx} style={styles.stepItem}>
                  <span style={styles.stepNumber}>{idx + 1}</span>
                  <span style={styles.stepText}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nút hành động */}
          <div style={styles.footer}>
            <button onClick={onStartCook} style={styles.btnCook}>
              🔥 Bắt đầu nấu (Cook Mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    position: 'relative',
    boxSizing: 'border-box',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 10,
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '34px',
    height: '34px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '240px',
    backgroundColor: '#f1f2f6',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)',
  },
  headerInfo: {
    position: 'absolute',
    bottom: '16px',
    left: '20px',
    right: '20px',
    color: '#fff',
    textAlign: 'left',
  },
  badge: {
    backgroundColor: '#e67e22',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  title: {
    margin: '6px 0 2px 0',
    fontSize: '1.4rem',
    fontWeight: '700',
  },
  time: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#dfe6e9',
  },
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    textAlign: 'left',
  },
  desc: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#555',
    lineHeight: '1.5',
    background: '#fcf8f2',
    border: '1px solid #fae5cc',
    padding: '10px 14px',
    borderRadius: '12px',
  },
  servingsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderTop: '1px solid #f0f0f0',
    borderBottom: '1px solid #f0f0f0',
  },
  servingsTitle: {
    fontWeight: '700',
    fontSize: '0.95rem',
    color: '#2c3e50',
  },
  servingsSub: {
    margin: '2px 0 0 0',
    fontSize: '0.75rem',
    color: '#95a5a6',
  },
  counter: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  btnCount: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid #dcdde1',
    background: '#fff',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  countText: {
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#2c3e50',
  },
  btnAddCart: {
    background: '#fff3e0',
    color: '#e67e22',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  ingredientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
  },
  ingredientCard: {
    background: '#f8f9fa',
    padding: '8px 12px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#444',
  },
  dot: {
    color: '#e67e22',
    marginRight: '6px',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '0.85rem',
    color: '#444',
    lineHeight: '1.4',
  },
  stepNumber: {
    background: '#fff3e0',
    color: '#e67e22',
    fontWeight: 'bold',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  stepText: {
    paddingTop: '2px',
  },
  footer: {
    paddingTop: '10px',
  },
  btnCook: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #e67e22, #d35400)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(230, 126, 34, 0.3)',
  },
};