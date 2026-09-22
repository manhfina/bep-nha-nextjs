// src/lib/priceCalculator.js

/**
 * Chuẩn hóa tên nguyên liệu: bỏ số, dấu đặc biệt và khoảng trắng thừa
 */
export function normalizeIngredientName(rawName) {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/[0-9:.,/\\-]/g, ' ') // bỏ số và ký tự ngăn cách
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trích xuất số lượng và đơn vị từ chuỗi nguyên liệu hoặc object
 */
export function parseIngredientAmount(ing, baseServings = 2, currentServings = 2) {
  const ratio = currentServings / (baseServings || 2);
  let amount = 1;
  let unit = 'phần';

  if (typeof ing === 'object' && ing !== null) {
    if (ing.amountPerPerson) {
      amount = ing.amountPerPerson * currentServings;
      unit = ing.unit || 'phần';
      return { amount, unit };
    }
  }

  const text = typeof ing === 'string' ? ing : `${ing.name || ''} ${ing.unit || ''}`;
  // Tìm số kèm đơn vị (VD: 3 quả, 300g, 0.5 kg, 2 nhánh)
  const regex = /([\d.,]+)\s*(kg|kilogram|gam|gram|g|lạng|quả|trái|củ|nhánh|tép|bó|miếng|hộp|lít|ml|thìa|muỗng)/i;
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
 * Tính chi phí của 1 nguyên liệu
 */
export function calculateIngredientCost(ing, priceMap = {}, baseServings = 2, currentServings = 2) {
  let name = typeof ing === 'string' ? ing : (ing?.name || '');
  const cleanName = normalizeIngredientName(name);
  const { amount, unit } = parseIngredientAmount(ing, baseServings, currentServings);

  // Tìm trong từ điển giá (ưu tiên khớp từ khóa dài nhất)
  let matchedPrice = null;
  const keys = Object.keys(priceMap).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (cleanName.includes(key.toLowerCase())) {
      matchedPrice = priceMap[key];
      break;
    }
  }

  // Nếu là gia vị phụ thông thường không có giá cụ thể
  if (!matchedPrice) {
    const isCommonSpice = /(nước mắm|mắm|tiêu|hạt tiêu|muối|đường|hạt nêm|bột ngọt|dầu ăn)/i.test(cleanName);
    return {
      name,
      cost: isCommonSpice ? 1000 : 3000,
      estimated: true,
    };
  }

  let finalCost = 0;
  const standardUnit = (matchedPrice.unit || 'kg').toLowerCase();
  const price = Number(matchedPrice.price_per_unit) || 0;

  // Quy đổi theo đơn vị
  if (['g', 'gam'].includes(unit) && standardUnit === 'kg') {
    finalCost = (amount / 1000) * price;
  } else if (unit === 'lạng' && standardUnit === 'kg') {
    finalCost = (amount / 10) * price;
  } else if (unit === 'kg' && standardUnit === 'kg') {
    finalCost = amount * price;
  } else if (['quả', 'trái', 'miếng', 'bó', 'nhánh', 'củ'].includes(standardUnit)) {
    finalCost = amount * price;
  } else {
    // Nếu đơn vị là quả mà trong bảng giá tính theo quả
    finalCost = amount * price;
  }

  return {
    name,
    cost: Math.round(finalCost),
    estimated: false,
  };
}

/**
 * Tính tổng chi phí toàn bộ món ăn
 */
export function calculateRecipeTotalCost(recipe, priceMap = {}, servings = 2) {
  if (!recipe?.ingredients || !Array.isArray(recipe.ingredients) || !priceMap) {
    return 0;
  }

  const itemsCost = recipe.ingredients.map((ing) =>
    calculateIngredientCost(ing, priceMap, recipe.baseServings || 2, servings)
  );

  return itemsCost.reduce((sum, item) => sum + item.cost, 0);
}