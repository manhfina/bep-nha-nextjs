import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt = '', recipes = [], fridgeItems = [] } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GEMINI_API_KEY trên Environment Variables của Vercel.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(recipes) || recipes.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy danh sách món ăn để lập thực đơn.' },
        { status: 400 }
      );
    }

    const dishList = recipes.slice(0, 40).map((r) => ({
      id: String(r.id),
      title: r.title,
    }));

    const systemInstruction = `Bạn là Trợ lý AI Bếp Nhà Copilot. Nhiệm vụ của bạn là lập thực đơn tuần 7 ngày (từ "Thứ 2" đến "Chủ Nhật") cho gia đình.
Danh sách món ăn hiện có: ${JSON.stringify(dishList)}
Tồn kho tủ lạnh hiện có: ${JSON.stringify(fridgeItems)}
Yêu cầu của người dùng: "${prompt || 'Lên thực đơn cân đối, đa dạng món thịt, cá, rau'}"

QUY TẮC:
1. BẮT BUỘC chỉ chọn các món ăn từ danh sách được cung cấp ở trên và lấy đúng id của món đó.
2. Mỗi ngày có 2 bữa: "lunch" (1-2 id món) và "dinner" (1-2 id món).
3. Đảm bảo đủ 7 ngày gồm: "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật".
4. Phải trả về DUY NHẤT một chuỗi JSON hợp lệ theo cấu trúc:
{
  "summary": "Tóm tắt ngắn gọn thực đơn 1-2 câu",
  "plan": [
    { "day": "Thứ 2", "lunch": ["id1"], "dinner": ["id2"] },
    ...
    { "day": "Chủ Nhật", "lunch": ["id3"], "dinner": ["id4"] }
  ]
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      const errDetail = await res.text();
      console.error('Gemini API Error:', errDetail);
      return NextResponse.json(
        { error: 'Lỗi từ Gemini API: ' + (res.statusText || res.status) },
        { status: 500 }
      );
    }

    const aiRes = await res.json();
    const rawText = aiRes.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsedResult;
    try {
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch (e) {
      parsedResult = {
        summary: 'Thực đơn tuần được tối ưu từ các món ngon của bếp.',
        plan: [
          'Thứ 2',
          'Thứ 3',
          'Thứ 4',
          'Thứ 5',
          'Thứ 6',
          'Thứ 7',
          'Chủ Nhật',
        ].map((day, idx) => ({
          day,
          lunch: [dishList[idx % dishList.length].id],
          dinner: [dishList[(idx + 1) % dishList.length].id],
        })),
      };
    }

    return NextResponse.json(parsedResult);
  } catch (err) {
    console.error('Lỗi API AI:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}