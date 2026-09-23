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
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import { canManageRecipe, extractUserPhone, isUserAdmin } from '@/lib/permissions';
import { getCachedData, setCachedData, fetchWithDedupe, CacheKeys } from '@/lib/cacheManager';

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Trạng thái mạng ngoại tuyến
  const [isOffline, setIsOffline] = useState(false);

  // Bảng giá nguyên liệu
  const [priceMap, setPriceMap] = useState({});

  // Kho nguyên liệu tồn kho tủ lạnh (State dùng chung toàn trang)
  const [fridgeItems, setFridgeItems] = useState([]);

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

  // Nạp tồn kho tủ lạnh từ LocalStorage & Đăng ký Service Worker + Lưu sự kiện cài PWA
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Đăng ký Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => console.warn('Lỗi đăng ký Service Worker:', err));
      }

      // 2. Bắt và lưu lại prompt cài đặt PWA vào window để nút Header có thể gọi
      const handleBeforeInstall = (e) => {
        e.preventDefault();
        window.deferredPrompt = e;
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // 3. Nạp tồn kho tủ lạnh
      try {
        const savedFridge = localStorage.getItem('bepnha_fridge_items');
        if (savedFridge) {
          setFridgeItems(JSON.parse(savedFridge));
        }
      } catch (e) {
        console.error('Lỗi nạp tồn kho tủ lạnh:', e);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  // Hàm xử lý khi người dùng bấm nút Cài App trên Header
  const handleInstallApp = () => {
    if (typeof window === 'undefined') return;

    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
          window.deferredPrompt = null;
        }
      });
    } else {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

      if (isIosDevice) {
        alert('📲 Để cài trên iPhone/iPad:\n1. Bấm nút "Chia sẻ" (Share/biểu tượng ô vuông mũi tên lên) ở thanh dưới Safari.\n2. Chọn "Thêm vào MH chính" (Add to Home Screen).');
      } else {
        alert('💻 Để cài trên Máy tính / Android:\n- Chrome Desktop: Bấm vào biểu tượng Cài đặt ở góc phải thanh địa chỉ web 💻\n- Android: Chọn menu 3 chấm ở góc phải trình duyệt -> "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính" 📲');
      }
    }
  };

  // Hàm cập nhật kho tủ lạnh và lưu localStorage
  const handleUpdateFridge = (newItems) => {
    setFridgeItems(newItems);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bepnha_fridge_items', JSON.stringify(newItems));
      } catch (e) {
        console.error('Lỗi lưu tồn kho tủ lạnh:', e);
      }
    }
  };

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

  // 1. Tải công thức với cơ chế SWR (Ưu tiên nạp cache 0ms, cập nhật ngầm)
  const fetchRecipes = async () => {
    const cached = getCachedData(CacheKeys.RECIPES);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setRecipes(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchWithDedupe(`/api/recipes?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (Array.isArray(data)) {
        const formatted = data.map(formatRecipe);
        setRecipes(formatted);
        setCachedData(CacheKeys.RECIPES, formatted);
      }
    } catch (err) {
      console.warn('Lỗi tải recipes ngầm, giữ cache offline:', err);
    } finally {
      setLoading(false);
    }
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

  // 4. Tải từ điển giá với cơ chế Cache-First
  const fetchPrices = async () => {
    const cachedPrices = getCachedData(CacheKeys.PRICES);
    if (cachedPrices && Object.keys(cachedPrices).length > 0) {
      setPriceMap(cachedPrices);
    }

    try {
      const data = await fetchWithDedupe('/api/prices');
      if (data && !data.error) {
        setPriceMap(data);
        setCachedData(CacheKeys.PRICES, data);
      }
    } catch (err) {
      console.warn('Lỗi fetch prices, giữ cache hiện tại:', err);
    }
  };

  // Lắng nghe mạng Online/Offline
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => {
        setIsOffline(false);
        fetchRecipes();
        fetchPrices();
      };
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Supabase Auth & Realtime
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
              if (prev.some((r) => String(r.id) === String(newFormatted.id))) return prev;
              const next = [newFormatted, ...prev];
              setCachedData(CacheKeys.RECIPES, next);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedFormatted = formatRecipe(payload.new);
            setRecipes((prev) => {
              const next = prev.map((r) => (String(r.id) === String(updatedFormatted.id) ? updatedFormatted : r));
              setCachedData(CacheKeys.RECIPES, next);
              return next;
            });
            setActiveRecipe((prev) => (String(prev?.id) === String(updatedFormatted.id) ? updatedFormatted : prev));
          } else if (payload.eventType === 'DELETE') {
            setRecipes((prev) => {
              const next = prev.filter((r) => String(r.id) !== String(payload.old.id));
              setCachedData(CacheKeys.RECIPES, next);
              return next;
            });
            setActiveRecipe((prev) => (String(prev?.id) === String(payload.old.id) ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Kiểm tra vai trò
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

  useEffect(() => {
    if (user) {
      loadUserData(user.id, kitchenData?.kitchen?.id || null);
    }
  }, [kitchenData, user]);

  const hasPermission = canManageRecipe(user, { role: userRole });

  // Xóa công thức
  const handleDeleteRecipe = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa món ăn này không?')) {
      return;
    }

    const phone = extractUserPhone(user);
    try {
      const res = await fetch(`/api/recipes?id=${id}&phone=${phone || ''}`, {
        method: 'DELETE',
        headers: {
          'x-user-phone': phone || '',
        },
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData.error || 'Xóa thất bại');
      }

      setRecipes((prev) => {
        const next = prev.filter((r) => String(r.id) !== String(id));
        setCachedData(CacheKeys.RECIPES, next);
        return next;
      });

      alert('Đã xóa món ăn thành công!');
    } catch (err) {
      alert('Lỗi khi xóa: ' + err.message);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      alert('Trình duyệt chưa hỗ trợ nhận diện giọng nói!');
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

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setSearchTerm(transcript.replace(/[.,?!]$/, '').trim());
      }
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const toggleFavorite = async (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();

    const targetId = String(id);
    const isCurrentlyFav = favorites.includes(targetId);
    const updatedFavs = isCurrentlyFav
      ? favorites.filter((favId) => favId !== targetId)
      : [...favorites, targetId];

    setFavorites(updatedFavs);

    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: id, userId: user?.id || null }),
      });
    } catch (err) {
      setFavorites(favorites);
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
      alert(`Đã thêm nguyên liệu món "${activeRecipe.title}" vào giỏ!`);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleAddMissingToCart = async (dishTitle, missingItems) => {
    const newItems = missingItems.map((text) => ({ dish: dishTitle, text }));
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
      if (!res.ok) throw new Error('Lỗi giỏ hàng');
      const addedData = await res.json();
      setShoppingList((prev) => [...prev, ...addedData]);
      alert(`Đã thêm ${missingItems.length} nguyên liệu còn thiếu vào giỏ!`);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

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
      if (!res.ok) throw new Error('Lỗi nạp giỏ');
      const addedData = await res.json();
      setShoppingList((prev) => [...prev, ...addedData]);
      alert(`🎉 Đã nạp thành công toàn bộ thực đơn vào giỏ đi chợ!`);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleRecipeAdded = (newRecipe) => {
    const formattedItem = formatRecipe(newRecipe);
    setRecipes((prev) => {
      if (prev.some((r) => String(r.id) === String(formattedItem.id))) return prev;
      const next = [formattedItem, ...prev];
      setCachedData(CacheKeys.RECIPES, next);
      return next;
    });
  };

  const handleRecipeUpdated = (updatedRecipe) => {
    const formatted = formatRecipe(updatedRecipe);
    setRecipes((prev) => {
      const next = prev.map((r) => (String(r.id) === String(formatted.id) ? formatted : r));
      setCachedData(CacheKeys.RECIPES, next);
      return next;
    });
    if (String(activeRecipe?.id) === String(formatted.id)) setActiveRecipe(formatted);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCurrentTab('all');
    setSelectedTag(null);
    setSelectedDifficulty('all');
    setSelectedTimeRange('all');
  };

  const filteredRecipes = recipes.filter((item) => {
    const matchSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTag = selectedTag
      ? (item.ingredients || []).some((ing) => {
          const ingText = typeof ing === 'string' ? ing : ing.name || '';
          return ingText.toLowerCase().includes(selectedTag.toLowerCase());
        })
      : true;

    const matchTab = currentTab === 'fav' ? favorites.includes(String(item.id)) : true;
    const matchDifficulty = selectedDifficulty === 'all' ? true : item.difficulty === selectedDifficulty;

    const minutes = parseInt(item.time) || 0;
    let matchTime = true;
    if (selectedTimeRange === 'under15') matchTime = minutes < 15;
    else if (selectedTimeRange === '15to30') matchTime = minutes >= 15 && minutes <= 30;
    else if (selectedTimeRange === 'above30') matchTime = minutes > 30;

    return matchSearch && matchTag && matchTab && matchDifficulty && matchTime;
  });

  const hasActiveFilters =
    searchTerm || selectedTag || currentTab !== 'all' || selectedDifficulty !== 'all' || selectedTimeRange !== 'all';

  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.user_metadata?.raw_phone) return user.user_metadata.raw_phone;
    const email = user.email || '';
    if (email.endsWith('@bep-nha-nextjs.vercel.app')) return email.replace('@bep-nha-nextjs.vercel.app', '');
    if (email.endsWith('@phone.bepnha.com')) return email.replace('@phone.bepnha.com', '');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Nút Cài đặt App hiển thị trực tiếp trên Header */}
          <button
            onClick={handleInstallApp}
            style={{
              padding: '7px 12px',
              borderRadius: '10px',
              border: '1px solid #27ae60',
              background: '#f0fff4',
              color: '#27ae60',
              fontSize: '0.82rem',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 4px rgba(39, 174, 96, 0.15)',
            }}
            title="Cài đặt ứng dụng về điện thoại hoặc máy tính"
          >
            📲 Cài App
          </button>

          {user ? (
            <>
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
                  <span style={{ fontSize: '0.7rem', background: '#e74c3c', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                    ADMIN
                  </span>
                )}
                {userRole === 'editor' && (
                  <span style={{ fontSize: '0.7rem', background: '#27ae60', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
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

      {/* Thông báo Offline */}
      {isOffline && (
        <div
          style={{
            backgroundColor: '#2d3436',
            color: '#ffeaa7',
            padding: '10px 16px',
            borderRadius: '14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span>⚡</span>
          <span>Bạn đang ở chế độ Ngoại tuyến (Offline). Các công thức đã lưu vẫn xem và nấu bình thường!</span>
        </div>
      )}

      {/* Thanh tìm kiếm */}
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

        <button onClick={() => setCurrentTab('all')} className={`btn-filter ${currentTab === 'all' ? 'active' : ''}`}>
          Tất cả món
        </button>
        <button onClick={() => setCurrentTab('fav')} className={`btn-filter ${currentTab === 'fav' ? 'active' : ''}`}>
          ❤️ Yêu thích ({favorites.length})
        </button>
        <button onClick={() => setIsRandomOpen(true)} className="btn-filter" style={{ background: '#f39c12', color: '#fff', border: 'none', fontWeight: 'bold' }}>
          🎲 Hôm nay ăn gì?
        </button>
        <button onClick={() => setIsFridgeOpen(true)} className="btn-filter" style={{ background: '#27ae60', color: '#fff', border: 'none', fontWeight: 'bold' }}>
          🧊 Dọn tủ lạnh
        </button>
        <button onClick={() => setIsPlannerOpen(true)} className="btn-filter" style={{ background: '#8e44ad', color: '#fff', border: 'none', fontWeight: 'bold' }}>
          📅 Lịch tuần
        </button>

        {hasPermission && (
          <button onClick={() => setIsAddOpen(true)} className="btn-primary">
            + Đăng công thức mới
          </button>
        )}
      </div>

      {/* Bộ lọc mở rộng & Tồn kho tủ lạnh hiển thị động */}
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
        {/* Thanh hiển thị Tồn kho tủ lạnh động */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>🧊 Tủ lạnh:</span>
          {(!fridgeItems || fridgeItems.length === 0) ? (
            <button
              onClick={() => setIsFridgeOpen(true)}
              style={{
                fontSize: '0.78rem',
                color: '#319795',
                background: '#e6fffa',
                border: '1px dashed #319795',
                padding: '4px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Thêm đồ vào tủ
            </button>
          ) : (
            fridgeItems.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'capitalize'
                }}
              >
                <span>
                  {tag.includes('trứng') ? '🥚 ' :
                   tag.includes('bò') ? '🥩 ' :
                   tag.includes('thịt') || tag.includes('heo') || tag.includes('lợn') ? '🥓 ' :
                   tag.includes('gà') ? '🍗 ' :
                   tag.includes('cá') || tag.includes('cua') || tag.includes('tôm') ? '🦐 ' :
                   tag.includes('cà chua') ? '🍅 ' :
                   tag.includes('cà rốt') || tag.includes('khoai') ? '🥕 ' :
                   tag.includes('cải') || tag.includes('rau') || tag.includes('cần tây') ? '🥬 ' :
                   tag.includes('nấm') ? '🍄 ' : '🌱 '}
                  {tag}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = fridgeItems.filter((i) => i !== tag);
                    handleUpdateFridge(updated);
                    if (selectedTag === tag) setSelectedTag(null);
                  }}
                  style={{
                    marginLeft: '4px',
                    color: '#999',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    padding: '0 2px'
                  }}
                  title="Xóa khỏi tủ lạnh"
                >
                  ✕
                </span>
              </button>
            ))
          )}
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
          Đang kết nối và lấy dữ liệu...
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

      {/* Modal Dọn tủ lạnh (Đồng bộ tuyệt đối hai chiều) */}
      <FridgeCleanerModal
        isOpen={isFridgeOpen}
        onClose={() => setIsFridgeOpen(false)}
        recipes={recipes}
        fridgeItems={fridgeItems}
        onUpdateFridge={handleUpdateFridge}
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

      {/* Banner Cài đặt Ứng dụng PWA Native */}
      <PwaInstallPrompt />
    </div>
  );
}