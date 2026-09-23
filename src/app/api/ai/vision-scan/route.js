import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', mode = 'fridge' } = await req.json().catch(() => ({}));

    if (!imageBase64) {
      return NextResponse.json({ error: 'Chưa có dữ liệu hình ảnh để quét.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GEMINI_API_KEY trên Environment Variables.' },
        { status: 500 }
      );
    }

    // Tách phần tiền tố base64 (data:image/jpeg;base64,...) nếu có
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    let systemInstruction = '';
    if (mode === 'receipt') {
      systemInstruction = `Bạn là chuyên gia OCR bóc tách hóa đơn đi chợ và siêu thị tại Việt Nam.
Hãy phân tích hình ảnh hóa đơn và trích xuất danh sách các nguyên liệu, thực phẩm đã mua.
Trả về DUY NHẤT chuỗi JSON hợp lệ theo định dạng:
{
  "store": "Tên siêu thị hoặc chợ (nếu nhận diện được)",
  "totalAmount": 0,
  "items": [
    {
      "name": "Tên thực phẩm chuẩn hóa (ví dụ: Thịt ba chỉ, Trứng gà, Cà chua, Rau muống)",
      "quantity": 1,
      "unit": "kg / g / quả / bó / hộp / vỉ",
      "price": 0
    }
  ]
}`;
    } else {
      systemInstruction = `Bạn là chuyên gia AI nhận diện thực phẩm gia đình.
Hãy nhìn vào bức ảnh tủ lạnh / bàn bếp và liệt kê các loại nguyên liệu, thực phẩm nhìn thấy được.
Bỏ qua các vật dụng không phải thực phẩm như bát đĩa, khay nhựa rỗng.
Tên nguyên liệu viết bằng tiếng Việt thông dụng, dạng danh từ ngắn gọn (ví dụ: Trứng, Thịt heo, Cà chua, Cải ngọt, Hành lá, Cà rốt, Nấm, Tôm).
Trả về DUY NHẤT chuỗi JSON hợp lệ theo định dạng:
{
  "summary": "Mô tả ngắn gọn về tình trạng thực phẩm trong ảnh",
  "items": [
    {
      "name": "Tên nguyên liệu",
      "category": "Thịt / Cá / Rau củ / Trứng / Gia vị / Trái cây"
    }
  ]
}`;
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    const candidateModels = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
    ];

    let rawText = '';
    let success = false;

    for (const model of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const resData = await res.json();
          rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawText) {
            success = true;
            break;
          }
        }
      } catch (err) {
        // Thử model tiếp theo
      }
    }

    if (!success || !rawText) {
      return NextResponse.json(
        { error: 'Không thể nhận diện hình ảnh, vui lòng thử chụp rõ nét hơn.' },
        { status: 500 }
      );
    }

    let parsedResult;
    try {
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'Lỗi bóc tách dữ liệu từ hình ảnh.' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedResult);
  } catch (err) {
    console.error('Lỗi Vision Scan:', err);
    return NextResponse.json({ error: err.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}