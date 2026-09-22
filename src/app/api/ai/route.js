import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

// Danh sách các model chính thức theo thứ tự ưu tiên
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

// Hàm bóc tách JSON an toàn từ phản hồi của AI
function extractJsonFromText(rawText) {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  // Loại bỏ các khối code markdown ```json ... ```
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  // Tìm khối JSON hợp lệ từ { đến }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch (e) {
      console.warn('Lỗi parse JSON substring:', e.message);
    }
  }

  // Nếu là mảng JSON
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    try {
      return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
    } catch (e) {
      console.warn('Lỗi parse Array substring:', e.message);
    }
  }

  return JSON.parse(cleaned);
}

// Hàm gọi REST API chuẩn đến máy chủ Google Gemini
async function callGemini(promptText) {
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên Vercel Environment Variables');
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    const endpoint = `[https://generativelanguage.googleapis.com/v1beta/models/$](https://generativelanguage.googleapis.com/v1beta/models/$){model}:generateContent?key=${apiKey}`;

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
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.warn(`Model ${model} báo lỗi (${response.status}):`, responseText);
        lastError = new Error(`Google API (${response.status}): ${responseText}`);
        continue; // Chuyển sang model tiếp theo
      }

      const jsonResult = JSON.parse(responseText);
      const textOutput = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textOutput) {
        const parsed = extractJsonFromText(textOutput);
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn(`Lỗi khi gọi model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ Google Gemini');
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, text, imageBase64 } = body;

    // 1. ACTION: Bóc tách công thức nấu ăn từ văn bản
    if (action === 'parse-recipe') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Nội dung văn bản trống!' }, { status: 400 });
      }

      const prompt = `
Bạn là chuyên gia ẩm thực Việt Nam. Nhiệm vụ của bạn là đọc đoạn văn bản mô tả công thức nấu ăn bên dưới và chuyển đổi thành một đối tượng JSON hợp lệ theo đúng mẫu sau (KHÔNG dùng markdown):

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

Quy định bóc tách:
1. "cook_time": Chỉ trả về số nguyên (phút).
2. "difficulty": Chọn 1 trong 4 giá trị: "Rất dễ", "Dễ", "Trung bình", "Khó".
3. "base_servings": Mặc định là 2 nếu không nhắc tới.
4. "ingredients": Định lượng chia theo 1 người ăn (amountPerPerson). Unit là: "g", "kg", "quả", "trái", "củ", "nhánh", "thìa canh", "thìa cà phê", v.v. Nếu là gia vị nêm nếm không rõ số lượng thì để amountPerPerson: 1, unit: "thìa canh".
5. "steps": Danh sách các bước dạng chuỗi tuần tự.

Văn bản cần bóc tách:
"""
${text}
"""`;

      const recipeData = await callGemini(prompt);
      return NextResponse.json({ success: true, data: recipeData });
    }

    // 2. ACTION: Quét ảnh tủ lạnh hoặc hóa đơn
    if (action === 'scan-vision') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Thiếu dữ liệu ảnh' }, { status: 400 });
      }

      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const endpoint = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$){apiKey}`;

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
                text: 'Hãy nhận diện các nguyên liệu nấu ăn trong ảnh. Trả về JSON mảng gồm các đối tượng: [{"name": "tên thực phẩm", "quantity": 1, "unit": "kg"}]',
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      };

      const res = await fetch(endpoint, {
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
      { status: 200 } // Trả về 200 kèm key error để frontend hiển thị thông báo thay vì sập lỗi 500
    );
  }
}