'use client';

export default function CartModal({
  isOpen,
  shoppingList,
  onClose,
  onRemoveItem,
  onClearCart,
}) {
  if (!isOpen) return null;

  return (
    <div style={cartStyles.overlay} onClick={onClose}>
      <div style={cartStyles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={cartStyles.closeBtn}>
          ✕
        </button>

        <div style={cartStyles.header}>
          <h2 style={cartStyles.title}>🛒 Giỏ đi chợ</h2>
          {shoppingList.length > 0 && (
            <button onClick={onClearCart} style={cartStyles.btnClear}>
              Xóa tất cả
            </button>
          )}
        </div>

        {shoppingList.length === 0 ? (
          <div style={cartStyles.emptyState}>
            <p style={{ fontSize: '2.5rem', margin: 0 }}>🥬</p>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '8px' }}>
              Giỏ đi chợ đang trống. Mở món ăn bất kỳ và bấm &quot;Thêm vào giỏ&quot; để lưu nguyên liệu cần mua!
            </p>
          </div>
        ) : (
          <div style={cartStyles.list}>
            {shoppingList.map((item) => (
              <div key={item.id} style={cartStyles.item}>
                <div>
                  <span style={cartStyles.dishName}>[{item.dish}]</span>
                  <p style={cartStyles.itemText}>{item.text}</p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  style={cartStyles.btnDelete}
                  title="Xóa món này"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cartStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '24px',
    boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
    position: 'relative',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '18px',
    right: '18px',
    background: '#f1f2f6',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingRight: '36px',
  },
  title: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#2d3436',
  },
  btnClear: {
    background: 'transparent',
    border: 'none',
    color: '#e74c3c',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 10px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #f1f2f6',
  },
  dishName: {
    fontSize: '0.75rem',
    color: '#e67e22',
    fontWeight: '600',
  },
  itemText: {
    margin: '2px 0 0 0',
    fontSize: '0.9rem',
    color: '#2d3436',
    fontWeight: '500',
  },
  btnDelete: {
    background: 'transparent',
    border: 'none',
    color: '#b2bec3',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: '4px',
  },
};