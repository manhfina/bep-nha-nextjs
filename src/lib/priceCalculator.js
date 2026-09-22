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

  // 1. Khớp chuỗi trực tiếp
  for (const key of keys) {
    if (cleanName.includes(key.toLowerCase())) {
      return priceMap[key];
    }
  }

  // 2. Nhận diện các bí danh (aliases) gia vị & rau thơm phổ biến
  const aliases = [
    { pattern: /(hành mùi|hành hoa|ngò rí|rau mùi|rau ngò|hành ngò)/i, target: 'hành lá' },
    { pattern: /(hành tím băm|hành tím|hành khô)/i, target: 'hành tím' },
    { pattern: /(tỏi băm|tỏi củ|tỏi)/i, target: 'tỏi' },
    { pattern: /(dầu hào|dầu mỡ|dầu ăn|dầu mè)/i, target: 'dầu hào' },
    { pattern: /(tiêu xay|bột tiêu|hạt tiêu)/i, target: 'tiêu' },
    { pattern: /(nước tương|xì dầu)/i, target: 'nước tương' },
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

  // Phân loại nhóm gia vị lỏng, sốt, hạt nêm nếm
  const isLiquidSeasoning = /(dầu hào|dầu mè|nước tương|xì dầu|nước mắm|mắm|dầu ăn|giấm|tương ớt|tương cà)/i.test(cleanName);
  const isDrySeasoning = /(hạt nêm|bột ngọt|mì chính|muối|đường|tiêu|hạt tiêu|ớt bột)/i.test(cleanName);

  // 1. Nếu không tìm thấy trong từ điển giá: Ước lượng thông minh
  if (!matchedPrice) {
    let cost = 1000;
    if (unit.includes('cà phê')) {
      cost = Math.round(amount * 200); // 1 thìa cà phê ~ 200đ
    } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
      cost = Math.round(amount * 500); // 1 thìa canh dầu hào / nước mắm ~ 500đ
    } else if (unit === 'tép') {
      cost = Math.round(amount * 200); // 1 tép tỏi ~ 200đ
    } else if (['nhánh', 'cọng'].includes(unit)) {
      cost = Math.round(amount * 300); // 1 nhánh hành ~ 300đ
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

  // 2. Xử lý các đơn vị đo thìa / muỗng gia vị (Dầu hào, nước mắm, xì dầu...)
  if (unit.includes('cà phê')) {
    // 1 thìa cà phê khoảng 3g - 5g (hoặc 5ml)
    if (standardUnit === 'kg' || standardUnit === 'lít' || standardUnit === 'chai') {
      finalCost = amount * 0.005 * price;
    } else {
      finalCost = amount * 250;
    }
  } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
    // 1 thìa canh khoảng 10g - 12g (hoặc 10ml)
    if (standardUnit === 'kg' || standardUnit === 'lít') {
      finalCost = amount * 0.012 * price;
    } else if (standardUnit === 'chai' || standardUnit === 'hộp') {
      // 1 chai dầu hào ~350g, 1 thìa canh chiếm khoảng 1/30 chai
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
    // Tép (Tỏi): 1 tép tỏi chỉ khoảng 2.5g - 3g (0.0025 kg)
    else if (unit === 'tép') {
      finalCost = amount * 0.0025 * price;
    }
    // Nhánh / Cọng (Hành lá, rau mùi, thì là): ~6g (0.006 kg)
    else if (['nhánh', 'cọng'].includes(unit)) {
      finalCost = amount * 0.006 * price;
    }
    // Củ (Hành tím, tỏi củ, hành tây, gừng):
    else if (unit === 'củ') {
      const isSmall = /(hành tím|tỏi|hành khô|gừng)/i.test(cleanName);
      const kgPerRoot = isSmall ? 0.012 : 0.12; 
      finalCost = amount * kgPerRoot * price;
    } 
    // Quả / Trái (Cà chua, dưa chuột...)
    else if (['quả', 'trái'].includes(unit)) {
      const kgPerPiece = /(ớt|chanh|quất|tắc)/i.test(cleanName) ? 0.015 : 0.1;
      finalCost = amount * kgPerPiece * price;
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
  // 4. Đơn vị chuẩn là Quả / Trái (Trứng gà, quả dừa...)
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

  // Khống chế mức sàn tối thiểu: 300đ (cho gia vị ít)
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