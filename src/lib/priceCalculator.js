// src/lib/priceCalculator.js

// Bảng giá thị trường chuẩn Việt Nam
const DEFAULT_PRICES = {
  // Nhóm thịt & hải sản (đơn vị chuẩn: kg)
  'thịt bò': { price_per_unit: 280000, unit: 'kg' },
  'bắp bò': { price_per_unit: 300000, unit: 'kg' },
  'thịt xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt heo xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt lợn xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt heo': { price_per_unit: 140000, unit: 'kg' },
  'thịt ba chỉ': { price_per_unit: 150000, unit: 'kg' },
  'thịt vịt': { price_per_unit: 95000, unit: 'kg' },
  'vịt': { price_per_unit: 95000, unit: 'kg' },
  'thịt gà ta': { price_per_unit: 140000, unit: 'kg' },
  'gà ta': { price_per_unit: 140000, unit: 'kg' },
  'thịt gà': { price_per_unit: 95000, unit: 'kg' },
  'ức gà': { price_per_unit: 85000, unit: 'kg' },
  'cua đồng xay': { price_per_unit: 180000, unit: 'kg' },
  'cua đồng': { price_per_unit: 180000, unit: 'kg' },
  'tôm': { price_per_unit: 200000, unit: 'kg' },
  'mực': { price_per_unit: 220000, unit: 'kg' },
  'cá': { price_per_unit: 90000, unit: 'kg' },
  'cá lóc': { price_per_unit: 110000, unit: 'kg' },

  // Nhóm dừa & quả đặc thù
  'nước dừa tươi': { price_per_unit: 20000, unit: 'quả' },
  'nước dừa': { price_per_unit: 20000, unit: 'quả' },
  'dừa tươi': { price_per_unit: 20000, unit: 'quả' },
  'dừa': { price_per_unit: 20000, unit: 'quả' },

  // Nhóm trứng & đậu
  'trứng gà': { price_per_unit: 3500, unit: 'quả' },
  'trứng vịt': { price_per_unit: 4000, unit: 'quả' },
  'trứng': { price_per_unit: 3500, unit: 'quả' },
  'đậu phụ': { price_per_unit: 4000, unit: 'miếng' },
  'đậu hũ': { price_per_unit: 4000, unit: 'miếng' },

  // Nhóm rau thơm, lá lẩu & nấm
  'lá é': { price_per_unit: 50000, unit: 'kg' },
  'măng củ': { price_per_unit: 35000, unit: 'kg' },
  'măng tươi': { price_per_unit: 35000, unit: 'kg' },
  'măng chua': { price_per_unit: 30000, unit: 'kg' },
  'măng': { price_per_unit: 35000, unit: 'kg' },
  'nấm bào ngư': { price_per_unit: 60000, unit: 'kg' },
  'nấm đùi gà': { price_per_unit: 65000, unit: 'kg' },
  'nấm rơm': { price_per_unit: 90000, unit: 'kg' },
  'nấm kim châm': { price_per_unit: 12000, unit: 'gói' },
  'nấm': { price_per_unit: 60000, unit: 'kg' },

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

  // Nhóm gia vị & hành tỏi sả
  'sả': { price_per_unit: 2000, unit: 'cây' },
  'hành tỏi băm': { price_per_unit: 60000, unit: 'kg' },
  'hành tím băm': { price_per_unit: 60000, unit: 'kg' },
  'hành tím': { price_per_unit: 50000, unit: 'kg' },
  'hành khô': { price_per_unit: 50000, unit: 'kg' },
  'hành lá': { price_per_unit: 35000, unit: 'kg' },
  'tỏi băm': { price_per_unit: 60000, unit: 'kg' },
  'tỏi': { price_per_unit: 60000, unit: 'kg' },
  'gừng': { price_per_unit: 40000, unit: 'kg' },
  'ớt xiêm xanh': { price_per_unit: 70000, unit: 'kg' },
  'ớt hiểm': { price_per_unit: 60000, unit: 'kg' },
  'ớt': { price_per_unit: 60000, unit: 'kg' },
  'nước màu thốt nốt': { price_per_unit: 70000, unit: 'lít' },
  'nước màu': { price_per_unit: 60000, unit: 'lít' },
  'nước hàng': { price_per_unit: 60000, unit: 'lít' },
  'ngũ vị hương': { price_per_unit: 4000, unit: 'gói' },
  'dầu màu điều': { price_per_unit: 40000, unit: 'lít' },
  'mắm tôm': { price_per_unit: 30000, unit: 'chai' },
  'nước mắm': { price_per_unit: 45000, unit: 'lít' },
  'dầu ăn': { price_per_unit: 45000, unit: 'lít' },
  'dầu hào': { price_per_unit: 50000, unit: 'lít' },
  'đường': { price_per_unit: 25000, unit: 'kg' },
  'muối': { price_per_unit: 10000, unit: 'kg' },
  'hạt nêm': { price_per_unit: 40000, unit: 'kg' },
  'bột ngọt': { price_per_unit: 45000, unit: 'kg' },
  'mì chính': { price_per_unit: 45000, unit: 'kg' },
  'tiêu': { price_per_unit: 160000, unit: 'kg' },

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

  const regex = /([\d.,]+)\s*(kilogram|kg|gam|gram|gr|g|lạng|quả|trái|củ|cây|nhánh|cọng|tép|bó|mớ|miếng|hộp|chai|lít|lit|ml|thìa cà phê|muỗng cà phê|thìa canh|muỗng canh|thìa|muỗng|bát|chén|vắt|gói|ít|chút|nhúm|khẩu phần)?/i;
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
  // 1. Chặn nhóm "Gia vị tổng hợp"
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

  // 2. Fallback tìm kiếm thông minh theo danh mục lớn
  if (cleanName.includes('dừa')) return merged['nước dừa tươi'];
  if (cleanName.includes('nước màu') || cleanName.includes('nước hàng')) return merged['nước màu'];
  if (cleanName.includes('hành tím') || cleanName.includes('hành khô')) return merged['hành tím'];
  if (cleanName.includes('hành lá')) return merged['hành lá'];
  if (cleanName.includes('tỏi')) return merged['tỏi'];
  if (cleanName.includes('vịt')) return merged['thịt vịt'];
  if (cleanName.includes('gà ta')) return merged['thịt gà ta'];
  if (cleanName.includes('gà')) return merged['thịt gà'];
  if (cleanName.includes('nước mắm') || cleanName.includes('mắm')) return merged['nước mắm'];
  if (cleanName.includes('đường')) return merged['đường'];
  if (cleanName.includes('muối')) return merged['muối'];
  if (cleanName.includes('hạt nêm') || cleanName.includes('nêm')) return merged['hạt nêm'];
  if (cleanName.includes('lá é')) return merged['lá é'];
  if (cleanName.includes('măng')) return merged['măng củ'];
  if (cleanName.includes('sả')) return merged['sả'];
  if (cleanName.includes('nấm')) return merged['nấm'];
  if (cleanName.includes('cải') || cleanName.includes('rau')) return merged['cải ngọt'] || { price_per_unit: 22000, unit: 'kg' };
  if (cleanName.includes('hành tây')) return merged['hành tây'];
  if (cleanName.includes('cà rốt')) return merged['cà rốt'];
  if (cleanName.includes('khoai')) return merged['khoai tây'];
  if (cleanName.includes('bò')) return merged['thịt bò'];
  if (cleanName.includes('thịt xay') || cleanName.includes('thịt băm')) return merged['thịt xay'];
  if (cleanName.includes('heo') || cleanName.includes('lợn') || cleanName.includes('thịt')) return merged['thịt heo'];
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

  const isSmallUnit = ['ít', 'chút', 'nhúm', 'vừa đủ', 'khẩu phần'].includes(unit);
  const matchedPrice = findMatchedPrice(cleanName, priceMap);

  if (matchedPrice?.isGeneralSeasoning || isSmallUnit) {
    return {
      name,
      cost: Math.max(500, Math.round(currentServings * 500)),
      estimated: false,
    };
  }

  // Nếu hoàn toàn không match được giá
  if (!matchedPrice) {
    let cost = 2000;
    if (/(dầu hào|nước tương|xì dầu|nước mắm|mắm|dầu ăn|giấm|nước màu)/i.test(cleanName)) {
      cost = Math.round(amount * 500);
    } else if (/(hạt nêm|bột ngọt|muối|đường|tiêu)/i.test(cleanName)) {
      cost = Math.round(amount * 300);
    } else if (['g', 'gam', 'gr', 'ml'].includes(unit)) {
      cost = Math.round((amount / 1000) * 35000);
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

  // ==========================================
  // XỬ LÝ CHUẨN HÓA ĐƠN VỊ TÍNH TIỀN THỰC TẾ
  // ==========================================

  // 1. Nếu nguyên liệu được nhập dạng THỂ TÍCH (ml)
  if (unit === 'ml') {
    if (cleanName.includes('dừa')) {
      // 1 quả dừa xiêm trung bình ~400ml nước dừa
      finalCost = (amount / 400) * price;
    } else if (standardUnit === 'lít' || standardUnit === 'chai' || standardUnit === 'kg') {
      finalCost = (amount / 1000) * price;
    } else {
      finalCost = (amount / 1000) * price;
    }
  }
  // 2. Nếu đơn vị nhập dạng KHỐI LƯỢNG (g, gram, gr)
  else if (['g', 'gam', 'gr', 'gram'].includes(unit)) {
    if (standardUnit === 'kg' || standardUnit === 'lít') {
      finalCost = (amount / 1000) * price;
    } else if (['gói', 'hộp', 'chai'].includes(standardUnit)) {
      const defaultPackWeight = cleanName.includes('ngũ vị') ? 5 : 500;
      finalCost = (amount / defaultPackWeight) * price;
    } else {
      finalCost = (amount / 1000) * price;
    }
  }
  // 3. Nếu đơn vị là THÌA / MUỖNG
  else if (unit.includes('cà phê')) {
    finalCost = amount * 300;
  } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
    if (cleanName.includes('nước màu') || cleanName.includes('dầu hào') || cleanName.includes('mắm')) {
      finalCost = amount * 1500;
    } else {
      finalCost = amount * 800;
    }
  }
  // 4. Nếu đơn vị là LẠNG (1 lạng = 100g = 0.1 kg)
  else if (unit === 'lạng') {
    finalCost = (amount / 10) * price;
  }
  // 5. Nếu đơn vị là LÍT hoặc KG
  else if (['lít', 'lit', 'kg', 'kilogram'].includes(unit)) {
    finalCost = amount * price;
  }
  // 6. Nếu đơn vị là ĐƠN VỊ ĐẾM (quả, trái, củ, cây, nhánh, tép, vắt, miếng, gói, bó, mớ...)
  else if (['quả', 'trái', 'miếng', 'vắt', 'cây', 'gói', 'bó', 'mớ', 'chai', 'hộp', 'củ', 'nhánh', 'tép', 'cọng'].includes(unit)) {
    if (standardUnit === 'kg') {
      let kgFactor = 0.1; // Mặc định 1 củ/quả vừa ~ 100g

      if (unit === 'bó' || unit === 'mớ') {
        kgFactor = 0.35;
      } else if (/(hành tím|tỏi|hành khô|gừng|riềng)/i.test(cleanName) || ['củ', 'tép'].includes(unit)) {
        kgFactor = 0.015; // 1 củ hành, củ tỏi, nhánh gừng ~ 15g (0.015 kg -> ~750đ - 900đ)
      } else if (['nhánh', 'cọng'].includes(unit) || cleanName.includes('hành lá')) {
        kgFactor = 0.01; // 1 nhánh hành lá ~ 10g (0.01 kg -> ~350đ)
      } else if (cleanName.includes('ớt')) {
        kgFactor = 0.005; // 1 trái ớt ~ 5g (~300đ)
      } else if (cleanName.includes('cà chua')) {
        kgFactor = 0.1;
      } else if (cleanName.includes('khoai') || cleanName.includes('cà rốt')) {
        kgFactor = 0.15;
      }
      finalCost = amount * kgFactor * price;
    } else {
      finalCost = amount * price;
    }
  }
  // 7. Fallback an toàn
  else {
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