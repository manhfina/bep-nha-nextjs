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

  let text = '';
  if (typeof ing === 'string') {
    text = ing;
  } else if (typeof ing === 'object' && ing !== null) {
    text = `${ing.name || ''} ${ing.unit || ''} ${ing.amount || ''}`;
  }

  const regex = /([\d.,]+)\s*(kilogram|kg|gam|gram|gr|g|lạng|quả|trái|củ|nhánh|cọng|tép|bó|mớ|miếng|hộp|chai|lít|lit|ml|thìa cà phê|muỗng cà phê|thìa canh|muỗng canh|thìa|muỗng|bát|chén)?/i;
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
 * Tìm kiếm và khớp tên nguyên liệu với bảng giá
 */
function findMatchedPrice(cleanName, priceMap = {}) {
  const keys = Object.keys(priceMap || {}).sort((a, b) => b.length - a.length);

  // 1. Khớp từ khóa cụ thể trước (ưu tiên cà tím trước cà chua)
  if (cleanName.includes('cà tím')) {
    const caTimKey = keys.find((k) => k.toLowerCase() === 'cà tím');
    if (caTimKey) return priceMap[caTimKey];
    return { name: 'cà tím', price_per_unit: 22000, unit: 'kg' };
  }

  // 2. Khớp chuỗi trực tiếp
  for (const key of keys) {
    if (cleanName.includes(key.toLowerCase())) {
      return priceMap[key];
    }
  }

  // 3. Khớp các bí danh gia vị & rau củ
  const aliases = [
    { pattern: /(hành mùi|hành hoa|ngò rí|rau mùi|rau ngò|hành ngò)/i, target: 'hành lá' },
    { pattern: /(hành tím băm|hành tím|hành khô)/i, target: 'hành tím' },
    { pattern: /(tỏi băm|tỏi củ|tỏi)/i, target: 'tỏi' },
    { pattern: /(ớt cay|ớt hiểm|ớt sừng|ớt)/i, target: 'ớt' },
    { pattern: /(dầu hào|dầu mỡ|dầu mè)/i, target: 'dầu hào' },
    { pattern: /(tiêu xay|bột tiêu|hạt tiêu)/i, target: 'tiêu' },
    { pattern: /(nước tương|xì dầu)/i, target: 'nước tương' },
    { pattern: /(mỡ heo|mỡ lợn|dầu ăn)/i, target: 'dầu ăn' },
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

  const isLiquidSeasoning = /(dầu hào|dầu mè|nước tương|xì dầu|nước mắm|mắm|dầu ăn|mỡ heo|mỡ lợn|giấm|tương ớt|tương cà)/i.test(cleanName);
  const isDrySeasoning = /(hạt nêm|bột ngọt|mì chính|muối|đường|tiêu|hạt tiêu|ớt bột)/i.test(cleanName);

  // 1. Trường hợp không tìm thấy giá trong từ điển
  if (!matchedPrice) {
    let cost = 1000;
    if (cleanName.includes('cà tím')) {
      // 1 quả cà tím dài ~180g -> ~4.000đ/trái
      cost = Math.round(amount * 4000);
    } else if (/(ớt|ớt cay|ớt hiểm)/i.test(cleanName)) {
      cost = Math.round(amount * 300); // 1 trái ớt ~ 300đ
    } else if (unit.includes('cà phê')) {
      cost = Math.round(amount * 200);
    } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
      cost = Math.round(amount * 500);
    } else if (unit === 'tép') {
      cost = Math.round(amount * 200);
    } else if (['nhánh', 'cọng'].includes(unit)) {
      cost = Math.round(amount * 300);
    } else if (isLiquidSeasoning || isDrySeasoning) {
      cost = Math.round(amount * 400);
    }
    return {
      name,
      cost: Math.max(300, cost),
      estimated: true,
    };
  }

  const standardUnit = (matchedPrice.unit || 'kg').toLowerCase().trim();
  const price = Number(matchedPrice.price_per_unit) || 0;
  let finalCost = 0;

  // 2. Xử lý thìa / muỗng gia vị
  if (unit.includes('cà phê')) {
    if (standardUnit === 'kg' || standardUnit === 'lít' || standardUnit === 'chai') {
      finalCost = amount * 0.005 * price;
    } else {
      finalCost = amount * 250;
    }
  } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
    if (standardUnit === 'kg' || standardUnit === 'lít') {
      finalCost = amount * 0.012 * price;
    } else if (standardUnit === 'chai' || standardUnit === 'hộp') {
      finalCost = (amount / 30) * price;
    } else {
      finalCost = amount * 500;
    }
  } 
  // 3. Đơn vị chuẩn là "KG"
  else if (standardUnit === 'kg') {
    if (['g', 'gam', 'gr', 'gram'].includes(unit)) {
      finalCost = (amount / 1000) * price;
    } else if (unit === 'lạng') {
      finalCost = (amount / 10) * price;
    } else if (unit === 'kg' || unit === 'kilogram') {
      finalCost = amount * price;
    } 
    // Trái / Quả
    else if (['quả', 'trái'].includes(unit)) {
      let kgPerPiece = 0.1; // Mặc định quả vừa ~100g

      if (cleanName.includes('cà tím')) {
        kgPerPiece = 0.18; // 1 quả cà tím dài ~180g (0.18 kg)
      } else if (/(ớt|ớt cay|ớt hiểm)/i.test(cleanName)) {
        kgPerPiece = 0.003; // 1 quả ớt cay chỉ ~3g (0.003 kg)
      } else if (/(chanh|quất|tắc)/i.test(cleanName)) {
        kgPerPiece = 0.02; // 1 quả chanh ~20g
      } else if (cleanName.includes('cà chua')) {
        kgPerPiece = 0.1; // 1 quả cà chua ~100g
      } else if (cleanName.includes('dưa chuột') || cleanName.includes('dưa leo')) {
        kgPerPiece = 0.13;
      }

      finalCost = amount * kgPerPiece * price;
    }
    // Tép (Tỏi): ~2.5g (0.0025 kg)
    else if (unit === 'tép') {
      finalCost = amount * 0.0025 * price;
    }
    // Nhánh / Cọng: ~6g (0.006 kg)
    else if (['nhánh', 'cọng'].includes(unit)) {
      finalCost = amount * 0.006 * price;
    }
    // Củ:
    else if (unit === 'củ') {
      const isSmall = /(hành tím|tỏi|hành khô|gừng)/i.test(cleanName);
      const kgPerRoot = isSmall ? 0.012 : 0.12; 
      finalCost = amount * kgPerRoot * price;
    } 
    // Bó / Mớ
    else if (['bó', 'mớ'].includes(unit)) {
      finalCost = amount * 0.25 * price;
    } 
    else {
      if (amount >= 10) {
        finalCost = (amount / 1000) * price;
      } else {
        finalCost = amount * 0.05 * price;
      }
    }
  } 
  // 4. Đơn vị chuẩn là Quả / Trái
  else if (['quả', 'trái'].includes(standardUnit)) {
    finalCost = amount * price;
  }
  // 5. Đơn vị chuẩn là Chai / Hộp / Gói
  else if (['chai', 'lọ', 'hộp', 'gói'].includes(standardUnit)) {
    if (unit.includes('thìa') || unit.includes('muỗng')) {
      finalCost = (amount / 30) * price;
    } else {
      finalCost = amount * price;
    }
  } 
  else {
    finalCost = amount * price;
  }

  // Khống chế mức sàn tối thiểu: 300đ
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