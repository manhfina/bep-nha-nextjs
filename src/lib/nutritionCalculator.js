// src/lib/nutritionCalculator.js

// Dinh dưỡng tính trên 100g hoặc trên 1 đơn vị đếm (quả, bìa...)
// cal: kcal, protein: g, carbs: g, fat: g
export const NUTRITION_DATABASE = {
  'thịt bò': { cal: 250, protein: 26, carbs: 0, fat: 15, perUnit: '100g' },
  'bắp bò': { cal: 215, protein: 28, carbs: 0, fat: 11, perUnit: '100g' },
  'thịt heo': { cal: 242, protein: 27, carbs: 0, fat: 14, perUnit: '100g' },
  'thịt ba chỉ': { cal: 518, protein: 12, carbs: 0, fat: 53, perUnit: '100g' },
  'thịt xay': { cal: 260, protein: 18, carbs: 0, fat: 21, perUnit: '100g' },
  'thịt gà': { cal: 165, protein: 31, carbs: 0, fat: 3.6, perUnit: '100g' },
  'ức gà': { cal: 165, protein: 31, carbs: 0, fat: 3.6, perUnit: '100g' },
  'cua đồng': { cal: 89, protein: 12.3, carbs: 2, fat: 3.3, perUnit: '100g' },
  'tôm': { cal: 99, protein: 24, carbs: 0.2, fat: 0.3, perUnit: '100g' },
  'mực': { cal: 92, protein: 15.6, carbs: 3.1, fat: 1.4, perUnit: '100g' },
  'cá chép': { cal: 96, protein: 16, carbs: 0, fat: 3.6, perUnit: '100g' },
  'cá': { cal: 105, protein: 18, carbs: 0, fat: 3.5, perUnit: '100g' },
  'trứng gà': { cal: 72, protein: 6.3, carbs: 0.4, fat: 4.8, perUnit: '1 quả' },
  'trứng': { cal: 72, protein: 6.3, carbs: 0.4, fat: 4.8, perUnit: '1 quả' },
  'đậu phụ': { cal: 76, protein: 8, carbs: 1.9, fat: 4.8, perUnit: '100g' },
  'mì': { cal: 138, protein: 4.5, carbs: 28, fat: 1.1, perUnit: '100g' },
  'bún': { cal: 110, protein: 1.7, carbs: 25.7, fat: 0, perUnit: '100g' },
  'cơm': { cal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, perUnit: '100g' },
  'cà chua': { cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, perUnit: '100g' },
  'cà tím': { cal: 25, protein: 1, carbs: 6, fat: 0.2, perUnit: '100g' },
  'cà rốt': { cal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, perUnit: '100g' },
  'khoai tây': { cal: 77, protein: 2, carbs: 17, fat: 0.1, perUnit: '100g' },
  'rau cải': { cal: 15, protein: 1.5, carbs: 2.2, fat: 0.2, perUnit: '100g' },
  'cải ngọt': { cal: 16, protein: 1.7, carbs: 2.5, fat: 0.2, perUnit: '100g' },
  'rau muống': { cal: 19, protein: 3, carbs: 2.1, fat: 0.4, perUnit: '100g' },
  'cần tây': { cal: 16, protein: 0.7, carbs: 3, fat: 0.2, perUnit: '100g' },
  'nấm': { cal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, perUnit: '100g' },
  'dầu ăn': { cal: 884, protein: 0, carbs: 0, fat: 100, perUnit: '100g' },
};

/**
 * Tách định lượng và tên nguyên liệu từ text
 */
function parseQtyAndName(ing) {
  if (typeof ing === 'object' && ing !== null) {
    return {
      name: (ing.name || '').toLowerCase().trim(),
      amount: parseFloat(ing.amount || ing.amountPerPerson || 100) || 100,
      unit: (ing.unit || 'g').toLowerCase().trim(),
    };
  }

  const rawText = String(ing || '').toLowerCase().trim();
  let name = rawText;
  let amount = 100; // Mặc định giả định 100g
  let unit = 'g';

  const matchColon = rawText.match(/^(.*?):\s*([\d.,]+)\s*(.*)$/);
  if (matchColon) {
    name = matchColon[1].trim();
    amount = parseFloat(matchColon[2].replace(',', '.')) || 100;
    unit = matchColon[3].trim() || 'g';
  } else {
    const matchPrefix = rawText.match(/^([\d.,]+)\s*([a-zA-Zà-ỹ]+)?\s+(.+)$/);
    if (matchPrefix) {
      amount = parseFloat(matchPrefix[1].replace(',', '.')) || 100;
      unit = matchPrefix[2]?.trim() || 'g';
      name = matchPrefix[3].trim();
    }
  }

  return { name, amount, unit };
}

/**
 * Tra cứu thông số dinh dưỡng của 1 nguyên liệu
 */
function findNutrientInfo(name) {
  for (const [key, val] of Object.entries(NUTRITION_DATABASE)) {
    if (name.includes(key) || key.includes(name)) {
      return val;
    }
  }
  // Mặc định cho rau/gia vị phổ thông nếu không nhận diện được
  return { cal: 30, protein: 1, carbs: 5, fat: 0.5, perUnit: '100g' };
}

/**
 * Tính tổng Macro cho danh sách nguyên liệu của một món ăn
 * @param {Array} ingredients - Danh sách nguyên liệu
 * @param {number} servings - Số người ăn hiện tại
 * @param {number} baseServings - Số người ăn chuẩn trong công thức gốc (mặc định 2)
 */
export function calculateRecipeNutrition(ingredients = [], servings = 2, baseServings = 2) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, caloriesPerServing: 0 };
  }

  const ratio = (servings || 2) / (baseServings || 2);
  let totalCal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  ingredients.forEach((ing) => {
    const { name, amount, unit } = parseQtyAndName(ing);
    const info = findNutrientInfo(name);

    let weightFactor = 1; // Hệ số so với mốc 100g
    if (unit === 'g' || unit === 'gram' || unit === 'gr') {
      weightFactor = amount / 100;
    } else if (unit === 'kg') {
      weightFactor = (amount * 1000) / 100;
    } else if (unit === 'lạng') {
      weightFactor = (amount * 100) / 100;
    } else if (['quả', 'trái', 'bìa', 'miếng', 'vắt'].includes(unit)) {
      weightFactor = amount; // Đơn vị đếm lấy theo 1 quả/miếng
    } else if (['thìa', 'muỗng', 'ít', 'chút'].includes(unit)) {
      weightFactor = 0.1; // ~10g
    }

    const currentAmount = weightFactor * ratio;
    totalCal += info.cal * currentAmount;
    totalProtein += info.protein * currentAmount;
    totalCarbs += info.carbs * currentAmount;
    totalFat += info.fat * currentAmount;
  });

  const finalCal = Math.round(totalCal);
  const servingCount = Math.max(1, servings);

  return {
    calories: finalCal,
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    caloriesPerServing: Math.round(finalCal / servingCount),
  };
}