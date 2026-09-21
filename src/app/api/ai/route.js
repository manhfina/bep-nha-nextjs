import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(request) {
  if (!ai) {
    return NextResponse.json(
      { error: 'Chưa cấu hình GEMINI_API_KEY trong file môi trường' },
      { status: 500 }
    );
  }

  try {
    const { action, text, imageBase64 } = await request.json();

    // 1. ACTION: Bóc tách và chuẩn hóa nguyên liệu từ văn bản thô
    if (action === 'parse-text') {
      if (!text?.trim()) {
        return NextResponse.json({ error: 'Thiếu nội dung văn bản' }, { status: 400 });
      }

      const prompt = `Bạn là chuyên gia ẩm thực Việt Nam. Hãy phân tích danh sách nguyên liệu thô sau đây và chuyển đổi thành danh sách có cấu trúc JSON.
Chuẩn hóa đơn vị đo lường Việt Nam (ví dụ: 1 lạng = 100g, 1 quả, 1 muỗng/thìa, 1 bó, 1 cây...).
Văn bản cần phân tích:
"""${text}"""`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Tên nguyên liệu chuẩn (VD: Thịt bò, Trứng gà, Cà chua)' },
                quantity: { type: Type.NUMBER, description: 'Số lượng' },
                unit: { type: Type.STRING, description: 'Đơn vị tính chuẩn (VD: g, kg, quả, muỗng, tép, bó)' },
                category: { type: Type.STRING, description: 'Nhóm (thịt, rau_củ, gia_vị, trứng_sữa, hải_sản, khác)' },
              },
              required: ['name', 'quantity', 'unit'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text);
      return NextResponse.json({ success: true, ingredients: parsed });
    }

    // 2. ACTION: Quét ảnh tủ lạnh hoặc hóa đơn siêu thị (Vision)
    if (action === 'scan-vision') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Thiếu dữ liệu ảnh' }, { status: 400 });
      }

      // Xử lý chuỗi base64 loại bỏ prefix data:image/...;base64,
      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const prompt = `Phân tích bức ảnh này (đây là ảnh chụp các ngăn bên trong tủ lạnh hoặc hóa đơn siêu thị thực phẩm).
Hãy nhận diện tất cả các thực phẩm/nguyên liệu nấu ăn có trong ảnh. Trả về danh sách dạng JSON chuẩn gồm tên thực phẩm, số lượng ước chừng và đơn vị.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
                name: { type: Type.STRING, description: 'Tên thực phẩm phát hiện được' },
                quantity: { type: Type.NUMBER, description: 'Số lượng ước tính hoặc ghi trên hóa đơn' },
                unit: { type: Type.STRING, description: 'Đơn vị (quả, khay, túi, gói, g, kg...)' },
              },
              required: ['name'],
            },
          },
        },
      });

      const items = JSON.parse(response.text);
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err) {
    console.error('AI Processing Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}