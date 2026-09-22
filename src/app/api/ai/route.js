import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

// Danh sách các model chính thức theo thứ tự ưu tiên
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

// Gọi REST API trực tiếp của Google Gemini với key AQ...
async function callGemini(promptText) {
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong Environment Variables');
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    // Nối chuỗi bằng dấu cộng thuần túy, tránh lỗi parse link
    const endpoint = '[https://generativelanguage.googleapis.com/v1beta/models/](https://generativelanguage.googleapis.com/v1beta/models/)' + model + ':generateContent?key=' + apiKey;

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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.warn('Lỗi từ Google (' + response.status + '):', responseText);
        lastError = new Error('Google API (' + response.status + '): ' + responseText);
        continue;
      }

      const jsonResult = JSON.parse(responseText);
      const textOutput = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textOutput) {
        const parsed = extractJsonFromText(textOutput);
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn('Lỗi kết nối model ' + model + ':', err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ Google Gemini');
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, text, imageBase64 } = body;

    // 1. ACTION: Bóc tách công thức nấu ăn
    if (action === 'parse-recipe') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Nội dung văn bản trống!' }, { status: 400 });
      }

      const prompt = `
Bạn là chuyên gia ẩm thực Việt Nam. Hãy đọc đoạn văn bản mô tả công thức nấu ăn bên dưới và chuyển đổi thành một đối tượng JSON hợp lệ theo đúng mẫu sau:

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
1. "title": Bắt buộc có tên món ăn.
2. "cook_time": Số nguyên phút.
3. "difficulty": Chọn 1 trong 4 giá trị: "Rất dễ", "Dễ", "Trung bình", "Khó".
4. "base_servings": Mặc định là 2.
5. "ingredients": Mảng gồm { name, amountPerPerson, unit }.
6. "steps": Danh sách mảng các bước nấu dạng chuỗi.

Văn bản:
"""
` + text + `
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
      const visionEndpoint = '[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=)' + apiKey;

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

      const res = await fetch(visionEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
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