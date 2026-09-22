// src/lib/cacheManager.js

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 tiếng

export const CacheKeys = {
  RECIPES: 'bepnha_cached_recipes_v2',
  PRICES: 'bepnha_cached_prices_v2',
  FRIDGE: 'bepnha_fridge_items',
};

// Bộ nhớ đệm tạm thời trên RAM để chống gọi request trùng nhau trong 1 phiên làm việc
const memoryCache = new Map();
const inFlightRequests = new Map();

/**
 * Lấy dữ liệu từ cache với cơ chế TTL
 */
export function getCachedData(key) {
  if (typeof window === 'undefined') return null;

  // 1. Kiểm tra RAM Cache
  if (memoryCache.has(key)) {
    const memItem = memoryCache.get(key);
    if (Date.now() < memItem.expireAt) {
      return memItem.data;
    }
    memoryCache.delete(key);
  }

  // 2. Kiểm tra LocalStorage
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;

    // Lưu ngược lại RAM để đọc siêu tốc cho các lần sau
    memoryCache.set(key, { data: parsed.data, expireAt: parsed.expireAt });
    return parsed.data;
  } catch (err) {
    console.warn(`[CacheManager] Lỗi đọc cache (${key}):`, err);
    return null;
  }
}

/**
 * Ghi dữ liệu vào cả LocalStorage và RAM Cache
 */
export function setCachedData(key, data, ttlMs = DEFAULT_TTL_MS) {
  if (typeof window === 'undefined' || !data) return;

  const expireAt = Date.now() + ttlMs;
  const payload = { data, expireAt, savedAt: Date.now() };

  // Ghi RAM
  memoryCache.set(key, { data, expireAt });

  // Ghi LocalStorage
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn(`[CacheManager] Lỗi lưu cache (${key}):`, err);
  }
}

/**
 * Fetch an toàn kèm deduplication: nếu nhiều chỗ cùng gọi 1 URL, chỉ fetch đúng 1 lần
 */
export async function fetchWithDedupe(url, options = {}) {
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const promise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    })
    .finally(() => {
      inFlightRequests.delete(url);
    });

  inFlightRequests.set(url, promise);
  return promise;
}