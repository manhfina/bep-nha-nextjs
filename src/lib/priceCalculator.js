// src/lib/priceCalculator.js

/**
 * Chuẩn hóa chuỗi nguyên liệu để tìm kiếm (bỏ dấu cách thừa, viết thường)
 */
export function normalizeIngredientName(rawName) {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/[0-9.,/]/g, '') // bỏ số
    .replace(/(gam|gram|g|kg|kilogram|lạng|ml|lít|muỗng|thìa|bát|chén|quả|trái|củ|nhánh|tép|bó|gói|hộp|miếng)/gi, '') // bỏ từ chỉ đơn vị
    .trim();
}

/**
 * Trích xuất số lượng và đơn vị từ chuỗi nguyên liệu
 * Ví dụ: "300g thịt ba chỉ" -> { amount: 300, unit: 'g' }
 */
export function parseIngredientAmount(text, baseServings = 2, currentServings = 2) {
  const ratio = currentServings / (baseServings || 2);
  let amount = 1;
  let unit = 'phần';

  // Tìm số kèm đơn vị (ví dụ: 300g, 2 quả, 1.5kg, 500 ml)
  const regex = /([\d.,]+)\s*(kg|kilogram|gam|gram|g|lạng|quả|trái|củ|bó|miếng|hộp|lít|ml)/i;
  const match = text.match(regex);

  if (match) {
    let rawNum = parseFloat(match[1].replace(',', '.'));
    let rawUnit = match[2].toLowerCase();

    if (!isNaN(rawNum)) {
      amount = rawNum * ratio;
      unit = rawUnit;
    }
  }

  return { amount, unit };
}

/**
 * Tính chi phí của 1 nguyên liệu dựa trên từ điển giá
 */
export function calculateIngredientCost(ing, priceMap, baseServings = 2, currentServings = 2) {
  let rawText = typeof ing === 'string' ? ing : `${ing.amountPerPerson ? (ing.amountPerPerson * currentServings) : ''} ${ing.unit || ''} ${ing.name || ''}`;
  let name = typeof ing === 'string' ? ing : ing.name;

  const { amount, unit } = parseIngredientAmount(rawText, baseServings, currentServings);
  const cleanName = normalizeIngredientName(name);

  // Tìm trong từ điển giá (so sánh tương đối)
  let matchedPrice = null;
  for (const [key, priceData] of Object.entries(priceMap)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      matchedPrice = priceData;
      break;
    }
  }

  if (!matchedPrice) {
    // Giá mặc định ước lượng cho gia vị / rau thơm lẻ (~3.000đ)
    return { name, cost: 3000, estimated: true };
  }

  let finalCost = 0;
  const standardUnit = matchedPrice.unit.toLowerCase();
  const price = matchedPrice.price_per_unit;

  // Quy đổi khối lượng về chuẩn đơn giá
  if (['g', 'gam'].includes(unit) && standardUnit === 'kg') {
    finalCost = (amount / 1000) * price;
  } else if (unit === 'lạng' && standardUnit === 'kg') {
    finalCost = (amount / 10) * price;
  } else if (unit === 'kg' && standardUnit === 'kg') {
    finalCost = amount * price;
  } else if (['quả', 'trái', 'củ', 'miếng', 'bó'].includes(unit)) {
    finalCost = amount * price;
  } else {
    finalCost = (amount / 1000) * price; // fallback
  }

  return {
    name,
    cost: Math.round(finalCost),
    estimated: false,
  };
}

/**
 * Tính tổng chi phí cho toàn bộ món ăn
 */
export function calculateRecipeTotalCost(recipe, priceMap, servings = 2) {
  if (!recipe?.ingredients || !Array.isArray(recipe.ingredients) || !priceMap) {
    return 0;
  }

  const itemsCost = recipe.ingredients.map((ing) =>
    calculateIngredientCost(ing, priceMap, recipe.baseServings || 2, servings)
  );

  const total = itemsCost.reduce((sum, item) => sum + item.cost, 0);
  return Math.round(total);
}