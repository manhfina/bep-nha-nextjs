import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

// Danh sách các model đang hoạt động chính thức trên endpoint v1beta
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

async function callGeminiREST(prompt, jsonSchema = null, imageInline = null) {
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong Environment Variables');
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts = [];
    if (imageInline) {
      parts.push({
        inline_data: {
          mime_type: imageInline.mimeType || 'image/jpeg',
          data: imageInline.data,
        },
      });
    }
    parts.push({ text: prompt });

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    if (jsonSchema) {
      requestBody.generationConfig.responseSchema = jsonSchema;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
      });

      if (response.ok) {
        const result = await response.json();
        const outputText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (outputText) {
          return JSON.parse(outputText);
        }
      }

      const status = response.status;
      const errorText = await response.text();
      console.warn(`Model ${model} (${status}):`, errorText);
      lastError = new Error(errorText);

      // Nếu model bị 404 hoặc 503, tự chuyển sang model tiếp theo
      if (status === 404 || status === 503 || status === 429) {
        continue;
      }
    } catch (err) {
      console.warn(`Lỗi kết nối tới model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ Google Gemini');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, text, imageBase64 } = body;

    // 1. ACTION: Bóc tách công thức nấu ăn
    if (action === 'parse-recipe') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Vui lòng cung cấp nội dung văn bản' }, { status: 400 });
      }

      const prompt = `Bạn là chuyên gia ẩm thực Việt Nam. Hãy đọc đoạn văn bản sau và trích xuất thành một công thức nấu ăn chuẩn xác dạng JSON.
Yêu cầu:
- Tên món ăn (title): ngắn gọn, chuẩn vị Việt Nam.
- Mô tả (desc): 1 câu tóm tắt hương vị hấp dẫn.
- Thời gian nấu (cook_time): số phút nguyên (ví dụ: 15, 20).
- Độ khó (difficulty): một trong bốn mức "Rất dễ", "Dễ", "Trung bình", "Khó".
- Khẩu phần (base_servings): số người ăn, mặc định là 2.
- Danh sách nguyên liệu (ingredients): mỗi nguyên liệu gồm { name: "tên", amountPerPerson: số_lượng_cho_1_người, unit: "đơn_vị_tính" }.
- Các bước thực hiện (steps): mảng chuỗi các bước làm ngắn gọn.

Văn bản:
"""${text}"""`;

      const recipeSchema = {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          desc: { type: 'STRING' },
          cook_time: { type: 'NUMBER' },
          difficulty: { type: 'STRING' },
          base_servings: { type: 'NUMBER' },
          ingredients: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                amountPerPerson: { type: 'NUMBER' },
                unit: { type: 'STRING' },
              },
              required: ['name', 'amountPerPerson', 'unit'],
            },
          },
          steps: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['title', 'ingredients', 'steps'],
      };

      const parsedData = await callGeminiREST(prompt, recipeSchema);
      return NextResponse.json({ success: true, data: parsedData });
    }

    // 2. ACTION: Quét ảnh tủ lạnh hoặc hóa đơn
    if (action === 'scan-vision') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Thiếu dữ liệu ảnh' }, { status: 400 });
      }

      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const prompt = `Phân tích bức ảnh này. Nhận diện tất cả các nguyên liệu nấu ăn có trong ảnh. Trả về JSON gồm tên thực phẩm, số lượng ước tính và đơn vị tính.`;

      const visionSchema = {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            quantity: { type: 'NUMBER' },
            unit: { type: 'STRING' },
          },
          required: ['name'],
        },
      };

      const items = await callGeminiREST(prompt, visionSchema, {
        mimeType: 'image/jpeg',
        data: pureBase64,
      });

      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err) {
    console.error('Lỗi API /api/ai:', err);
    return NextResponse.json(
      { error: err.message || 'Lỗi xử lý AI' },
      { status: 500 }
    );
  }
}