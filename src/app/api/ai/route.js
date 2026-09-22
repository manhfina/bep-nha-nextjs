import { NextResponse } from 'next/server';

const rawKey = process.env.GEMINI_API_KEY || '';
const apiKey = rawKey.trim().replace(/[\r\n\t]/g, '');

// Sử dụng chính xác model Google yêu cầu
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.1-pro-preview',
];

function extractJson(text) {
  if (!text) return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(cleaned.substring(start, end + 1));
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
    const endpoint = '[https://generativelanguage.googleapis.com/v1beta/models/](https://generativelanguage.googleapis.com/v1beta/models/)' + model + ':generateContent';

    const payload = {
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
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const resText = await res.text();

      if (!res.ok) {
        lastError = new Error('Google API ' + res.status + ': ' + resText);
        continue;
      }

      const json = JSON.parse(resText);
      const output = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (output) {
        const parsed = extractJson(output);
        if (parsed) return parsed;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ Google Gemini');
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, text, imageBase64 } = body;

    if (action === 'parse-recipe') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Nội dung văn bản trống!' }, { status: 400 });
      }

      const prompt = `Bạn là chuyên gia ẩm thực Việt Nam. Hãy đọc đoạn văn bản và trích xuất thành JSON hợp lệ theo đúng cấu trúc:
{
  "title": "Tên món ăn",
  "desc": "Mô tả ngắn gọn hương vị",
  "cook_time": 20,
  "difficulty": "Dễ",
  "base_servings": 2,
  "ingredients": [
    { "name": "Tên nguyên liệu", "amountPerPerson": 100, "unit": "g" }
  ],
  "steps": ["Bước 1...", "Bước 2..."]
}

Văn bản:
"""
` + text + `
"""`;

      const data = await callGemini(prompt);
      return NextResponse.json({ success: true, data, ...data });
    }

    if (action === 'scan-vision') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Thiếu dữ liệu ảnh' }, { status: 400 });
      }

      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const endpoint = '[https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent](https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent)';

      const payload = {
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
              { text: 'Nhận diện nguyên liệu trong ảnh. Trả về JSON: [{"name": "tên", "quantity": 1, "unit": "kg"}]' },
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
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      const output = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      const items = extractJson(output) || [];
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
