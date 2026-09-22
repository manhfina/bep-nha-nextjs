import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// GET: Lấy toàn bộ từ điển giá hiện có
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ingredient_prices')
      .select('*');

    if (error) throw error;

    // Chuyển array thành map key-value theo tên để tra cứu O(1)
    const priceMap = {};
    (data || []).forEach((item) => {
      priceMap[item.name.toLowerCase()] = item;
    });

    return NextResponse.json(priceMap);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Tự động dùng Gemini AI tra giá cho danh sách nguyên liệu chưa biết
export async function POST(req) {
  try {
    const { ingredients } = await req.json();
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ message: 'Không có nguyên liệu cần tra cứu' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
Bạn là chuyên gia phân tích giá thực phẩm bán lẻ tại chợ và siêu thị Việt Nam.
Hãy ước tính đơn giá trung bình cho danh sách các nguyên liệu sau:
${ingredients.join(', ')}

Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm backticks markdown hay giải thích gì thêm), có cấu trúc như sau:
[
  {
    "name": "tên nguyên liệu viết thường không dấu phẩy",
    "price_per_unit": 35000,
    "unit": "kg" hoặc "quả" hoặc "bó" hoặc "miếng",
    "category": "Thịt" hoặc "Rau củ" hoặc "Hải sản" hoặc "Gia vị"
  }
]
`;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    const parsedPrices = JSON.parse(rawText);

    // Lưu vào Supabase để lần sau không phải gọi AI nữa (tiết kiệm chi phí)
    if (Array.isArray(parsedPrices) && parsedPrices.length > 0) {
      await supabase.from('ingredient_prices').upsert(parsedPrices, { onConflict: 'name' });
    }

    return NextResponse.json({ success: true, updated: parsedPrices });
  } catch (err) {
    console.error('Lỗi Gemini Pricing:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}