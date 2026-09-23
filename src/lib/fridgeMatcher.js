// src/lib/fridgeMatcher.js
import { normalizeIngredientName } from './priceCalculator';

// Danh sách gia vị/hành tỏi nền thường có sẵn trong bếp (bỏ qua khi tính điểm thiếu)
const STAPLE_PANTRY = [
  'muối', 'đường', 'tiêu', 'hạt tiêu', 'nước mắm', 'mắm', 'hạt nêm',
  'bột ngọt', 'mì chính', 'dầu ăn', 'mỡ', 'nước tương', 'xì dầu',
  'dầu hào', 'ớt', 'ớt cay', 'gia vị', 'nêm nếm'
];

/**
 * Kiểm tra xem nguyên liệu có phải gia vị cơ bản không
 */
function isStaple(name) {
  const clean = normalizeIngredientName(name);
  return STAPLE_PANTRY.some(item => clean.includes(item) || item.includes(clean));
}

/**
 * Kiểm tra xem 1 nguyên liệu của món ăn có nằm trong tủ lạnh hay không
 */
function checkItemInFridge(ingName, fridgeItems = []) {
  const cleanRecipeIng = normalizeIngredientName(ingName);
  
  return fridgeItems.some(fridgeItem => {
    const cleanFridge = normalizeIngredientName(fridgeItem);
    return cleanRecipeIng.includes(cleanFridge) || cleanFridge.includes(cleanRecipeIng);
  });
}

/**
 * THUẬT TOÁN MATCHING: So khớp danh sách công thức với tủ lạnh
 * @param {Array} recipes - Toàn bộ công thức hiện có
 * @param {Array} fridgeItems - Mảng string các món có trong tủ (VD: ['trứng', 'cà chua', 'thịt heo'])
 */
export function matchRecipesWithFridge(recipes = [], fridgeItems = []) {
  if (!Array.isArray(recipes) || recipes.length === 0) return [];
  if (!Array.isArray(fridgeItems) || fridgeItems.length === 0) {
    return recipes.map(r => ({ ...r, matchRate: 0, missingCount: 99, missingItems: [], availableItems: [] }));
  }

  const scoredRecipes = recipes.map(recipe => {
    const ingredients = recipe.ingredients || [];
    if (ingredients.length === 0) {
      return { ...recipe, matchRate: 0, missingCount: 0, missingItems: [], availableItems: [] };
    }

    // Lọc bỏ gia vị nền ra khỏi phép tính điểm chính
    const mainIngredients = ingredients.filter(ing => {
      const name = typeof ing === 'string' ? ing : ing.name;
      return !isStaple(name);
    });

    const targetList = mainIngredients.length > 0 ? mainIngredients : ingredients;
    const availableItems = [];
    const missingItems = [];

    targetList.forEach(ing => {
      const name = typeof ing === 'string' ? ing : ing.name;
      if (checkItemInFridge(name, fridgeItems)) {
        availableItems.push(name);
      } else {
        missingItems.push(name);
      }
    });

    const total = targetList.length;
    const matched = availableItems.length;
    const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;

    return {
      ...recipe,
      matchRate,
      missingCount: missingItems.length,
      missingItems,
      availableItems,
      canCookNow: missingItems.length === 0 && matched > 0,
    };
  });

  // Sắp xếp: Ưu tiên món 100% lên đầu, tiếp đến là tỷ lệ khớp giảm dần
  return scoredRecipes.sort((a, b) => {
    if (b.matchRate !== a.matchRate) {
      return b.matchRate - a.matchRate;
    }
    return a.missingCount - b.missingCount;
  });
}