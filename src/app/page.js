'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import RecipeCard from '../components/RecipeCard';
import RecipeDetailModal from '../components/RecipeDetailModal';
import CookModeModal from '../components/CookModeModal';
import CartModal from '../components/CartModal';
import AddRecipeModal from '../components/AddRecipeModal';
import EditRecipeModal from '../components/EditRecipeModal';
import RandomMealModal from '../components/RandomMealModal';
import FridgeCleanerModal from '../components/FridgeCleanerModal';
import MealPlannerModal from '../components/MealPlannerModal';
import AuthModal from '../components/AuthModal';
import FamilyKitchenModal from '../components/FamilyKitchenModal';
import AdminRolesModal from '../components/AdminRolesModal';
import { canManageRecipe, extractUserPhone, isUserAdmin } from '@/lib/permissions';

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Bảng giá nguyên liệu
  const [priceMap, setPriceMap] = useState({});

  // Auth, Roles & Family Kitchen state
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('viewer');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [kitchenData, setKitchenData] = useState(null);
  const [isKitchenOpen, setIsKitchenOpen] = useState(false);

  // Search, Voice Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
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
  const [isRandomOpen, setIsRandomOpen] = useState(false);
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  // Cook mode state
  const [cookModeRecipe, setCookModeRecipe] = useState(null);
  const [cookStep, setCookStep] = useState(0);

  // Chuẩn hóa dữ liệu món ăn
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

  // 2. Tải thông tin Bếp gia đình
  const fetchKitchen = async (currentUserId) => {
    if (!currentUserId) {
      setKitchenData(null);
      return;
    }
    try {
      const res = await fetch(`/api/kitchen?userId=${currentUserId}`);
      const data = await res.json();
      setKitchenData(data);
    } catch (err) {
      console.error('Lỗi tải thông tin bếp:', err);
    }
  };

  // 3. Tải favorites và shopping-list
  const loadUserData = (currentUserId, currentKitchenId) => {
    const params = new URLSearchParams();
    if (currentUserId) params.set('userId', currentUserId);
    if (currentKitchenId) params.set('kitchenId', currentKitchenId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    fetch(`/api/favorites${queryString}`)
      .then((res) => res.json())
      .then((ids) => {
        if (Array.isArray(ids)) setFavorites(ids.map(String));
      })
      .catch((err) => console.error('Lỗi tải favorites:', err));

    fetch(`/api/shopping-list${queryString}`)
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items)) setShoppingList(items);
      })
      .catch((err) => console.error('Lỗi tải giỏ hàng:', err));
  };

  // 4. Tải từ điển giá
  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      if (data && !data.error) {
        setPriceMap(data);
      }
    } catch (err) {
      console.error('Lỗi tải bảng giá:', err);
    }
  };

  // Khởi tạo và lắng nghe phiên đăng nhập & Realtime Supabase
  useEffect(() => {
    fetchRecipes();
    fetchPrices();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

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
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Kiểm tra vai trò / quyền của người dùng khi user thay đổi
  useEffect(() => {
    if (user) {
      fetchKitchen(user.id);
      const phone = extractUserPhone(user);
      if (phone) {
        fetch(`/api/roles?phone=${phone}`)
          .then((res) => res.json())
          .then((data) => setUserRole(data.role || 'viewer'))
          .catch(() => setUserRole('viewer'));
      } else {
        setUserRole('viewer');
      }
    } else {
      setKitchenData(null);
      setUserRole('viewer');
      loadUserData(null, null);
    }
  }, [user]);

  // Cập nhật giỏ hàng & yêu thích khi bếp hoặc user thay đổi
  useEffect(() => {
    if (user) {
      loadUserData(user.id, kitchenData?.kitchen?.id || null);
    }
  }, [kitchenData, user]);

  // Mở chi tiết món ăn từ link chia sẻ / QR
  useEffect(() => {
    if (recipes.length > 0 && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedRecipeId = urlParams.get('recipe');
      if (sharedRecipeId) {
        const found = recipes.find((r) => String(r.id) === String(sharedRecipeId));
        if (found) {
          setActiveRecipe(found);
          setServings(found.baseServings || 2);
        }
      }
    }
  }, [recipes]);

  // Biến cờ kiểm tra quyền Quản lý công thức (Sửa/Xóa)
  const hasPermission = canManageRecipe(user, { role: userRole });

  // Xử lý Tìm kiếm giọng nói tiếng Việt
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói. Hãy dùng Google Chrome hoặc Safari nhé!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        const cleanedText = transcript.replace(/[.,?!]$/, '').trim();
        setSearchTerm(cleanedText);
      }
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Lỗi nhận diện giọng nói:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Vui lòng cho phép quyền truy cập Micro trên trình duyệt để sử dụng tính năng này!');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Toggle Yêu thích
  const toggleFavorite = async (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();

    const targetId = String(id);
    const isCurrentlyFav = favorites.includes(targetId);
    const updatedFavs = isCurrentlyFav
      ? favorites.filter((favId) => favId !== targetId)
      : [...favorites, targetId];

    setFavorites(updatedFavs);

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: id, userId: user?.id || null }),
      });

      if (!res.ok) throw new Error('Lỗi cập nhật yêu thích');
    } catch (err) {
      setFavorites(favorites);
      console.error(err);
    }
  };

  const openDetail = (recipe) => {
    setActiveRecipe(recipe);
    setServings(recipe.baseServings || 2);
  };

  // Thêm nguyên liệu vào giỏ
  const addToCart = async () => {
    if (!activeRecipe) return;

    const newItems = (activeRecipe.ingredients || []).map((ing) => {
      if (typeof ing === 'string') {
        return { dish: activeRecipe.title, text: ing };
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
        body: JSON.stringify({
          items: newItems,
          userId: user?.id || null,
          kitchenId: kitchenData?.kitchen?.id || null,
        }),
      });

      if (!res.ok) throw new Error('Không thể thêm vào giỏ');
      const addedData = await res.json();
      setShoppingList((prev) => [...prev, ...addedData]);
      alert(`Đã thêm nguyên liệu của món "${activeRecipe.title}" vào giỏ!`);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Thêm nguyên liệu thiếu vào giỏ
  const handleAddMissingToCart = async (dishTitle, missingItems) => {
    const newItems = missingItems.map((text) => ({
      dish: dishTitle,
      text: text,
    }));

    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newItems,
          userId: user?.id || null,
          kitchenId: kitchenData?.kitchen?.id || null,
        }),
      });

      if (!res.ok) throw new Error('Không thể thêm vào giỏ');
      const addedData = await res.json();
      setShoppingList((prev) => [...prev, ...addedData]);
      alert(`Đã thêm ${missingItems.length} nguyên liệu còn thiếu vào giỏ đi chợ!`);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Nạp toàn bộ thực đơn tuần vào giỏ
  const handleAddPlanToCart = async (plannedRecipes) => {
    const newItems = [];
    plannedRecipes.forEach((recipe) => {
      (recipe.ingredients || []).forEach((ing) => {
        if (typeof ing === 'string') {
          newItems.push({ dish: recipe.title, text: ing });
        } else {
          newItems.push({
            dish: recipe.title,
            text: `${ing.name}: ${(ing.amountPerPerson || 1) * 2} ${ing.unit || ''}`.trim(),
          });
        }
      });
    });

    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newItems,
          userId: user?.id || null,
          kitchenId: kitchenData?.kitchen?.id || null,
        }),
      });

      if (!res.ok) throw new Error('Không thể nạp vào giỏ');
      const addedData = await res.json();
      setShoppingList((prev) => [...prev, ...addedData]);
      alert(`🎉 Đã nạp thành công toàn bộ nguyên liệu cả tuần vào giỏ đi chợ!`);
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

  // Xóa công thức có kèm kiểm tra quyền
  const handleDeleteRecipe = async (id) => {
    const phone = extractUserPhone(user);
    try {
      const res = await fetch(`/api/recipes?id=${id}&phone=${phone || ''}`, {
        method: 'DELETE',
        headers: {
          'x-user-phone': phone || '',
        },
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

  const handleResetFilters = () => {
    setSearchTerm('');
    setCurrentTab('all');
    setSelectedTag(null);
    setSelectedDifficulty('all');
    setSelectedTimeRange('all');
  };

  // Bộ lọc danh sách món ăn
  const filteredRecipes = recipes.filter((item) => {
    const matchSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTag = selectedTag
      ? (item.ingredients || []).some((ing) => {
          const ingText = typeof ing === 'string' ? ing : ing.name || '';
          return ingText.toLowerCase().includes(selectedTag);
        })
      : true;

    const matchTab = currentTab === 'fav' ? favorites.includes(String(item.id)) : true;

    const matchDifficulty =
      selectedDifficulty === 'all' ? true : item.difficulty === selectedDifficulty;

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

  // Lấy tên hiển thị chuẩn hóa
  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.user_metadata?.raw_phone) {
      return user.user_metadata.raw_phone;
    }
    const email = user.email || '';
    if (email.endsWith('@bep-nha-nextjs.vercel.app')) {
      return email.replace('@bep-nha-nextjs.vercel.app', '');
    }
    if (email.endsWith('@phone.bepnha.com')) {
      return email.replace('@phone.bepnha.com', '');
    }
    return email.split('@')[0];
  };

  return (
    <div className="container">
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '15px',
        }}
      >
        <h1 style={{ margin: 0 }}>🍳 Bếp Nhà Món Ngon</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user ? (
            <>
              {/* Nút vào Bếp gia đình */}
              <button
                onClick={() => setIsKitchenOpen(true)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e67e22',
                  background: kitchenData?.kitchen ? '#fffaf0' : '#fff',
                  color: '#e67e22',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🏡 {kitchenData?.kitchen ? kitchenData.kitchen.name : 'Vào Bếp gia đình'}
              </button>

              {/* Nút Phân quyền: Đặt độc lập bên ngoài, chỉ hiện cho Admin */}
              {isUserAdmin(user, { role: userRole }) && (
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e74c3c',
                    background: '#fff5f5',
                    color: '#e74c3c',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  🛡️ Phân quyền
                </button>
              )}

              <span
                style={{
                  fontSize: '0.85rem',
                  color: '#2d3436',
                  fontWeight: '600',
                  background: '#f1f2f6',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>👤 {getUserDisplayName()}</span>
                {userRole === 'admin' && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: '#e74c3c',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontWeight: '800',
                    }}
                  >
                    ADMIN
                  </span>
                )}
                {userRole === 'editor' && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: '#27ae60',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontWeight: '800',
                    }}
                  >
                    ĐẦU BẾP
                  </span>
                )}
              </span>

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                  setKitchenData(null);
                  setUserRole('viewer');
                  alert('Đã đăng xuất!');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: '#2d3436',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              🔑 Đăng nhập
            </button>
          )}
        </div>
      </header>

      {/* Thanh tìm kiếm có Micro, Random, Dọn tủ lạnh, Lịch tuần và Tabs */}
      <div className="search-bar">
        <div style={{ position: 'relative', flex: '1 1 240px', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder={isListening ? '🎙️ Đang lắng nghe bạn nói...' : '🔍 Tìm theo tên món hoặc nguyên liệu...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingRight: '45px',
              border: isListening ? '2px solid #e74c3c' : undefined,
              backgroundColor: isListening ? '#fff5f5' : undefined,
              transition: 'all 0.2s ease',
            }}
          />
          <button
            type="button"
            onClick={handleVoiceSearch}
            title={isListening ? 'Bấm để dừng nghe' : 'Tìm kiếm bằng giọng nói'}
            style={{
              position: 'absolute',
              right: '8px',
              background: isListening ? '#e74c3c' : 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              color: isListening ? '#fff' : '#636e72',
              animation: isListening ? 'pulseMic 1s infinite' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isListening ? '🔴' : '🎙️'}
          </button>
        </div>

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
        <button
          onClick={() => setIsRandomOpen(true)}
          className="btn-filter"
          style={{ background: '#f39c12', color: '#fff', border: 'none', fontWeight: 'bold' }}
        >
          🎲 Hôm nay ăn gì?
        </button>
        <button
          onClick={() => setIsFridgeOpen(true)}
          className="btn-filter"
          style={{ background: '#27ae60', color: '#fff', border: 'none', fontWeight: 'bold' }}
        >
          🧊 Dọn tủ lạnh
        </button>
        <button
          onClick={() => setIsPlannerOpen(true)}
          className="btn-filter"
          style={{ background: '#8e44ad', color: '#fff', border: 'none', fontWeight: 'bold' }}
        >
          📅 Lịch tuần
        </button>
        
        {/* Nút thêm công thức: Chỉ hiển thị cho Admin và Editor */}
        {hasPermission && (
          <button onClick={() => setIsAddOpen(true)} className="btn-primary">
            + Đăng công thức mới
          </button>
        )}
      </div>

      {/* Bộ lọc mở rộng */}
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
              onDelete={hasPermission ? handleDeleteRecipe : null}
              priceMap={priceMap}
            />
          ))}
        </div>
      )}

      {/* Nút Giỏ đi chợ nổi */}
      <button className="cart-floating-btn" onClick={() => setIsCartOpen(true)}>
        🛒 Giỏ đi chợ <span className="badge">{shoppingList.length}</span>
      </button>

      {/* Modal Chi tiết món ăn */}
      <RecipeDetailModal
        recipe={activeRecipe}
        servings={servings}
        onClose={() => setActiveRecipe(null)}
        onChangeServings={setServings}
        onAddToCart={addToCart}
        onEdit={hasPermission ? (rec) => {
          setEditRecipe(rec);
          setActiveRecipe(null);
        } : null}
        onStartCook={() => {
          setCookModeRecipe(activeRecipe);
          setCookStep(0);
          setActiveRecipe(null);
        }}
        currentUser={user}
        currentKitchen={kitchenData?.kitchen}
        priceMap={priceMap}
      />

      {/* Modal Chế độ nấu ăn */}
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

      {/* Modal Giỏ đi chợ */}
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
            const params = new URLSearchParams();
            if (kitchenData?.kitchen?.id) {
              params.set('kitchenId', kitchenData.kitchen.id);
            } else if (user?.id) {
              params.set('userId', user.id);
            }
            const qStr = params.toString() ? `?${params.toString()}` : '';

            await fetch(`/api/shopping-list${qStr}`, { method: 'DELETE' });
            setShoppingList([]);
          } catch (err) {
            alert('Lỗi khi dọn giỏ: ' + err.message);
          }
        }}
      />

      {/* Modal Thêm công thức */}
      <AddRecipeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onRecipeAdded={handleRecipeAdded}
      />

      {/* Modal Sửa công thức */}
      <EditRecipeModal
        isOpen={!!editRecipe}
        recipe={editRecipe}
        onClose={() => setEditRecipe(null)}
        onRecipeUpdated={handleRecipeUpdated}
        currentUser={user}
      />

      {/* Modal Hôm nay ăn gì */}
      <RandomMealModal
        isOpen={isRandomOpen}
        recipes={recipes}
        onClose={() => setIsRandomOpen(false)}
        onOpenDetail={openDetail}
      />

      {/* Modal Dọn tủ lạnh */}
      <FridgeCleanerModal
        isOpen={isFridgeOpen}
        recipes={recipes}
        onClose={() => setIsFridgeOpen(false)}
        onOpenDetail={openDetail}
        onAddMissingToCart={handleAddMissingToCart}
      />

      {/* Modal Lên lịch thực đơn tuần */}
      <MealPlannerModal
        isOpen={isPlannerOpen}
        recipes={recipes}
        onClose={() => setIsPlannerOpen(false)}
        onOpenDetail={openDetail}
        onAddPlanToCart={handleAddPlanToCart}
        currentUserId={user?.id}
        currentKitchenId={kitchenData?.kitchen?.id}
      />

      {/* Modal Đăng nhập / Đăng ký */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(loggedUser) => setUser(loggedUser)}
      />

      {/* Modal Bếp Gia Đình */}
      <FamilyKitchenModal
        isOpen={isKitchenOpen}
        onClose={() => setIsKitchenOpen(false)}
        kitchenData={kitchenData}
        currentUserId={user?.id}
        onRefreshKitchen={() => fetchKitchen(user?.id)}
      />

      {/* Modal Quản lý Phân Quyền */}
      <AdminRolesModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={user}
      />
    </div>
  );
}