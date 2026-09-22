// src/lib/priceCalculator.js

/**
 * Chuẩn hóa tên nguyên liệu: bỏ số, dấu đặc biệt và khoảng trắng thừa
 */
export function normalizeIngredientName(rawName) {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/[0-9:.,/\\-]/g, ' ')
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
      unit = (ing.unit || 'phần').toLowerCase();
      return { amount, unit };
    }
  }

  // Ghép chuỗi để phân tích regex
  let text = '';
  if (typeof ing === 'string') {
    text = ing;
  } else if (typeof ing === 'object' && ing !== null) {
    text = `${ing.name || ''} ${ing.unit || ''} ${ing.amount || ''}`;
  }

  const regex = /([\d.,]+)\s*(kg|kilogram|gam|gram|g|lạng|quả|trái|củ|nhánh|tép|bó|cọng|miếng|hộp|lít|ml|thìa|muỗng|bát|chén)/i;
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

  // Tìm trong từ điển giá (ưu tiên từ khóa dài nhất)
  let matchedPrice = null;
  const keys = Object.keys(priceMap).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (cleanName.includes(key.toLowerCase())) {
      matchedPrice = priceMap[key];
      break;
    }
  }

  // 1. Nếu là gia vị nêm nếm thông thường
  const isCommonSpice = /(nước mắm|mắm|tiêu|hạt tiêu|muối|đường|hạt nêm|bột ngọt|dầu ăn|dấm|giấm|xì dầu|nước tương)/i.test(cleanName);
  if (!matchedPrice) {
    return {
      name,
      cost: isCommonSpice ? 1000 : 3000,
      estimated: true,
    };
  }

  let finalCost = 0;
  const standardUnit = (matchedPrice.unit || 'kg').toLowerCase();
  const price = Number(matchedPrice.price_per_unit) || 0;

  // 2. Xử lý quy đổi chi tiết theo đơn vị
  if (['g', 'gam'].includes(unit) && standardUnit === 'kg') {
    finalCost = (amount / 1000) * price;
  } else if (unit === 'lạng' && standardUnit === 'kg') {
    finalCost = (amount / 10) * price;
  } else if (unit === 'kg' && standardUnit === 'kg') {
    finalCost = amount * price;
  } 
  // Xử lý các đơn vị nhỏ như: nhánh, cọng, tép (VD: hành lá, tỏi, gừng)
  else if (['nhánh', 'cọng', 'tép'].includes(unit)) {
    if (standardUnit === 'kg') {
      // 1 nhánh hành/cọng hành nặng ước tính ~10g (0.01kg)
      finalCost = amount * 0.01 * price; 
    } else {
      finalCost = amount * 500; // Giá ước tính tượng trưng nếu đơn vị khác
    }
  } 
  // Xử lý củ (hành tây, cà rốt, khoai tây) khi đơn vị chuẩn là kg
  else if (unit === 'củ' && standardUnit === 'kg') {
    // Ước lượng 1 củ ~ 150g (0.15kg)
    finalCost = amount * 0.15 * price;
  }
  // Các đơn vị đếm trực tiếp (quả, trái, miếng, bó, hộp)
  else if (['quả', 'trái', 'miếng', 'bó', 'hộp'].includes(unit) || ['quả', 'trái', 'miếng', 'bó', 'hộp'].includes(standardUnit)) {
    finalCost = amount * price;
  } 
  // Nếu là thìa/muỗng khi ướp gia vị
  else if (['thìa', 'muỗng'].includes(unit)) {
    finalCost = 1000;
  } 
  // Mặc định an toàn
  else {
    finalCost = (amount / 1000) * price;
  }

  // Đảm bảo không nhỏ hơn 500đ nếu đã tốn nguyên liệu
  finalCost = Math.max(500, Math.round(finalCost));

  return {
    name,
    cost: finalCost,
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