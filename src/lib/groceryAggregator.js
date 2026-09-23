// src/lib/groceryAggregator.js
import { normalizeIngredientName, parseIngredientAmount, calculateIngredientCost } from './priceCalculator';

// Quy tắc nhóm nguyên liệu về 1 tên chuẩn
const CANONICAL_GROUPS = [
  { key: 'thịt heo xay', aliases: ['thịt xay', 'thịt heo xay', 'thịt lợn xay', 'thịt băm'] },
  { key: 'thịt ba chỉ', aliases: ['ba chỉ', 'thịt ba chỉ', 'thịt ba rọi'] },
  { key: 'thịt bò', aliases: ['thịt bò', 'bắp bò', 'nạm bò', 'thăn bò'] },
  { key: 'thịt gà', aliases: ['thịt gà', 'ức gà', 'đùi gà', 'cánh gà'] },
  { key: 'cua đồng xay', aliases: ['cua xay', 'cua đồng xay', 'thịt cua đồng'] },
  { key: 'trứng gà', aliases: ['trứng gà', 'trứng'] },
  { key: 'hành tím', aliases: ['hành tím', 'hành khô', 'hành tím băm'] },
  { key: 'tỏi', aliases: ['tỏi', 'tỏi băm', 'tỏi củ'] },
  { key: 'hành lá', aliases: ['hành lá', 'hành hoa', 'hành ngò'] },
  { key: 'cà chua', aliases: ['cà chua'] },
  { key: 'đậu phụ', aliases: ['đậu phụ', 'đậu hũ', 'tàu hũ'] },
  { key: 'rau cải ngọt', aliases: ['rau cải ngọt', 'cải ngọt', 'rau cải'] },
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
 * Quy đổi mọi đơn vị khối lượng/thể tích về chuẩn cơ sở (gram, quả, ml, miếng)
 */
function standardizeQuantity(amount, unit) {
  const u = (unit || '').toLowerCase().trim();

  // Khối lượng quy về gram (g)
  if (['kg', 'kilogram'].includes(u)) return { qty: amount * 1000, baseUnit: 'g' };
  if (['lạng'].includes(u)) return { qty: amount * 100, baseUnit: 'g' };
  if (['g', 'gam', 'gr', 'gram'].includes(u)) return { qty: amount, baseUnit: 'g' };

  // Đếm quả / chiếc / miếng
  if (['quả', 'trái'].includes(u)) return { qty: amount, baseUnit: 'quả' };
  if (['miếng', 'bìa'].includes(u)) return { qty: amount, baseUnit: 'miếng' };
  if (['vắt', 'gói'].includes(u)) return { qty: amount, baseUnit: 'vắt' };
  if (['bó', 'mớ'].includes(u)) return { qty: amount, baseUnit: 'bó' };
  if (['củ'].includes(u)) return { qty: amount, baseUnit: 'củ' };
  if (['tép', 'nhánh'].includes(u)) return { qty: amount, baseUnit: 'tép' };

  // Gia vị chất lỏng / bột quy về muỗng hoặc phần
  if (u.includes('cà phê')) return { qty: amount, baseUnit: 'thìa cà phê' };
  if (u.includes('canh') || u.includes('muỗng') || u.includes('thìa')) return { qty: amount, baseUnit: 'muỗng canh' };
  if (['ít', 'chút', 'nhúm', 'vừa đủ'].includes(u)) return { qty: amount, baseUnit: 'chút' };

  return { qty: amount, baseUnit: u || 'phần' };
}

/**
 * Gợi ý quy đổi đóng gói mua thực tế ngoài chợ / siêu thị
 */
function getSuggestedPurchase(canonicalName, totalQty, baseUnit) {
  if (baseUnit === 'g') {
    if (totalQty >= 1000) {
      const kg = Math.ceil(totalQty / 100) / 10; // làm tròn đến 0.1 kg
      return `${kg} kg`;
    }
    // Dưới 1kg: làm tròn chẵn 50g hoặc 100g ngoài chợ
    const roundedG = Math.ceil(totalQty / 50) * 50;
    return `${roundedG} g (${Math.round(roundedG / 100)} lạng)`;
  }

  if (baseUnit === 'quả' || baseUnit === 'miếng' || baseUnit === 'vắt') {
    return `${Math.ceil(totalQty)} ${baseUnit}`;
  }

  if (baseUnit === 'bó') {
    return `${Math.ceil(totalQty)} bó`;
  }

  if (['thìa cà phê', 'muỗng canh', 'chút'].includes(baseUnit)) {
    return 'Gia vị có sẵn';
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
      const { qty, baseUnit } = standardizeQuantity(amount, unit);

      // Tính giá lẻ thành phần
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
      if (!aggregated[groupKey].fromRecipes.includes(recipe.title)) {
        aggregated[groupKey].fromRecipes.push(recipe.title);
      }
    });
  });

  // Chuyển map thành danh sách và gắn gợi ý mua thực tế
  return Object.values(aggregated).map((item) => ({
    ...item,
    suggestedPack: getSuggestedPurchase(item.name.toLowerCase(), item.totalQty, item.baseUnit),
  }));
}