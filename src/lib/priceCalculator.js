// src/lib/priceCalculator.js

/**
 * Chuẩn hóa tên nguyên liệu: loại bỏ số, dấu đặc biệt và các từ bổ trợ thừa
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

  let text = '';
  if (typeof ing === 'string') {
    text = ing;
  } else if (typeof ing === 'object' && ing !== null) {
    text = `${ing.name || ''} ${ing.unit || ''} ${ing.amount || ''}`;
  }

  const regex = /([\d.,]+)\s*(kilogram|kg|gam|gram|gr|g|lạng|quả|trái|củ|nhánh|cọng|tép|bó|mớ|miếng|hộp|lít|lit|ml|thìa cà phê|thìa canh|thìa|muỗng cà phê|muỗng|bát|chén)?/i;
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
 * Ánh xạ từ khóa biến thể về từ khóa gốc phổ biến trong từ điển giá
 */
function findMatchedPrice(cleanName, priceMap = {}) {
  const keys = Object.keys(priceMap || {}).sort((a, b) => b.length - a.length);

  // 1. Tìm khớp trực tiếp
  for (const key of keys) {
    if (cleanName.includes(key.toLowerCase())) {
      return priceMap[key];
    }
  }

  // 2. Map các biến thể tên gọi thường gặp ở bếp Việt
  const aliases = [
    { pattern: /(hành mùi|hành hoa|ngò rí|rau mùi|rau ngò|hành ngò)/i, target: 'hành lá' },
    { pattern: /(hành tím băm|hành khô băm|hành khô)/i, target: 'hành tím' },
    { pattern: /(tỏi băm|tỏi củ)/i, target: 'tỏi' },
    { pattern: /(tiêu xay|bột tiêu|hạt tiêu)/i, target: 'tiêu' },
    { pattern: /(cà chua bi)/i, target: 'cà chua' },
  ];

  for (const item of aliases) {
    if (item.pattern.test(cleanName)) {
      for (const key of keys) {
        if (key.toLowerCase().includes(item.target)) {
          return priceMap[key];
        }
      }
    }
  }

  return null;
}

/**
 * Tính chi phí của 1 nguyên liệu
 */
export function calculateIngredientCost(ing, priceMap = {}, baseServings = 2, currentServings = 2) {
  let name = typeof ing === 'string' ? ing : (ing?.name || '');
  const cleanName = normalizeIngredientName(name);
  const { amount, unit } = parseIngredientAmount(ing, baseServings, currentServings);

  const matchedPrice = findMatchedPrice(cleanName, priceMap);

  // Nhóm rau thơm, gia vị nêm nếm phụ gia nhỏ
  const isHerbOrSpice = /(hành mùi|hành hoa|hành lá|ngò|rau mùi|hành tím|tỏi|ớt|tiêu|nước mắm|mắm|muối|đường|hạt nêm|bột ngọt|dầu ăn|giấm)/i.test(cleanName);

  // Nếu không tìm thấy giá trong từ điển
  if (!matchedPrice) {
    let fallbackCost = 2000;
    if (['nhánh', 'cọng', 'tép'].includes(unit)) {
      fallbackCost = Math.round(amount * 500); // 1 nhánh rau thơm ~ 500đ
    } else if (unit === 'củ' && /(hành tím|tỏi)/i.test(cleanName)) {
      fallbackCost = Math.round(amount * 500); // 1 củ hành tím ~ 500đ (0.5 củ ~ 250-300đ)
    } else if (isHerbOrSpice) {
      fallbackCost = 500;
    }

    return {
      name,
      cost: Math.max(300, fallbackCost),
      estimated: true,
    };
  }

  const standardUnit = (matchedPrice.unit || 'kg').toLowerCase().trim();
  const price = Number(matchedPrice.price_per_unit) || 0;
  let finalCost = 0;

  // 1. ĐƠN GIÁ CHUẨN LÀ "KG"
  if (standardUnit === 'kg') {
    if (['g', 'gam', 'gr', 'gram'].includes(unit)) {
      finalCost = (amount / 1000) * price;
    } else if (unit === 'lạng') {
      finalCost = (amount / 10) * price;
    } else if (unit === 'kg' || unit === 'kilogram') {
      finalCost = amount * price;
    } 
    // Quả/Trái (Cà chua, dưa chuột...)
    else if (['quả', 'trái'].includes(unit)) {
      const kgPerPiece = /(ớt|chanh|quất|tắc)/i.test(cleanName) ? 0.015 : 0.1;
      finalCost = amount * kgPerPiece * price;
    } 
    // Củ (Hành tím, tỏi, hành tây, cà rốt...)
    else if (unit === 'củ') {
      // 1 củ hành tím/tỏi chỉ nặng khoảng 12g - 15g (0.012 kg)
      const isSmallBulb = /(hành tím|tỏi|hành khô)/i.test(cleanName);
      const kgPerRoot = isSmallBulb ? 0.012 : 0.12; 
      finalCost = amount * kgPerRoot * price;
    } 
    // Nhánh / Cọng / Tép (Hành lá, hành mùi, ngò, tỏi...)
    else if (['nhánh', 'cọng', 'tép'].includes(unit)) {
      // 1 nhánh hành lá / cọng ngò chỉ khoảng 6g - 8g (0.007 kg)
      finalCost = amount * 0.007 * price;
    } 
    // Bó / Mớ
    else if (['bó', 'mớ'].includes(unit)) {
      finalCost = amount * 0.25 * price; // ~250g
    } 
    // Thìa / muỗng
    else if (unit.includes('thìa') || unit.includes('muỗng')) {
      finalCost = 500;
    } 
    else {
      if (amount >= 10) {
        finalCost = (amount / 1000) * price; // Giả định là gram nếu số lớn
      } else {
        finalCost = amount * 0.05 * price;
      }
    }
  } 
  // 2. ĐƠN GIÁ CHUẨN LÀ "QUẢ" / "TRÁI"
  else if (['quả', 'trái'].includes(standardUnit)) {
    finalCost = amount * price;
  }
  // 3. ĐƠN GIÁ THEO BÓ / GÓI / HỘP
  else if (['bó', 'mớ', 'gói', 'hộp'].includes(standardUnit)) {
    if (['nhánh', 'cọng'].includes(unit)) {
      finalCost = (amount / 10) * price; // 1 nhánh bằng 1/10 bó
    } else {
      finalCost = amount * price;
    }
  } 
  else {
    finalCost = amount * price;
  }

  // Khống chế mức sàn tối thiểu hợp lý (300đ thay vì 1.000đ hay 3.000đ)
  finalCost = Math.max(300, Math.round(finalCost));

  return {
    name,
    cost: finalCost,
    estimated: !matchedPrice,
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