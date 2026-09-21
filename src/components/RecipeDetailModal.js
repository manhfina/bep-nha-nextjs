'use client';
import { useState, useEffect } from 'react';
import ShareRecipeModal from './ShareRecipeModal';

export default function RecipeDetailModal({
  recipe,
  servings = 2,
  onClose,
  onChangeServings,
  onAddToCart,
  onEdit,
  onStartCook,
  currentUser,
  currentKitchen,
}) {
  const [activeTab, setActiveTab] = useState('recipe'); // 'recipe' hoặc 'notes'
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  
  // State mở modal chia sẻ QR
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Tải danh sách ghi chú
  const fetchNotes = async () => {
    if (!recipe?.id) return;
    setLoadingNotes(true);
    try {
      const kitchenParam = currentKitchen?.id ? `&kitchenId=${currentKitchen.id}` : '';
      const res = await fetch(`/api/recipe-notes?recipeId=${recipe.id}${kitchenParam}`);
      const data = await res.json();
      if (Array.isArray(data)) setNotes(data);
    } catch (err) {
      console.error('Lỗi tải ghi chú:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (recipe?.id) {
      fetchNotes();
      setActiveTab('recipe');
      setNewNote('');
      setNewRating(5);
      setIsShareOpen(false);
    }
  }, [recipe?.id]);

  if (!recipe) return null;

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const userIdentifier = currentUser?.email?.includes('@phone.bepnha.com')
        ? currentUser.email.replace('@phone.bepnha.com', '')
        : currentUser?.email?.split('@')[0] || 'Khách';

      const res = await fetch('/api/recipe-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: recipe.id,
          kitchenId: currentKitchen?.id || null,
          userId: currentUser?.id || null,
          userIdentifier,
          rating: newRating,
          note: newNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể lưu ghi chú');

      setNotes((prev) => [data, ...prev]);
      setNewNote('');
      setNewRating(5);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) return;
    try {
      const res = await fetch(`/api/recipe-notes?id=${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa');
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      alert(err.message);
    }
  };

  const avgRating =
    notes.length > 0
      ? (notes.reduce((sum, n) => sum + (n.rating || 5), 0) / notes.length).toFixed(1)
      : null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>

          {/* Ảnh và tiêu đề */}
          <div style={styles.imageContainer}>
            <img src={recipe.image} alt={recipe.title} style={styles.image} />
            <div style={styles.headerInfo}>
              <h2 style={styles.title}>{recipe.title}</h2>
              <div style={styles.metaRow}>
                <span>⏱️ {recipe.time}</span>
                <span>🔥 {recipe.difficulty || 'Dễ'}</span>
                {avgRating && (
                  <span style={styles.avgBadge}>
                    ⭐ {avgRating} ({notes.length})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab */}
          <div style={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab('recipe')}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'recipe' ? styles.tabActive : {}),
              }}
            >
              📖 Công thức & Các bước
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'notes' ? styles.tabActive : {}),
              }}
            >
              ⭐ Mẹo & Đánh giá ({notes.length})
            </button>
          </div>

          {/* Nội dung */}
          <div style={styles.bodyContent}>
            {activeTab === 'recipe' ? (
              <>
                <div style={styles.servingsCard}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2d3436' }}>
                    Khẩu phần ăn:
                  </span>
                  <div style={styles.servingsControls}>
                    <button
                      onClick={() => onChangeServings(Math.max(1, servings - 1))}
                      style={styles.servingsBtn}
                    >
                      -
                    </button>
                    <span style={styles.servingsValue}>{servings} người</span>
                    <button
                      onClick={() => onChangeServings(servings + 1)}
                      style={styles.servingsBtn}
                    >
                      +
                    </button>
                  </div>
                </div>

                <h3 style={styles.sectionTitle}>Nguyên liệu cần chuẩn bị</h3>
                <ul style={styles.ingredientList}>
                  {(recipe.ingredients || []).map((item, idx) => (
                    <li key={idx} style={styles.ingredientItem}>
                      {typeof item === 'string' ? (
                        item
                      ) : (
                        <span>
                          <strong>{item.name}</strong>:{' '}
                          {((item.amountPerPerson || 1) * servings).toFixed(1).replace(/\.0$/, '')}{' '}
                          {item.unit}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <h3 style={styles.sectionTitle}>Các bước thực hiện</h3>
                <div style={styles.stepList}>
                  {(recipe.steps || []).map((step, idx) => (
                    <div key={idx} style={styles.stepItem}>
                      <span style={styles.stepBadge}>{idx + 1}</span>
                      <p style={styles.stepText}>{step}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <form onSubmit={handleAddNote} style={styles.noteForm}>
                  <div style={styles.ratingPickerRow}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2d3436' }}>
                      Chấm điểm:
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            padding: 0,
                            opacity: star <= newRating ? 1 : 0.25,
                          }}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    required
                    rows="2"
                    placeholder="Ghi lại kinh nghiệm của nhà mình (VD: bớt 1 thìa muối, nướng thêm 3 phút thơm hơn...)"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    style={styles.noteInput}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={submittingNote} style={styles.btnSaveNote}>
                      {submittingNote ? 'Đang lưu...' : '💾 Lưu kinh nghiệm'}
                    </button>
                  </div>
                </form>

                {loadingNotes ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                    Đang tải mẹo nấu của bếp...
                  </p>
                ) : notes.length === 0 ? (
                  <div style={styles.emptyNotes}>
                    <span style={{ fontSize: '2rem' }}>📝</span>
                    <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '0.88rem' }}>
                      Chưa có ghi chú nào cho món này. Hãy chia sẻ mẹo nấu của bạn!
                    </p>
                  </div>
                ) : (
                  <div style={styles.notesFeed}>
                    {notes.map((item) => (
                      <div key={item.id} style={styles.noteCard}>
                        <div style={styles.noteHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#2d3436' }}>
                              👤 {item.user_identifier}
                            </span>
                            <span style={styles.starDisplay}>
                              {'⭐'.repeat(item.rating || 5)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#a4b0be' }}>
                              {new Date(item.created_at).toLocaleDateString('vi-VN')}
                            </span>
                            {currentUser?.id === item.user_id && (
                              <button
                                onClick={() => handleDeleteNote(item.id)}
                                style={styles.btnDeleteNote}
                                title="Xóa ghi chú"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={styles.noteContent}>{item.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer nút hành động */}
          <div style={styles.footer}>
            <button onClick={onStartCook} style={styles.btnCook}>
              👨‍🍳 Bắt đầu nấu
            </button>
            <button onClick={onAddToCart} style={styles.btnCart}>
              🛒 Thêm vào giỏ
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              style={styles.btnShareMini}
              title="Chia sẻ mã QR / Link"
            >
              📤
            </button>
            {onEdit && (
              <button onClick={() => onEdit(recipe)} style={styles.btnEdit}>
                ✏️ Sửa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Chia Sẻ QR Code đặt ở ngoài cùng để không bị che khuất */}
      <ShareRecipeModal
        isOpen={isShareOpen}
        recipe={recipe}
        onClose={() => setIsShareOpen(false)}
      />
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '540px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px', right: '16px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'none', borderRadius: '50%',
    width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold',
    zIndex: 2,
  },
  imageContainer: {
    position: 'relative', width: '100%', height: '180px',
  },
  image: {
    width: '100%', height: '100%', objectFit: 'cover',
  },
  headerInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
    padding: '16px 20px 10px 20px', color: '#fff',
  },
  title: {
    margin: 0, fontSize: '1.35rem', fontWeight: '800',
  },
  metaRow: {
    display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.82rem',
    alignItems: 'center',
  },
  avgBadge: {
    backgroundColor: '#f39c12', color: '#fff',
    padding: '2px 8px', borderRadius: '6px', fontWeight: '700',
  },
  tabsContainer: {
    display: 'flex', borderBottom: '1px solid #edf2f7',
    background: '#f8f9fa',
  },
  tabBtn: {
    flex: 1, padding: '12px', border: 'none', background: 'transparent',
    fontSize: '0.85rem', fontWeight: '700', color: '#718096',
    cursor: 'pointer', borderBottom: '3px solid transparent',
  },
  tabActive: {
    color: '#e67e22', borderBottom: '3px solid #e67e22', background: '#fff',
  },
  bodyContent: {
    padding: '18px 22px', overflowY: 'auto', flex: 1,
  },
  servingsCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', backgroundColor: '#fffaf0',
    border: '1px solid #feebc8', borderRadius: '12px', marginBottom: '14px',
  },
  servingsControls: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  servingsBtn: {
    width: '28px', height: '28px', borderRadius: '8px',
    border: '1px solid #cbd5e0', background: '#fff',
    cursor: 'pointer', fontWeight: 'bold',
  },
  servingsValue: {
    fontWeight: '700', fontSize: '0.9rem', minWidth: '65px', textAlign: 'center',
  },
  sectionTitle: {
    fontSize: '0.95rem', margin: '14px 0 8px 0', color: '#2d3436', fontWeight: '700',
  },
  ingredientList: {
    paddingLeft: '18px', margin: '0 0 14px 0', fontSize: '0.9rem', color: '#4a5568',
  },
  ingredientItem: {
    marginBottom: '5px',
  },
  stepList: {
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  stepItem: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
  },
  stepBadge: {
    width: '22px', height: '22px', borderRadius: '50%',
    backgroundColor: '#e67e22', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0, marginTop: '2px',
  },
  stepText: {
    margin: 0, fontSize: '0.88rem', color: '#2d3436', lineHeight: '1.5',
  },
  noteForm: {
    backgroundColor: '#f8f9fa', padding: '14px', borderRadius: '14px',
    border: '1px solid #edf2f7', marginBottom: '16px',
  },
  ratingPickerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '10px',
  },
  noteInput: {
    width: '100%', padding: '10px', borderRadius: '10px',
    border: '1px solid #dcdde1', fontSize: '0.85rem',
    outline: 'none', boxSizing: 'border-box', resize: 'vertical',
  },
  btnSaveNote: {
    marginTop: '8px', backgroundColor: '#e67e22', color: '#fff',
    border: 'none', padding: '8px 14px', borderRadius: '8px',
    fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer',
  },
  emptyNotes: {
    textAlign: 'center', padding: '30px 10px',
  },
  notesFeed: {
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  noteCard: {
    backgroundColor: '#fff', padding: '12px 14px', borderRadius: '12px',
    border: '1px solid #edf2f7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  noteHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '6px',
  },
  starDisplay: {
    fontSize: '0.8rem',
  },
  btnDeleteNote: {
    background: 'none', border: 'none', color: '#b2bec3',
    cursor: 'pointer', fontSize: '0.85rem',
  },
  noteContent: {
    margin: 0, fontSize: '0.88rem', color: '#2d3436', lineHeight: '1.45',
  },
  footer: {
    display: 'flex', gap: '8px', padding: '14px 20px',
    borderTop: '1px solid #edf2f7', background: '#fff',
  },
  btnCook: {
    flex: 2, backgroundColor: '#27ae60', color: '#fff',
    border: 'none', padding: '11px', borderRadius: '12px',
    fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
  },
  btnCart: {
    flex: 2, backgroundColor: '#e67e22', color: '#fff',
    border: 'none', padding: '11px', borderRadius: '12px',
    fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
  },
  btnShareMini: {
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    padding: '11px 16px',
    borderRadius: '12px',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEdit: {
    flex: 1, backgroundColor: '#f1f2f6', color: '#2d3436',
    border: 'none', padding: '11px', borderRadius: '12px',
    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
  },
};