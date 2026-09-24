// src/lib/groceryAggregator.js
import { normalizeIngredientName, parseIngredientAmount, calculateIngredientCost } from './priceCalculator';

// Quy tắc nhóm nguyên liệu về 1 tên chuẩn
const CANONICAL_GROUPS = [
  { key: 'thịt heo xay', aliases: ['thịt xay', 'thịt heo xay', 'thịt lợn xay', 'thịt băm'] },
  { key: 'thịt ba chỉ', aliases: ['ba chỉ', 'thịt ba chỉ', 'thịt ba rọi'] },
  { key: 'thịt bò', aliases: ['thịt bò', 'bắp bò', 'nạm bò', 'thăn bò'] },
  { key: 'thịt gà', aliases: ['thịt gà', 'ức gà', 'đùi gà', 'cánh gà', 'gà ta'] },
  { key: 'thịt vịt', aliases: ['thịt vịt', 'vịt'] },
  { key: 'cá lóc', aliases: ['cá lóc', 'cá quả', 'cá chuối'] },
  { key: 'cua đồng xay', aliases: ['cua xay', 'cua đồng xay', 'thịt cua đồng'] },
  { key: 'trứng gà', aliases: ['trứng gà', 'trứng'] },
  { key: 'hành tím', aliases: ['hành tím', 'hành khô', 'hành tím băm'] },
  { key: 'tỏi', aliases: ['tỏi', 'tỏi băm', 'tỏi củ'] },
  { key: 'hành lá', aliases: ['hành lá', 'hành hoa', 'hành ngò'] },
  { key: 'nước dừa tươi', aliases: ['nước dừa', 'nước dừa tươi', 'dừa tươi', 'dừa xiêm'] },
  { key: 'cà chua', aliases: ['cà chua'] },
  { key: 'đậu phụ', aliases: ['đậu phụ', 'đậu hũ', 'tàu hũ'] },
  { key: 'rau cải ngọt', aliases: ['rau cải ngọt', 'cải ngọt', 'rau cải'] },
  { key: 'nước mắm', aliases: ['nước mắm', 'nước mắm ngon'] },
];

/**
 * Tìm tên đại diện chuẩn (Canonical Name)
 */
export function getCanonicalName(rawName) {
  const clean = normalizeIngredientName(rawName);
  for (const group of CANONICAL_GROUPS) {
    if (group.aliases.some(alias => clean.includes(alias) || alias.includes(clean))) {
      return group.key;
    }
  }
  return clean || rawName;
}

/**
 * Quy đổi mọi đơn vị khối lượng/thể tích về chuẩn cơ sở (gram, quả, ml, miếng...)
 */
function standardizeQuantity(amount, unit, canonicalName = '') {
  const u = (unit || '').toLowerCase().trim();
  const name = canonicalName.toLowerCase();

  // Nhóm dừa: 1 quả dừa trung bình cho ~400ml nước dừa
  if (name.includes('dừa')) {
    if (['ml'].includes(u)) {
      return { qty: Math.max(1, Math.round((amount / 400) * 10) / 10), baseUnit: 'quả' };
    }
    if (['lít', 'lit'].includes(u)) {
      return { qty: Math.max(1, Math.round(((amount * 1000) / 400) * 10) / 10), baseUnit: 'quả' };
    }
    if (['quả', 'trái'].includes(u)) {
      return { qty: amount, baseUnit: 'quả' };
    }
  }

  // Khối lượng quy về gram (g)
  if (['kg', 'kilogram'].includes(u)) return { qty: amount * 1000, baseUnit: 'g' };
  if (['lạng'].includes(u)) return { qty: amount * 100, baseUnit: 'g' };
  if (['g', 'gam', 'gr', 'gram'].includes(u)) return { qty: amount, baseUnit: 'g' };

  // Thể tích chất lỏng thông thường quy về ml
  if (['lít', 'lit'].includes(u)) return { qty: amount * 1000, baseUnit: 'ml' };
  if (['ml'].includes(u)) return { qty: amount, baseUnit: 'ml' };

  // Đơn vị đếm củ, nhánh, cây, tép
  if (['củ'].includes(u)) return { qty: amount, baseUnit: 'củ' };
  if (['nhánh', 'cọng'].includes(u)) return { qty: amount, baseUnit: 'nhánh' };
  if (['cây'].includes(u)) return { qty: amount, baseUnit: 'cây' };
  if (['tép'].includes(u)) return { qty: amount, baseUnit: 'tép' };

  // Đếm quả / miếng / gói / bó
  if (['quả', 'trái'].includes(u)) return { qty: amount, baseUnit: 'quả' };
  if (['miếng', 'bìa'].includes(u)) return { qty: amount, baseUnit: 'miếng' };
  if (['vắt', 'gói'].includes(u)) return { qty: amount, baseUnit: 'vắt' };
  if (['bó', 'mớ'].includes(u)) return { qty: amount, baseUnit: 'bó' };

  // Gia vị chất lỏng / bột quy về muỗng hoặc phần
  if (u.includes('cà phê')) return { qty: amount, baseUnit: 'thìa cà phê' };
  if (u.includes('canh') || u.includes('muỗng') || u.includes('thìa')) return { qty: amount, baseUnit: 'thìa canh' };
  if (['ít', 'chút', 'nhúm', 'vừa đủ'].includes(u)) return { qty: amount, baseUnit: 'chút' };

  return { qty: amount, baseUnit: u || 'phần' };
}

/**
 * Gợi ý quy đổi đóng gói mua thực tế ngoài chợ / siêu thị
 */
function getSuggestedPurchase(canonicalName, totalQty, baseUnit) {
  const name = (canonicalName || '').toLowerCase();

  // Gợi ý cho nước dừa
  if (name.includes('dừa')) {
    const coconuts = Math.ceil(totalQty);
    return `Mua chẵn ${coconuts} quả (~${coconuts * 400}ml)`;
  }

  // Khối lượng gram
  if (baseUnit === 'g') {
    if (totalQty >= 1000) {
      const kg = Math.ceil(totalQty / 100) / 10;
      return `Mua ~${kg} kg`;
    }
    const roundedG = Math.ceil(totalQty / 50) * 50;
    return `Mua chẵn ${roundedG}g (~${Math.round(roundedG / 100)} lạng)`;
  }

  // Thể tích ml
  if (baseUnit === 'ml') {
    if (totalQty >= 1000) {
      return `Mua ~${(totalQty / 1000).toFixed(1)} lít`;
    }
    return `Mua ~${Math.ceil(totalQty / 50) * 50} ml`;
  }

  // Đơn vị đếm
  if (['quả', 'miếng', 'vắt', 'củ', 'nhánh', 'cây', 'tép', 'bó'].includes(baseUnit)) {
    return `Mua ~${Math.ceil(totalQty)} ${baseUnit}`;
  }

  if (['thìa cà phê', 'thìa canh', 'chút'].includes(baseUnit)) {
    return 'Gia vị có sẵn (hoặc mua 1 hũ/chai)';
  }

  return `${Math.round(totalQty * 10) / 10} ${baseUnit}`;
}

/**
 * HÀM CỐT LÕI: Gom danh sách nguyên liệu từ nhiều món ăn
 * @param {Array} recipes - Danh sách các recipe đã chọn
 * @param {Object} priceMap - Bảng giá
 */
export function aggregateGroceryList(recipes = [], priceMap = {}) {
  const aggregated = {};

  recipes.forEach((recipe) => {
    const servings = recipe.customServings || recipe.base_servings || 2;
    const baseServings = recipe.base_servings || 2;
    const ingredients = recipe.ingredients || [];

    ingredients.forEach((ing) => {
      const rawName = typeof ing === 'string' ? ing : ing.name;
      const canonical = getCanonicalName(rawName);
      const { amount, unit } = parseIngredientAmount(ing, baseServings, servings);
      const { qty, baseUnit } = standardizeQuantity(amount, unit, canonical);

      // Tính giá chi tiết cho thành phần từ priceCalculator
      const costItem = calculateIngredientCost(ing, priceMap, baseServings, servings);

      const groupKey = `${canonical}__${baseUnit}`;

      if (!aggregated[groupKey]) {
        aggregated[groupKey] = {
          id: groupKey,
          name: canonical.charAt(0).toUpperCase() + canonical.slice(1),
          totalQty: 0,
          baseUnit,
          totalCost: 0,
          fromRecipes: [],
          checked: false, // Trạng thái đã mua xong khi đi chợ
        };
      }

      aggregated[groupKey].totalQty += qty;
      aggregated[groupKey].totalCost += costItem.cost;

      const recipeTitle = recipe.title || recipe.name || 'Món ăn';
      if (!aggregated[groupKey].fromRecipes.includes(recipeTitle)) {
        aggregated[groupKey].fromRecipes.push(recipeTitle);
      }
    });
  });

  // Chuyển map thành danh sách và gắn gợi ý mua thực tế cùng đơn giá hiển thị
  return Object.values(aggregated).map((item) => {
    const roundedQty = Math.round(item.totalQty * 10) / 10;
    const unitPrice = roundedQty > 0 ? Math.round(item.totalCost / roundedQty) : item.totalCost;

    return {
      ...item,
      totalQty: roundedQty,
      unitPrice,
      suggestedPack: getSuggestedPurchase(item.name, item.totalQty, item.baseUnit),
    };
  });
}