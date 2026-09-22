import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Danh sách các model ổn định theo thứ tự ưu tiên (Tự động đổi nếu model chính nghẽn 503)
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

// Hàm hỗ trợ gọi Gemini kèm Retry và Fallback model tự động
async function generateWithFallback(paramsGenerator) {
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const params = paramsGenerator(model);
        const response = await ai.models.generateContent(params);
        if (response && response.text) {
          return response;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Lỗi gọi model ${model} (lần ${attempt + 1}):`, err.message);
        // Chờ ngắn trước khi thử lại
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ AI');
}

export async function POST(request) {
  if (!ai) {
    return NextResponse.json(
      { error: 'Chưa cấu hình GEMINI_API_KEY trong file môi trường' },
      { status: 500 }
    );
  }

  try {
    const { action, text, imageBase64 } = await request.json();

    // 1. ACTION: Bóc tách TOÀN BỘ CÔNG THỨC từ văn bản thô
    if (action === 'parse-recipe') {
      if (!text?.trim()) {
        return NextResponse.json({ error: 'Thiếu nội dung văn bản' }, { status: 400 });
      }

      const prompt = `Bạn là chuyên gia ẩm thực Việt Nam. Hãy đọc đoạn văn bản sau và trích xuất thành một công thức nấu ăn chuẩn xác dạng JSON.
Yêu cầu:
- Tên món ăn (title).
- Mô tả ngắn gọn (desc).
- Thời gian nấu (cook_time: số phút nguyên, ví dụ: 20).
- Độ khó (difficulty: "Rất dễ", "Dễ", "Trung bình", "Khó").
- Khẩu phần cơ bản (base_servings: số người, mặc định là 2 nếu không đề cập).
- Danh sách nguyên liệu (ingredients): tên nguyên liệu (name), định lượng cho 1 người ăn (amountPerPerson), đơn vị tính (unit). Ví dụ: tổng 300g cho 2 người thì amountPerPerson là 150, unit là "g".
- Các bước thực hiện (steps): danh sách các bước dạng text ngắn gọn, dễ hiểu.

Đoạn văn bản cần phân tích:
"""${text}"""`;

      const response = await generateWithFallback((model) => ({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Tên món ăn' },
              desc: { type: Type.STRING, description: 'Mô tả tóm tắt món ăn' },
              cook_time: { type: Type.NUMBER, description: 'Thời gian nấu bằng phút' },
              difficulty: { type: Type.STRING, description: 'Độ khó' },
              base_servings: { type: Type.NUMBER, description: 'Số người ăn cơ bản' },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Tên nguyên liệu' },
                    amountPerPerson: { type: Type.NUMBER, description: 'Lượng cho 1 người' },
                    unit: { type: Type.STRING, description: 'Đơn vị tính (g, quả, muỗng, tép...)' },
                  },
                  required: ['name', 'amountPerPerson', 'unit'],
                },
              },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Danh sách các bước nấu',
              },
            },
            required: ['title', 'ingredients', 'steps'],
          },
        },
      }));

      const parsedData = JSON.parse(response.text);
      return NextResponse.json({ success: true, data: parsedData });
    }

    // 2. ACTION: Quét ảnh tủ lạnh hoặc hóa đơn (Vision)
    if (action === 'scan-vision') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Thiếu dữ liệu ảnh' }, { status: 400 });
      }

      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const prompt = `Phân tích bức ảnh này (ảnh chụp tủ lạnh hoặc hóa đơn thực phẩm).
Nhận diện tất cả các nguyên liệu nấu ăn. Trả về JSON gồm tên thực phẩm, số lượng ước tính và đơn vị.`;

      const response = await generateWithFallback((model) => ({
        model,
        contents: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: pureBase64,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Tên thực phẩm' },
                quantity: { type: Type.NUMBER, description: 'Số lượng' },
                unit: { type: Type.STRING, description: 'Đơn vị' },
              },
              required: ['name'],
            },
          },
        },
      }));

      const items = JSON.parse(response.text);
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err) {
    console.error('AI Processing Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}