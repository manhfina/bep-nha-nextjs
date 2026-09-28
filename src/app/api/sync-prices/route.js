// src/app/api/sync-prices/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request) {
  try {
    // Rổ hàng hóa thiết yếu tự động chuẩn hóa
    const marketBasket = [
      { ingredient_key: 'sườn non', price_per_unit: 160000, unit: 'kg' },
      { ingredient_key: 'sườn heo', price_per_unit: 150000, unit: 'kg' },
      { ingredient_key: 'thịt ba chỉ', price_per_unit: 150000, unit: 'kg' },
      { ingredient_key: 'thịt heo xay', price_per_unit: 140000, unit: 'kg' },
      { ingredient_key: 'thịt bò', price_per_unit: 280000, unit: 'kg' },
      { ingredient_key: 'thịt vịt', price_per_unit: 95000, unit: 'kg' },
      { ingredient_key: 'thịt gà ta', price_per_unit: 140000, unit: 'kg' },
      { ingredient_key: 'thịt gà', price_per_unit: 95000, unit: 'kg' },
      { ingredient_key: 'cá lóc', price_per_unit: 110000, unit: 'kg' },
      { ingredient_key: 'tôm tươi', price_per_unit: 200000, unit: 'kg' },
      { ingredient_key: 'trứng gà', price_per_unit: 3500, unit: 'quả' },
      { ingredient_key: 'nước dừa tươi', price_per_unit: 20000, unit: 'quả' },
      { ingredient_key: 'hành tím', price_per_unit: 60000, unit: 'kg' },
      { ingredient_key: 'tỏi', price_per_unit: 60000, unit: 'kg' },
      { ingredient_key: 'hành lá', price_per_unit: 35000, unit: 'kg' },
      { ingredient_key: 'cà chua', price_per_unit: 25000, unit: 'kg' },
      { ingredient_key: 'rau cải ngọt', price_per_unit: 22000, unit: 'kg' },
    ];

    const records = marketBasket.map((item) => ({
      ...item,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('market_prices')
      .upsert(records, { onConflict: 'ingredient_key' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Cập nhật bảng giá thị trường thành công',
      totalItems: records.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}