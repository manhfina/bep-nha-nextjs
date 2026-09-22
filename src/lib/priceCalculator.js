// src/lib/priceCalculator.js

// Bảng giá thị trường chuẩn Việt Nam
const DEFAULT_PRICES = {
  // Nhóm thịt & hải sản
  'thịt bò': { price_per_unit: 280000, unit: 'kg' },
  'bắp bò': { price_per_unit: 300000, unit: 'kg' },
  'thịt xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt heo xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt lợn xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt heo': { price_per_unit: 140000, unit: 'kg' },
  'thịt ba chỉ': { price_per_unit: 150000, unit: 'kg' },
  'thịt gà': { price_per_unit: 90000, unit: 'kg' },
  'cua đồng xay': { price_per_unit: 180000, unit: 'kg' },
  'cua đồng': { price_per_unit: 180000, unit: 'kg' },
  'tôm': { price_per_unit: 200000, unit: 'kg' },
  'mực': { price_per_unit: 220000, unit: 'kg' },
  'cá': { price_per_unit: 80000, unit: 'kg' },

  // Nhóm trứng & đậu
  'trứng gà': { price_per_unit: 3500, unit: 'quả' },
  'trứng vịt': { price_per_unit: 4000, unit: 'quả' },
  'trứng': { price_per_unit: 3500, unit: 'quả' },
  'đậu phụ': { price_per_unit: 4000, unit: 'miếng' },
  'đậu hũ': { price_per_unit: 4000, unit: 'miếng' },

  // Nhóm rau xanh (tính theo kg hoặc bó)
  'rau cải': { price_per_unit: 22000, unit: 'kg' },
  'cải ngọt': { price_per_unit: 22000, unit: 'kg' },
  'cải thìa': { price_per_unit: 22000, unit: 'kg' },
  'cải ngồng': { price_per_unit: 25000, unit: 'kg' },
  'cải cúc': { price_per_unit: 25000, unit: 'kg' },
  'cải thảo': { price_per_unit: 20000, unit: 'kg' },
  'bắp cải': { price_per_unit: 18000, unit: 'kg' },
  'rau muống': { price_per_unit: 20000, unit: 'kg' },
  'rau mồng tơi': { price_per_unit: 20000, unit: 'kg' },
  'rau ngót': { price_per_unit: 25000, unit: 'kg' },
  'rau đay': { price_per_unit: 20000, unit: 'kg' },
  'xà lách': { price_per_unit: 30000, unit: 'kg' },
  'giá đỗ': { price_per_unit: 20000, unit: 'kg' },

  // Nhóm củ quả
  'cà rốt': { price_per_unit: 25000, unit: 'kg' },
  'hành tây': { price_per_unit: 25000, unit: 'kg' },
  'khoai tây': { price_per_unit: 25000, unit: 'kg' },
  'cà chua': { price_per_unit: 25000, unit: 'kg' },
  'cà tím': { price_per_unit: 25000, unit: 'kg' },
  'dưa chuột': { price_per_unit: 20000, unit: 'kg' },
  'dưa leo': { price_per_unit: 20000, unit: 'kg' },
  'bí đỏ': { price_per_unit: 20000, unit: 'kg' },
  'bí xanh': { price_per_unit: 20000, unit: 'kg' },

  // Nhóm gia vị & hành tỏi
  'hành tím băm': { price_per_unit: 60000, unit: 'kg' },
  'hành tím': { price_per_unit: 50000, unit: 'kg' },
  'hành khô': { price_per_unit: 50000, unit: 'kg' },
  'hành lá': { price_per_unit: 35000, unit: 'kg' },
  'tỏi': { price_per_unit: 60000, unit: 'kg' },
  'gừng': { price_per_unit: 40000, unit: 'kg' },
  'ớt': { price_per_unit: 60000, unit: 'kg' },
  'mắm tôm': { price_per_unit: 30000, unit: 'chai' },
  'nước mắm': { price_per_unit: 45000, unit: 'chai' },
  'dầu ăn': { price_per_unit: 45000, unit: 'chai' },
  'dầu hào': { price_per_unit: 35000, unit: 'chai' },

  // Tinh bột & mì
  'bún tươi': { price_per_unit: 15000, unit: 'kg' },
  'phở tươi': { price_per_unit: 18000, unit: 'kg' },
  'mì': { price_per_unit: 3500, unit: 'vắt' },
  'mì trứng': { price_per_unit: 4000, unit: 'vắt' },
  'mì tôm': { price_per_unit: 4500, unit: 'gói' },
};

export function normalizeIngredientName(rawName) {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/[0-9:.,/\\()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  const regex = /([\d.,]+)\s*(kilogram|kg|gam|gram|gr|g|lạng|quả|trái|củ|nhánh|cọng|tép|bó|mớ|miếng|hộp|chai|lít|lit|ml|thìa cà phê|muỗng cà phê|thìa canh|muỗng canh|thìa|muỗng|bát|chén|vắt|gói|ít|chút|nhúm)?/i;
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

function findMatchedPrice(cleanName, priceMap = {}) {
  // 1. Chặn ngay nhóm "Gia vị tổng hợp" để không bao giờ bị ăn theo cả chai nước mắm/dầu hào
  if (
    cleanName.startsWith('gia vị') ||
    cleanName.includes('gia vị thông dụng') ||
    cleanName.includes('nêm nếm') ||
    (cleanName.includes('muối') && cleanName.includes('đường'))
  ) {
    return { name: 'gia vị thông dụng', price_per_unit: 500, unit: 'phần', isGeneralSeasoning: true };
  }

  const merged = { ...DEFAULT_PRICES, ...(priceMap || {}) };
  const keys = Object.keys(merged).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const k = key.toLowerCase();
    if (cleanName === k || cleanName.includes(k) || k.includes(cleanName)) {
      return merged[key];
    }
  }

  if (cleanName.includes('cải') || cleanName.includes('rau')) return merged['cải ngọt'] || { price_per_unit: 22000, unit: 'kg' };
  if (cleanName.includes('nấm')) return { price_per_unit: 60000, unit: 'kg' };
  if (cleanName.includes('hành tây')) return merged['hành tây'];
  if (cleanName.includes('cà rốt')) return merged['cà rốt'];
  if (cleanName.includes('khoai')) return merged['khoai tây'];
  if (cleanName.includes('bò')) return merged['thịt bò'];
  if (cleanName.includes('thịt xay') || cleanName.includes('thịt băm')) return merged['thịt xay'];
  if (cleanName.includes('heo') || cleanName.includes('lợn') || cleanName.includes('thịt')) return merged['thịt heo'];
  if (cleanName.includes('gà')) return merged['thịt gà'];
  if (cleanName.includes('cua')) return merged['cua đồng'];
  if (cleanName.includes('tôm')) return merged['tôm'];
  if (cleanName.includes('cá')) return merged['cá'];
  if (cleanName.includes('mì')) return merged['mì'];

  return null;
}

export function calculateIngredientCost(ing, priceMap = {}, baseServings = 2, currentServings = 2) {
  let name = typeof ing === 'string' ? ing : (ing?.name || '');
  const cleanName = normalizeIngredientName(name);
  const { amount, unit } = parseIngredientAmount(ing, baseServings, currentServings);

  // Xử lý đơn vị định tính nhỏ ("ít", "chút", "nhúm") hoặc nhóm gia vị tổng hợp
  const isSmallUnit = ['ít', 'chút', 'nhúm', 'vừa đủ'].includes(unit);
  const matchedPrice = findMatchedPrice(cleanName, priceMap);

  if (matchedPrice?.isGeneralSeasoning || isSmallUnit) {
    // Gia vị nêm nếm: tính tượng trưng 500đ/phần cho mỗi người ăn
    return {
      name,
      cost: Math.max(500, Math.round(currentServings * 500)),
      estimated: false,
    };
  }

  const isLiquidSeasoning = /(dầu hào|dầu mè|nước tương|xì dầu|nước mắm|mắm|dầu ăn|mỡ heo|mỡ lợn|giấm|tương ớt|tương cà)/i.test(cleanName);
  const isDrySeasoning = /(hạt nêm|bột ngọt|mì chính|muối|đường|tiêu|hạt tiêu|ớt bột|gia vị)/i.test(cleanName);

  if (!matchedPrice) {
    let cost = 3000;
    if (isLiquidSeasoning || isDrySeasoning) {
      cost = Math.round(amount * 500);
    } else if (unit.includes('cà phê')) {
      cost = Math.round(amount * 300);
    } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
      cost = Math.round(amount * 800);
    } else if (['bó', 'mớ'].includes(unit)) {
      cost = Math.round(amount * 8000);
    } else if (['g', 'gam', 'gr'].includes(unit)) {
      cost = Math.round((amount / 1000) * 60000);
    }
    return {
      name,
      cost: Math.max(500, cost),
      estimated: true,
    };
  }

  const standardUnit = (matchedPrice.unit || 'kg').toLowerCase().trim();
  const price = Number(matchedPrice.price_per_unit) || 0;
  let finalCost = 0;

  // 1. Gia vị thìa/muỗng
  if (unit.includes('cà phê')) {
    if (standardUnit === 'kg' || standardUnit === 'lít' || standardUnit === 'chai') {
      finalCost = amount * 0.005 * price;
    } else {
      finalCost = amount * 300;
    }
  } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
    if (standardUnit === 'kg' || standardUnit === 'lít') {
      finalCost = amount * 0.015 * price;
    } else if (standardUnit === 'chai' || standardUnit === 'hộp' || standardUnit === 'lọ') {
      finalCost = (amount / 30) * price;
    } else {
      finalCost = amount * 800;
    }
  } 
  // 2. Đơn vị chuẩn từ điển là KG
  else if (standardUnit === 'kg') {
    if (['g', 'gam', 'gr', 'gram'].includes(unit)) {
      finalCost = (amount / 1000) * price;
    } else if (unit === 'lạng') {
      finalCost = (amount / 10) * price;
    } else if (unit === 'kg' || unit === 'kilogram') {
      finalCost = amount * price;
    } else if (['bó', 'mớ'].includes(unit)) {
      finalCost = amount * 0.38 * price;
    } else if (unit === 'củ') {
      let kgPerRoot = 0.15;
      if (/(hành tím|tỏi|hành khô|gừng)/i.test(cleanName)) kgPerRoot = 0.015;
      finalCost = amount * kgPerRoot * price;
    } else if (['quả', 'trái'].includes(unit)) {
      let kgPerPiece = 0.12;
      if (cleanName.includes('cà tím')) kgPerPiece = 0.18;
      else if (cleanName.includes('ớt')) kgPerPiece = 0.005;
      else if (cleanName.includes('cà chua')) kgPerPiece = 0.1;
      finalCost = amount * kgPerPiece * price;
    } else if (['tép', 'nhánh', 'cọng'].includes(unit)) {
      finalCost = amount * 0.005 * price;
    } else {
      if (amount >= 10) {
        finalCost = (amount / 1000) * price;
      } else {
        finalCost = amount * 0.05 * price;
      }
    }
  } 
  // 3. Đơn vị đếm chiếc/vắt/quả
  else if (['quả', 'trái', 'miếng', 'vắt'].includes(standardUnit)) {
    finalCost = amount * price;
  } else if (['chai', 'lọ', 'hộp', 'gói'].includes(standardUnit)) {
    if (unit.includes('thìa') || unit.includes('muỗng')) {
      finalCost = (amount / 30) * price;
    } else {
      finalCost = amount * price;
    }
  } else {
    finalCost = amount * price;
  }

  finalCost = Math.max(300, Math.round(finalCost));

  return {
    name,
    cost: finalCost,
    estimated: false,
  };
}

export function calculateRecipeTotalCost(recipe, priceMap = {}, servings = 2) {
  if (!recipe?.ingredients || !Array.isArray(recipe.ingredients)) {
    return 0;
  }

  const baseServings = recipe.base_servings || recipe.baseServings || 2;
  const itemsCost = recipe.ingredients.map((ing) =>
    calculateIngredientCost(ing, priceMap, baseServings, servings)
  );

  return itemsCost.reduce((sum, item) => sum + item.cost, 0);
}