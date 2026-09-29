import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROOT_ADMIN_PHONES } from '@/lib/permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Hàm tự động suy luận Tags từ nguyên liệu & tên món
function extractFallbackTags(title = '', ingredients = []) {
  const text = `${title} ${ingredients.map((i) => (typeof i === 'string' ? i : i?.name || '')).join(' ')}`.toLowerCase();
  const tags = new Set();

  if (/ba chỉ|nạc|thịt heo|thịt lợn|sườn|chả lụa|giò lụa|nem chua|mỡ heo/i.test(text)) {
    tags.add('thịt heo');
    tags.add('thịt lợn');
  }
  if (/bò|bắp bò|gầu bò|nạm bò|thăn bò|xương ống bò/i.test(text)) {
    tags.add('thịt bò');
  }
  if (/gà|ức gà|đùi gà|cánh gà/i.test(text)) {
    tags.add('thịt gà');
  }
  if (/tôm|tôm sú|tôm đất|tôm khô|tôm chấy/i.test(text)) {
    tags.add('tôm');
    tags.add('hải sản');
  }
  if (/cua|cua đồng|ghẹ/i.test(text)) {
    tags.add('cua');
    tags.add('hải sản');
  }
  if (/cá|cá lóc|cá hồi|cá thu/i.test(text)) {
    tags.add('cá');
    tags.add('thủy sản');
  }
  if (/trứng|trứng gà|trứng vịt|trứng cút/i.test(text)) {
    tags.add('trứng');
  }
  if (/cơm|gạo|nếp|xôi/i.test(text)) {
    tags.add('cơm');
    tags.add('tinh bột');
  }
  if (/phở|bún|miến|mì/i.test(text)) {
    tags.add('món nước');
    tags.add('bún phở');
  }

  return Array.from(tags);
}

// Gọi AI để mở rộng Tags ngữ nghĩa phong phú
async function generateSmartTags(title, desc, ingredients) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return extractFallbackTags(title, ingredients);

    const ingText = ingredients.map((i) => (typeof i === 'string' ? i : i?.name || '')).join(', ');
    const prompt = `Phân tích món ăn sau và trả về DUY NHẤT một mảng JSON các từ khóa/nhãn tìm kiếm (tags) ngắn gọn bằng tiếng Việt, bao gồm cả các nhóm thực phẩm gốc (ví dụ nếu có ba chỉ/sườn thì phải có "thịt heo", "thịt lợn"; nếu có bắp bò thì có "thịt bò").
Tên món: ${title}
Mô tả: ${desc}
Nguyên liệu: ${ingText}
Ví dụ format trả về: ["thịt heo", "thịt lợn", "cơm", "món nướng"]`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await res.json();
    const rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = rawOutput.match(/\[.*?\]/s);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...parsed.map((t) => String(t).toLowerCase().trim()), ...extractFallbackTags(title, ingredients)]));
      }
    }
  } catch (err) {
    console.warn('Lỗi sinh smart tags từ AI, dùng fallback:', err.message);
  }
  return extractFallbackTags(title, ingredients);
}

async function verifyPermission(phone) {
  if (!phone) return false;
  const cleanPhone = String(phone).trim();

  if (ROOT_ADMIN_PHONES.includes(cleanPhone)) {
    return true;
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('phone_number', cleanPhone)
    .maybeSingle();

  if (error || !data) return false;
  return data.role === 'admin' || data.role === 'editor';
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { requesterPhone, ...insertData } = body;

    // Chuẩn hóa và đồng bộ 2 chiều các bước nấu
    const finalSteps = Array.isArray(insertData.steps) && insertData.steps.length > 0
      ? insertData.steps
      : (Array.isArray(insertData.instructions) ? insertData.instructions : []);

    const finalIngredients = Array.isArray(insertData.ingredients) ? insertData.ingredients : [];
    const textDesc = insertData.desc || insertData.description || '';
    const titleText = String(insertData.title || '').trim();
    const imageUrl = insertData.image_url || insertData.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80';

    // Tự động phân tích và tạo tags thông minh
    const smartTags = insertData.tags && Array.isArray(insertData.tags) && insertData.tags.length > 0
      ? insertData.tags
      : await generateSmartTags(titleText, textDesc, finalIngredients);

    const payload = {
      ...insertData,
      title: titleText,
      cooking_method: insertData.cooking_method || 'Bếp thường',
      base_servings: Number(insertData.base_servings) || 2,
      cook_time: Number(insertData.cook_time) || 20,
      time: insertData.time || `${Number(insertData.cook_time) || 20} phút`,
      difficulty: insertData.difficulty || 'Dễ',
      steps: finalSteps,
      instructions: finalSteps,
      desc: textDesc,
      description: textDesc,
      ingredients: finalIngredients,
      image: imageUrl,
      image_url: imageUrl,
      tags: smartTags,
    };

    const { data, error } = await supabase
      .from('recipes')
      .insert([payload])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requesterPhone = request.headers.get('x-user-phone') || searchParams.get('phone');

    const hasPermission = await verifyPermission(requesterPhone);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Bạn không có quyền xóa công thức món ăn này!' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID món ăn' }, { status: 400 });
    }

    // 1. Thử xóa theo chuỗi ID
    let { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    // 2. Nếu id là số nguyên, thử xóa theo dạng Number
    if (error && !isNaN(Number(id))) {
      const retry = await supabase
        .from('recipes')
        .delete()
        .eq('id', Number(id));
      error = retry.error;
    }

    if (error) {
      console.error('Lỗi Supabase DELETE:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, requesterPhone: bodyPhone, ...rawUpdateData } = body;
    const requesterPhone = request.headers.get('x-user-phone') || bodyPhone;

    const hasPermission = await verifyPermission(requesterPhone);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Bạn không có quyền chỉnh sửa công thức món ăn này!' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID món ăn cần cập nhật' }, { status: 400 });
    }

    const cleanUpdate = {};
    if (rawUpdateData.title !== undefined) cleanUpdate.title = String(rawUpdateData.title).trim();

    // Đồng bộ cả desc và description
    if (rawUpdateData.desc !== undefined || rawUpdateData.description !== undefined) {
      const textDesc = String(rawUpdateData.desc || rawUpdateData.description || '').trim();
      cleanUpdate.desc = textDesc;
      cleanUpdate.description = textDesc;
    }

    if (rawUpdateData.cooking_method !== undefined) cleanUpdate.cooking_method = String(rawUpdateData.cooking_method).trim();
    if (rawUpdateData.base_servings !== undefined) cleanUpdate.base_servings = Number(rawUpdateData.base_servings) || 2;
    if (rawUpdateData.time !== undefined) cleanUpdate.time = String(rawUpdateData.time).trim();
    if (rawUpdateData.cook_time !== undefined) cleanUpdate.cook_time = Number(rawUpdateData.cook_time) || 15;
    if (rawUpdateData.difficulty !== undefined) cleanUpdate.difficulty = String(rawUpdateData.difficulty).trim();
    
    if (rawUpdateData.image !== undefined || rawUpdateData.image_url !== undefined) {
      const img = String(rawUpdateData.image_url || rawUpdateData.image || '');
      cleanUpdate.image = img;
      cleanUpdate.image_url = img;
    }

    if (rawUpdateData.ingredients !== undefined) {
      cleanUpdate.ingredients = Array.isArray(rawUpdateData.ingredients) ? rawUpdateData.ingredients : [];
    }

    // ĐỒNG BỘ CẢ steps LẪN instructions
    if (rawUpdateData.steps !== undefined || rawUpdateData.instructions !== undefined) {
      const stepsArr = Array.isArray(rawUpdateData.steps)
        ? rawUpdateData.steps
        : (Array.isArray(rawUpdateData.instructions) ? rawUpdateData.instructions : []);
      cleanUpdate.steps = stepsArr;
      cleanUpdate.instructions = stepsArr;
    }

    // Tự động cập nhật tags khi sửa món
    if (cleanUpdate.title || cleanUpdate.ingredients) {
      cleanUpdate.tags = await generateSmartTags(
        cleanUpdate.title || '',
        cleanUpdate.description || '',
        cleanUpdate.ingredients || []
      );
    }

    let result = await supabase
      .from('recipes')
      .update(cleanUpdate)
      .eq('id', id)
      .select();

    if ((!result.data || result.data.length === 0) && !isNaN(Number(id))) {
      result = await supabase
        .from('recipes')
        .update(cleanUpdate)
        .eq('id', Number(id))
        .select();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data?.[0] || { success: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}