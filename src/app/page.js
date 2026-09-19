'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import RecipeCard from '../components/RecipeCard';
import RecipeDetailModal from '../components/RecipeDetailModal';
import CookModeModal from '../components/CookModeModal';
import CartModal from '../components/CartModal';
import AddRecipeModal from '../components/AddRecipeModal';
import EditRecipeModal from '../components/EditRecipeModal';

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');

  // Modals state
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [servings, setServings] = useState(2);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);

  // Cook mode state
  const [cookModeRecipe, setCookModeRecipe] = useState(null);
  const [cookStep, setCookStep] = useState(0);

  // Hàm chuẩn hóa dữ liệu món ăn
  const formatRecipe = (item) => ({
    ...item,
    desc: item.desc || item.description || '',
    time: item.time || (item.cook_time ? `${item.cook_time} phút` : '15 phút'),
    image:
      item.image ||
      item.image_url ||
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
    baseServings: item.base_servings || item.baseServings || 2,
    steps: item.steps || item.instructions || [],
  });

  // 1. Tải công thức từ API
  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecipes(data.map(formatRecipe));
      } else {
        console.error('Lỗi tải dữ liệu:', data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();

    // Tải favorites từ API Supabase
    fetch('/api/favorites')
      .then((res) => res.json())
      .then((ids) => {
        if (Array.isArray(ids)) setFavorites(ids.map(String));
      })
      .catch((err) => console.error('Lỗi tải favorites:', err));

    // Tải shopping-list từ API Supabase
    fetch('/api/shopping-list')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items)) setShoppingList(items);
      })
      .catch((err) => console.error('Lỗi tải giỏ hàng:', err));

    // Lắng nghe sự kiện Realtime từ Supabase cho bảng recipes
    const channel = supabase
      .channel('realtime-recipes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newFormatted = formatRecipe(payload.new);
            setRecipes((prev) => {
              if (prev.some((r) => r.id === newFormatted.id)) return prev;
              return [newFormatted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedFormatted = formatRecipe(payload.new);
            setRecipes((prev) =>
              prev.map((r) => (r.id === updatedFormatted.id ? updatedFormatted : r))
            );
            setActiveRecipe((prev) => (prev?.id === updatedFormatted.id ? updatedFormatted : prev));
          } else if (payload.eventType === 'DELETE') {
            setRecipes((prev) => prev.filter((r) => r.id !== payload.old.id));
            setActiveRecipe((prev) => (prev?.id === payload.old.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleFavorite = async (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();

    const targetId = String(id);
    const isCurrentlyFav = favorites.includes(targetId);
    const updatedFavs = isCurrentlyFav
      ? favorites.filter((favId) => favId !== targetId)
      : [...favorites, targetId];

    setFavorites(updatedFavs);
    localStorage.setItem('fav_recipes', JSON.stringify(updatedFavs));

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: id }),
      });

      if (!res.ok) throw new Error('Lỗi cập nhật yêu thích');
    } catch (err) {
      const rolledBack = isCurrentlyFav
        ? [...favorites, targetId]
        : favorites.filter((favId) => favId !== targetId);
      setFavorites(rolledBack);
      localStorage.setItem('fav_recipes', JSON.stringify(rolledBack));
      console.error(err);
    }
  };

  const openDetail = (recipe) => {
    setActiveRecipe(recipe);
    setServings(recipe.baseServings || 2);
  };

  const addToCart = async () => {
    if (!activeRecipe) return;

    const newItems = (activeRecipe.ingredients || []).map((ing) => {
      if (typeof ing === 'string') {
        return {
          dish: activeRecipe.title,
          text: ing,
        };
      }
      return {
        dish: activeRecipe.title,
        text: `${ing.name}: ${(ing.amountPerPerson || 1) * servings} ${ing.unit || ''}`.trim(),
      };
    });

    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItems),
      });

      if (!res.ok) throw new Error('Không thể thêm vào giỏ');

      const addedData = await res.json();
      setShoppingList((prev) => [...prev, ...addedData]);
      alert(`Đã thêm nguyên liệu của món "${activeRecipe.title}" vào giỏ!`);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleRecipeAdded = (newRecipe) => {
    const formattedItem = formatRecipe(newRecipe);
    setRecipes((prev) => {
      if (prev.some((r) => r.id === formattedItem.id)) return prev;
      return [formattedItem, ...prev];
    });
  };

  const handleRecipeUpdated = (updatedRecipe) => {
    const formatted = formatRecipe(updatedRecipe);
    setRecipes((prev) => prev.map((r) => (r.id === formatted.id ? formatted : r)));
    if (activeRecipe?.id === formatted.id) setActiveRecipe(formatted);
  };

  const handleDeleteRecipe = async (id) => {
    try {
      const res = await fetch(`/api/recipes?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Xóa thất bại');
      }

      setRecipes((prev) => prev.filter((r) => r.id !== id));
      alert('Đã xóa món ăn thành công!');
    } catch (err) {
      alert('Lỗi khi xóa: ' + err.message);
    }
  };

  // Reset bộ lọc về mặc định
  const handleResetFilters = () => {
    setSearchTerm('');
    setCurrentTab('all');
    setSelectedTag(null);
    setSelectedDifficulty('all');
    setSelectedTimeRange('all');
  };

  // Lọc đa tiêu chí
  const filteredRecipes = recipes.filter((item) => {
    // 1. Tên hoặc mô tả
    const matchSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Tag tủ lạnh
    const matchTag = selectedTag
      ? (item.ingredients || []).some((ing) => {
          const ingText = typeof ing === 'string' ? ing : ing.name || '';
          return ingText.toLowerCase().includes(selectedTag);
        })
      : true;

    // 3. Tab yêu thích
    const matchTab = currentTab === 'fav' ? favorites.includes(String(item.id)) : true;

    // 4. Độ khó
    const matchDifficulty =
      selectedDifficulty === 'all' ? true : item.difficulty === selectedDifficulty;

    // 5. Thời gian nấu (phút)
    const minutes = parseInt(item.time) || 0;
    let matchTime = true;
    if (selectedTimeRange === 'under15') {
      matchTime = minutes < 15;
    } else if (selectedTimeRange === '15to30') {
      matchTime = minutes >= 15 && minutes <= 30;
    } else if (selectedTimeRange === 'above30') {
      matchTime = minutes > 30;
    }

    return matchSearch && matchTag && matchTab && matchDifficulty && matchTime;
  });

  const hasActiveFilters =
    searchTerm ||
    selectedTag ||
    currentTab !== 'all' ||
    selectedDifficulty !== 'all' ||
    selectedTimeRange !== 'all';

  return (
    <div className="container">
      <header>
        <h1>🍳 Bếp Nhà Món Ngon</h1>
        <p>Kết nối Cơ sở dữ liệu Cloud PostgreSQL (Supabase)</p>
      </header>

      {/* Thanh tìm kiếm và Tabs */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Tìm theo tên món..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => setCurrentTab('all')}
          className={`btn-filter ${currentTab === 'all' ? 'active' : ''}`}
        >
          Tất cả món
        </button>
        <button
          onClick={() => setCurrentTab('fav')}
          className={`btn-filter ${currentTab === 'fav' ? 'active' : ''}`}
        >
          ❤️ Yêu thích ({favorites.length})
        </button>
        <button onClick={() => setIsAddOpen(true)} className="btn-primary">
          + Đăng công thức mới
        </button>
      </div>

      {/* Bộ lọc mở rộng: Tủ lạnh + Độ khó + Thời gian */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '15px 0 25px 0',
          background: 'rgba(255, 255, 255, 0.65)',
          padding: '12px 18px',
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        {/* Lọc tủ lạnh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Tủ lạnh:</span>
          {['trứng', 'bò', 'cà chua', 'cần tây'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
            >
              {tag === 'trứng' && '🥚 Trứng'}
              {tag === 'bò' && '🥩 Thịt bò'}
              {tag === 'cà chua' && '🍅 Cà chua'}
              {tag === 'cần tây' && '🥬 Cần tây'}
            </button>
          ))}
        </div>

        {/* Lọc Độ khó */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Độ khó:</span>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#fff',
            }}
          >
            <option value="all">Tất cả</option>
            <option value="Rất dễ">Rất dễ</option>
            <option value="Dễ">Dễ</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Khó">Khó</option>
          </select>
        </div>

        {/* Lọc Thời gian */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Thời gian:</span>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#fff',
            }}
          >
            <option value="all">Tất cả</option>
            <option value="under15">&lt; 15 phút</option>
            <option value="15to30">15 - 30 phút</option>
            <option value="above30">&gt; 30 phút</option>
          </select>
        </div>

        {/* Nút Đặt lại bộ lọc */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: 'none',
              background: '#e74c3c',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🔄 Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Danh sách món ăn */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px 0' }}>
          Đang kết nối và lấy dữ liệu từ Supabase...
        </p>
      ) : filteredRecipes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          <p style={{ fontSize: '1.2rem', margin: '0 0 10px 0' }}>Không tìm thấy món ăn phù hợp!</p>
          <button
            onClick={handleResetFilters}
            style={{
              padding: '8px 16px',
              background: '#27ae60',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            Xem tất cả món
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFav={favorites.includes(String(recipe.id))}
              onToggleFav={toggleFavorite}
              onOpenDetail={openDetail}
              onDelete={handleDeleteRecipe}
            />
          ))}
        </div>
      )}

      {/* Nút Giỏ đi chợ */}
      <button className="cart-floating-btn" onClick={() => setIsCartOpen(true)}>
        🛒 Giỏ đi chợ <span className="badge">{shoppingList.length}</span>
      </button>

      {/* Các Modals */}
      <RecipeDetailModal
        recipe={activeRecipe}
        servings={servings}
        onClose={() => setActiveRecipe(null)}
        onChangeServings={setServings}
        onAddToCart={addToCart}
        onEdit={(rec) => {
          setEditRecipe(rec);
          setActiveRecipe(null);
        }}
        onStartCook={() => {
          setCookModeRecipe(activeRecipe);
          setCookStep(0);
          setActiveRecipe(null);
        }}
      />

      <CookModeModal
        recipe={cookModeRecipe}
        step={cookStep}
        onClose={() => setCookModeRecipe(null)}
        onPrevStep={() => setCookStep(cookStep - 1)}
        onNextStep={() => {
          if (cookModeRecipe?.steps && cookStep < cookModeRecipe.steps.length - 1) {
            setCookStep(cookStep + 1);
          } else {
            alert('🎉 Chúc mừng bạn đã hoàn thành món ăn!');
            setCookModeRecipe(null);
          }
        }}
      />

      <CartModal
        isOpen={isCartOpen}
        shoppingList={shoppingList}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={async (id) => {
          try {
            await fetch(`/api/shopping-list?id=${id}`, { method: 'DELETE' });
            setShoppingList((prev) => prev.filter((item) => item.id !== id));
          } catch (err) {
            alert('Lỗi khi gỡ món: ' + err.message);
          }
        }}
        onClearCart={async () => {
          try {
            await fetch('/api/shopping-list', { method: 'DELETE' });
            setShoppingList([]);
          } catch (err) {
            alert('Lỗi khi dọn giỏ: ' + err.message);
          }
        }}
      />

      <AddRecipeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onRecipeAdded={handleRecipeAdded}
      />

      <EditRecipeModal
        isOpen={!!editRecipe}
        recipe={editRecipe}
        onClose={() => setEditRecipe(null)}
        onRecipeUpdated={handleRecipeUpdated}
      />
    </div>
  );
}