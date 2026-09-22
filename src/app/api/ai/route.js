import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

// Sử dụng model chính thức ổn định
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

function extractJsonFromText(rawText) {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch (e) {}
  }

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    try {
      return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
    } catch (e) {}
  }

  return JSON.parse(cleaned);
}

async function callGemini(promptText) {
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong Environment Variables');
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    // Dựng URL chuẩn thông qua constructor URL để loại bỏ 100% lỗi parse URL
    const url = new URL(`[https://generativelanguage.googleapis.com/v1beta/models/$](https://generativelanguage.googleapis.com/v1beta/models/$){model}:generateContent`);
    url.searchParams.set('key', apiKey.trim());

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.warn(`Lỗi Google API (${response.status}):`, responseText);
        lastError = new Error(`Google API (${response.status}): ${responseText}`);
        continue;
      }

      const jsonResult = JSON.parse(responseText);
      const textOutput = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textOutput) {
        const parsed = extractJsonFromText(textOutput);
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn(`Lỗi model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ Google Gemini');
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, text, imageBase64 } = body;

    // 1. ACTION: Bóc tách công thức từ văn bản thô
    if (action === 'parse-recipe') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Nội dung văn bản trống!' }, { status: 400 });
      }

      const prompt = `
Bạn là chuyên gia ẩm thực Việt Nam. Hãy đọc đoạn văn bản mô tả công thức nấu ăn bên dưới và chuyển đổi thành một đối tượng JSON hợp lệ theo đúng mẫu sau (KHÔNG dùng markdown):

{
  "title": "Tên món ăn (ngắn gọn, viết hoa chữ cái đầu)",
  "desc": "Mô tả ngắn gọn về hương vị món ăn (1 câu)",
  "cook_time": 20,
  "difficulty": "Dễ",
  "base_servings": 2,
  "ingredients": [
    {
      "name": "Tên nguyên liệu",
      "amountPerPerson": 100,
      "unit": "g"
    }
  ],
  "steps": [
    "Bước 1: Sơ chế...",
    "Bước 2: Chế biến..."
  ]
}

Quy định:
1. "title": Tên món ăn rõ ràng.
2. "cook_time": Số nguyên phút.
3. "difficulty": Một trong 4 giá trị "Rất dễ", "Dễ", "Trung bình", "Khó".
4. "base_servings": Mặc định là 2 nếu không đề cập.
5. "ingredients": Định lượng theo 1 người ăn, đơn vị tính rõ ràng (g, quả, tép, củ, thìa canh...).
6. "steps": Mảng các bước tuần tự.

Văn bản cần bóc tách:
"""
${text}
"""`;

      const recipeData = await callGemini(prompt);

      return NextResponse.json({
        success: true,
        data: recipeData,
        ...recipeData,
      });
    }

    // 2. ACTION: Quét ảnh tủ lạnh hoặc hóa đơn
    if (action === 'scan-vision') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Thiếu dữ liệu ảnh' }, { status: 400 });
      }

      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const url = new URL('[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent)');
      url.searchParams.set('key', apiKey.trim());

      const visionBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: pureBase64,
                },
              },
              {
                text: 'Hãy nhận diện các nguyên liệu nấu ăn trong ảnh. Trả về JSON mảng: [{"name": "tên thực phẩm", "quantity": 1, "unit": "kg"}]',
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      };

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visionBody),
      });

      const resJson = await res.json();
      const rawVision = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      const items = extractJsonFromText(rawVision) || [];

      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err) {
    console.error('Lỗi API /api/ai:', err.message);
    return NextResponse.json(
      { error: err.message || 'Không thể xử lý dữ liệu AI' },
      { status: 500 }
    );
  }
}