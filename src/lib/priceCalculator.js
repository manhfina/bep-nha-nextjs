// src/lib/priceCalculator.js

/**
 * Chuẩn hóa tên nguyên liệu: loại bỏ số, dấu đặc biệt và khoảng trắng thừa
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
    if (ing.amountPerPerson != null && !isNaN(parseFloat(ing.amountPerPerson))) {
      amount = parseFloat(ing.amountPerPerson) * currentServings;
      unit = (ing.unit || 'phần').toLowerCase().trim();
      return { amount, unit };
    }
    if (ing.amount != null && !isNaN(parseFloat(ing.amount))) {
      amount = parseFloat(ing.amount) * ratio;
      unit = (ing.unit || 'phần').toLowerCase().trim();
      return { amount, unit };
    }
  }

  // Nếu là dạng chuỗi (text)
  let text = '';
  if (typeof ing === 'string') {
    text = ing;
  } else if (typeof ing === 'object' && ing !== null) {
    text = `${ing.name || ''} ${ing.unit || ''} ${ing.amount || ''}`;
  }

  const regex = /([\d.,]+)\s*(kilogram|kg|gam|gram|gr|g|lạng|quả|trái|củ|nhánh|cọng|tép|bó|miếng|hộp|lít|lit|ml|thìa|muỗng|bát|chén)?/i;
  const match = text.match(regex);

  if (match) {
    let rawNum = parseFloat(match[1].replace(',', '.'));
    let rawUnit = match[2] ? match[2].toLowerCase().trim() : '';

    if (!isNaN(rawNum)) {
      amount = rawNum * ratio;
      if (rawUnit) unit = rawUnit;
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
  const keys = Object.keys(priceMap || {}).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (cleanName.includes(key.toLowerCase())) {
      matchedPrice = priceMap[key];
      break;
    }
  }

  // 1. Nhóm gia vị nêm nếm phụ gia (mắm, muối, tiêu, đường, dầu ăn...)
  const isCommonSpice = /(nước mắm|mắm|tiêu|hạt tiêu|muối|đường|hạt nêm|bột ngọt|dầu ăn|dấm|giấm|xì dầu|nước tương|hành tím băm|tỏi băm)/i.test(cleanName);
  if (!matchedPrice) {
    return {
      name,
      cost: isCommonSpice ? 1000 : 3000,
      estimated: true,
    };
  }

  const standardUnit = (matchedPrice.unit || 'kg').toLowerCase().trim();
  const price = Number(matchedPrice.price_per_unit) || 0;
  let finalCost = 0;

  // 2. NẾU GIÁ CHUẨN ĐƯỢC TÍNH THEO "KG"
  if (standardUnit === 'kg') {
    if (['g', 'gam', 'gr', 'gram'].includes(unit)) {
      finalCost = (amount / 1000) * price;
    } else if (unit === 'lạng') {
      finalCost = (amount / 10) * price;
    } else if (unit === 'kg' || unit === 'kilogram') {
      finalCost = amount * price;
    } 
    // Các đơn vị quả/trái tính theo kg (cà chua, dưa chuột, bí ngòi, bắp...)
    else if (['quả', 'trái'].includes(unit)) {
      // 1 quả cà chua/rau củ thông thường ~ 100g (0.1 kg)
      const kgPerPiece = /(ớt|chanh|quất|tắc)/i.test(cleanName) ? 0.02 : 0.1;
      finalCost = amount * kgPerPiece * price;
    } 
    // Củ tính theo kg (hành tây, cà rốt, củ cải, khoai tây...)
    else if (unit === 'củ') {
      // 1 củ ~ 120g (0.12 kg)
      const kgPerRoot = /(hành tím|tỏi)/i.test(cleanName) ? 0.02 : 0.12;
      finalCost = amount * kgPerRoot * price;
    } 
    // Nhánh / cọng / tép (hành lá, tỏi, gừng...)
    else if (['nhánh', 'cọng', 'tép'].includes(unit)) {
      finalCost = amount * 0.01 * price; // 1 nhánh ~ 10g (0.01 kg)
    } 
    // Bó
    else if (unit === 'bó') {
      finalCost = amount * 0.3 * price; // 1 bó rau ~ 300g (0.3 kg)
    } 
    else {
      // Nếu không khớp đơn vị mà số lượng > 10 thì khả năng cao là gram (VD: thịt bò 200)
      if (amount >= 10) {
        finalCost = (amount / 1000) * price;
      } else {
        finalCost = amount * 0.1 * price;
      }
    }
  } 
  // 3. NẾU GIÁ CHUẨN ĐƯỢC TÍNH THEO QUẢ/TRÁI (trứng gà, trứng vịt, quả dừa...)
  else if (['quả', 'trái'].includes(standardUnit)) {
    finalCost = amount * price;
  }
  // 4. NẾU GIÁ CHUẨN ĐƯỢC TÍNH THEO BÓ, MIẾNG, HỘP
  else if (['bó', 'miếng', 'hộp', 'gói'].includes(standardUnit)) {
    finalCost = amount * price;
  }
  // 5. Mặc định an toàn
  else {
    finalCost = amount * price;
  }

  // Khống chế mức sàn tối thiểu nếu là nguyên liệu phụ
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