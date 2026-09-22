// src/lib/priceCalculator.js

// Bảng giá thị trường Việt Nam chuẩn (Fallback tức thì nếu DB chưa có giá)
const DEFAULT_PRICES = {
  'cua đồng': { price_per_unit: 180000, unit: 'kg' },
  'cua đồng xay': { price_per_unit: 180000, unit: 'kg' },
  'cua': { price_per_unit: 180000, unit: 'kg' },
  'thịt xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt heo xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt lợn xay': { price_per_unit: 140000, unit: 'kg' },
  'thịt heo': { price_per_unit: 140000, unit: 'kg' },
  'thịt ba chỉ': { price_per_unit: 150000, unit: 'kg' },
  'thịt bò': { price_per_unit: 280000, unit: 'kg' },
  'thịt gà': { price_per_unit: 90000, unit: 'kg' },
  'tôm sú': { price_per_unit: 240000, unit: 'kg' },
  'tôm': { price_per_unit: 200000, unit: 'kg' },
  'mực': { price_per_unit: 220000, unit: 'kg' },
  'cá hồi': { price_per_unit: 350000, unit: 'kg' },
  'cá': { price_per_unit: 80000, unit: 'kg' },
  'trứng gà': { price_per_unit: 3500, unit: 'quả' },
  'trứng vịt': { price_per_unit: 4000, unit: 'quả' },
  'trứng': { price_per_unit: 3500, unit: 'quả' },
  'đậu phụ': { price_per_unit: 4000, unit: 'miếng' },
  'đậu hũ': { price_per_unit: 4000, unit: 'miếng' },
  'cà chua': { price_per_unit: 25000, unit: 'kg' },
  'cà tím': { price_per_unit: 25000, unit: 'kg' },
  'hành tím': { price_per_unit: 50000, unit: 'kg' },
  'hành tím băm': { price_per_unit: 60000, unit: 'kg' },
  'hành lá': { price_per_unit: 30000, unit: 'kg' },
  'tỏi': { price_per_unit: 60000, unit: 'kg' },
  'mắm tôm': { price_per_unit: 30000, unit: 'chai' },
  'nước mắm': { price_per_unit: 45000, unit: 'chai' },
  'dầu ăn': { price_per_unit: 45000, unit: 'chai' },
  'bún tươi': { price_per_unit: 15000, unit: 'kg' },
  'rau muống': { price_per_unit: 12000, unit: 'bó' },
  'rau cải': { price_per_unit: 15000, unit: 'kg' },
};

/**
 * Chuẩn hóa tên nguyên liệu: loại bỏ số, dấu đặc biệt và khoảng trắng thừa
 */
export function normalizeIngredientName(rawName) {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/[0-9:.,/\\()\-]/g, ' ')
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

  const regex = /([\d.,]+)\s*(kilogram|kg|gam|gram|gr|g|lạng|quả|trái|củ|nhánh|cọng|tép|bó|mớ|miếng|hộp|chai|lít|lit|ml|thìa cà phê|muỗng cà phê|thìa canh|muỗng canh|thìa|muỗng|bát|chén|gói)?/i;
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
 * Tìm kiếm và khớp tên nguyên liệu thông minh (Fuzzy Search)
 */
function findMatchedPrice(cleanName, priceMap = {}) {
  // Gộp priceMap của Supabase với DEFAULT_PRICES
  const merged = { ...DEFAULT_PRICES, ...(priceMap || {}) };
  const keys = Object.keys(merged).sort((a, b) => b.length - a.length);

  // 1. Khớp nguyên chuỗi trực tiếp
  for (const key of keys) {
    const k = key.toLowerCase();
    if (cleanName === k || cleanName.includes(k) || k.includes(cleanName)) {
      return merged[key];
    }
  }

  // 2. Nhận diện các nhóm thực phẩm quan trọng nếu tên bị dài dòng
  if (cleanName.includes('cua')) return merged['cua đồng'] || { price_per_unit: 180000, unit: 'kg' };
  if (cleanName.includes('thịt xay') || cleanName.includes('thịt băm')) return merged['thịt xay'] || { price_per_unit: 140000, unit: 'kg' };
  if (cleanName.includes('thịt bò') || cleanName.includes('bắp bò')) return merged['thịt bò'] || { price_per_unit: 280000, unit: 'kg' };
  if (cleanName.includes('thịt heo') || cleanName.includes('thịt lợn') || cleanName.includes('ba chỉ')) return merged['thịt ba chỉ'] || { price_per_unit: 150000, unit: 'kg' };
  if (cleanName.includes('thịt gà') || cleanName.includes('gà')) return merged['thịt gà'] || { price_per_unit: 90000, unit: 'kg' };
  if (cleanName.includes('tôm')) return merged['tôm'] || { price_per_unit: 200000, unit: 'kg' };
  if (cleanName.includes('trứng')) return merged['trứng gà'] || { price_per_unit: 3500, unit: 'quả' };
  if (cleanName.includes('đậu') || cleanName.includes('tàu hũ')) return merged['đậu phụ'] || { price_per_unit: 4000, unit: 'miếng' };
  if (cleanName.includes('hành tím')) return merged['hành tím băm'] || { price_per_unit: 60000, unit: 'kg' };
  if (cleanName.includes('mắm tôm')) return merged['mắm tôm'] || { price_per_unit: 30000, unit: 'chai' };

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
  const isDrySeasoning = /(hạt nêm|bột ngọt|mì chính|muối|đường|tiêu|hạt tiêu|ớt bột|gia vị)/i.test(cleanName);

  // 1. Nếu hoàn toàn không xác định được giá trong từ điển
  if (!matchedPrice) {
    let cost = 2000;
    if (isLiquidSeasoning || isDrySeasoning) {
      cost = Math.round(amount * 500);
    } else if (unit.includes('cà phê')) {
      cost = Math.round(amount * 300);
    } else if (unit.includes('canh') || unit.includes('thìa') || unit.includes('muỗng')) {
      cost = Math.round(amount * 800);
    } else if (['g', 'gam', 'gr'].includes(unit)) {
      // Ước tính nguyên liệu chưa rõ loại ~ 60.000đ/kg
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

  // 2. Xử lý đơn vị gia vị thìa/muỗng
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
      // 1 thìa canh mắm/dầu ~ 1/30 chai
      finalCost = (amount / 30) * price;
    } else {
      finalCost = amount * 800;
    }
  } 
  // 3. Đơn vị chuẩn của từ điển là KG
  else if (standardUnit === 'kg') {
    if (['g', 'gam', 'gr', 'gram'].includes(unit)) {
      finalCost = (amount / 1000) * price;
    } else if (unit === 'lạng') {
      finalCost = (amount / 10) * price;
    } else if (unit === 'kg' || unit === 'kilogram') {
      finalCost = amount * price;
    } else if (['quả', 'trái'].includes(unit)) {
      let kgPerPiece = 0.1;
      if (cleanName.includes('cà tím')) kgPerPiece = 0.18;
      else if (cleanName.includes('ớt')) kgPerPiece = 0.005;
      else if (cleanName.includes('cà chua')) kgPerPiece = 0.1;
      finalCost = amount * kgPerPiece * price;
    } else if (['tép', 'nhánh', 'cọng'].includes(unit)) {
      finalCost = amount * 0.005 * price;
    } else if (unit === 'củ') {
      finalCost = amount * 0.015 * price;
    } else {
      // Nếu số lượng >= 10 mà không ghi đơn vị, suy đoán là gram (VD: 350 -> 350g)
      if (amount >= 10) {
        finalCost = (amount / 1000) * price;
      } else {
        finalCost = amount * 0.05 * price;
      }
    }
  } 
  // 4. Đơn vị chuẩn là Quả / Trái / Miếng
  else if (['quả', 'trái', 'miếng'].includes(standardUnit)) {
    finalCost = amount * price;
  }
  // 5. Đơn vị chuẩn là Chai / Hộp / Lọ
  else if (['chai', 'lọ', 'hộp', 'gói'].includes(standardUnit)) {
    if (unit.includes('thìa') || unit.includes('muỗng')) {
      finalCost = (amount / 30) * price;
    } else {
      finalCost = amount * price;
    }
  } else {
    finalCost = amount * price;
  }

  // Khống chế làm tròn
  finalCost = Math.max(300, Math.round(finalCost));

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
  if (!recipe?.ingredients || !Array.isArray(recipe.ingredients)) {
    return 0;
  }

  const baseServings = recipe.base_servings || recipe.baseServings || 2;
  const itemsCost = recipe.ingredients.map((ing) =>
    calculateIngredientCost(ing, priceMap, baseServings, servings)
  );

  return itemsCost.reduce((sum, item) => sum + item.cost, 0);
}