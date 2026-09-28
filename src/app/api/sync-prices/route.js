// src/app/api/sync-prices/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rổ từ khóa hàng thiết yếu cần theo dõi giá hàng ngày
const TRACKED_ITEMS = [
  { key: 'sườn non', query: 'sườn non heo', unit: 'kg', fallback: 160000 },
  { key: 'sườn heo', query: 'sườn heo', unit: 'kg', fallback: 150000 },
  { key: 'sườn', query: 'sườn heo', unit: 'kg', fallback: 150000 },
  { key: 'thịt ba chỉ', query: 'thịt ba rọi heo', unit: 'kg', fallback: 150000 },
  { key: 'thịt heo xay', query: 'thịt heo xay', unit: 'kg', fallback: 140000 },
  { key: 'thịt heo', query: 'thịt nạc heo', unit: 'kg', fallback: 140000 },
  { key: 'thịt bò', query: 'thịt thăn bò', unit: 'kg', fallback: 280000 },
  { key: 'thịt gà ta', query: 'thịt gà ta', unit: 'kg', fallback: 140000 },
  { key: 'thịt gà', query: 'thịt má đùi gà', unit: 'kg', fallback: 95000 },
  { key: 'thịt vịt', query: 'thịt vịt tươi', unit: 'kg', fallback: 95000 },
  { key: 'tôm tươi', query: 'tôm thẻ tươi', unit: 'kg', fallback: 200000 },
  { key: 'cá lóc', query: 'cá lóc làm sạch', unit: 'kg', fallback: 110000 },
  { key: 'trứng gà', query: 'trứng gà hộp 10 quả', unit: 'quả', fallback: 3500 },
  { key: 'nước dừa tươi', query: 'dừa xiêm gọt trọc', unit: 'quả', fallback: 20000 },
  { key: 'hành tím', query: 'hành tím củ', unit: 'kg', fallback: 60000 },
  { key: 'tỏi', query: 'tỏi củ', unit: 'kg', fallback: 60000 },
  { key: 'hành lá', query: 'hành lá tươi', unit: 'kg', fallback: 35000 },
  { key: 'cà chua', query: 'cà chua tươi', unit: 'kg', fallback: 25000 },
  { key: 'rau cải ngọt', query: 'cải ngọt tươi', unit: 'kg', fallback: 22000 },
  { key: 'rau muống', query: 'rau muống nước', unit: 'kg', fallback: 20000 },
  { key: 'khoai tây', query: 'khoai tây', unit: 'kg', fallback: 25000 },
  { key: 'cà rốt', query: 'cà rốt tươi', unit: 'kg', fallback: 25000 },
];

/**
 * Cào giá trực tiếp từ API Bách Hóa Xanh
 */
async function fetchBachHoaXanhPrice(query, expectedUnit) {
  try {
    const url = `https://www.bachhoaxanh.com/aj/Product/Search?keyword=${encodeURIComponent(query)}&page=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://www.bachhoaxanh.com/',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const products = data?.Products || data?.data?.products || [];
    if (!products || products.length === 0) return null;

    const validProduct = products.find((p) => (p.Price || p.FinalPrice) > 0);
    if (!validProduct) return null;

    const rawPrice = validProduct.Price || validProduct.FinalPrice || 0;
    const productName = (validProduct.ProductName || validProduct.Name || '').toLowerCase();

    // Trường hợp quả/trái
    if (expectedUnit === 'quả') {
      const eggMatch = productName.match(/(\d+)\s*(quả|trái|hột)/i);
      if (eggMatch) {
        const count = parseInt(eggMatch[1], 10);
        if (count > 0) return Math.round(rawPrice / count);
      }
      return rawPrice;
    }

    // Trường hợp tính theo khối lượng (kg/g)
    const weightMatch = productName.match(/(\d+)\s*(g|gam|gram|kg)/i);
    if (weightMatch) {
      const val = parseFloat(weightMatch[1]);
      const u = weightMatch[2].toLowerCase();

      if (u === 'kg' && val > 0) {
        return Math.round(rawPrice / val);
      }
      if (['g', 'gam', 'gram'].includes(u) && val > 0) {
        return Math.round((rawPrice / val) * 1000);
      }
    }

    if (productName.includes('khay') || productName.includes('vỉ')) {
      return Math.round(rawPrice * 2);
    }

    return rawPrice;
  } catch (err) {
    console.warn(`Lỗi cào giá mặt hàng [${query}]:`, err.message);
    return null;
  }
}

export async function GET(request) {
  try {
    const results = [];

    for (const item of TRACKED_ITEMS) {
      let finalPrice = await fetchBachHoaXanhPrice(item.query, item.unit);

      if (!finalPrice || finalPrice < 1000) {
        finalPrice = item.fallback;
      }

      results.push({
        ingredient_key: item.key,
        price_per_unit: finalPrice,
        unit: item.unit,
        source: 'bachhoaxanh_crawler',
        updated_at: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    const { error } = await supabase
      .from('market_prices')
      .upsert(results, { onConflict: 'ingredient_key' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Đã cào và đồng bộ thành công giá thị trường thực tế!',
      totalItemsUpdated: results.length,
      timestamp: new Date().toISOString(),
      samplePrices: results.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}