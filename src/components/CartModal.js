'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// 1. Bảng giá khối lượng chuẩn theo GRAM (đ/g)
const WEIGHT_PRICES_PER_GRAM = {
  'tôm': 200,        // 200đ/g = 20.000đ/lạng = 200.000đ/kg
  'mực': 220,        // 220đ/g = 22.000đ/lạng
  'thịt bò': 250,    // 250đ/g
  'thịt heo': 140,   // 140đ/g
  'thịt lợn': 140,
  'thịt xay': 140,
  'ba chỉ': 150,
  'thịt gà': 90,
  'thịt vịt': 95,
  'vịt': 95,
  'cá': 120,
  'cá lóc': 110,
  'cua đồng': 180,
  'nấm': 60,
  'hành tím': 60,
  'tỏi': 60,
  'cần tây': 50,
  'rau cải': 25,
  'cải ngọt': 25,
};

// 2. Bảng giá thể tích theo ML (đ/ml)
const VOLUME_PRICES_PER_ML = {
  'nước dừa': 50,       // 50đ/ml -> 400ml = 20.000đ (1 quả)
  'dừa tươi': 50,
  'dừa': 50,
  'dầu ăn': 45,        // 45đ/ml = 45.000đ/lít
  'nước mắm': 45,      // 45đ/ml = 45.000đ/lít
  'nước màu': 60,      // 60đ/ml = 60.000đ/lít
  'dầu hào': 50,       // 50đ/ml
  'nước tương': 40,
  'xì dầu': 40,
  'giấm': 30,
};

// 3. Bảng giá đơn vị đếm chuẩn (đ/quả, đ/củ, đ/bó, đ/vắt...)
const UNIT_COUNT_PRICES = {
  'cà rốt': 3750,    // 3.750đ / củ
  'hành tây': 3750,  // 3.750đ / củ
  'khoai tây': 5000, // 5.000đ / củ
  'cà chua': 3000,   // 3.000đ / quả
  'trứng': 3500,     // 3.500đ / quả
  'dừa': 20000,      // 20.000đ / quả
  'bó': 8000,        // 8.000đ / bó
  'rau cải': 8000,
  'cải ngọt': 8000,
  'đậu phụ': 4000,   // 4.000đ / bìa
  'hành lá': 500,    // 500đ / nhánh
  'hành tím': 900,   // 900đ / củ
  'tỏi': 800,        // 800đ / củ, tép
  'sả': 2000,        // 2.000đ / cây
  'mì': 4000,        // 4.000đ / vắt
  'mì trứng': 4000,
  'mắm tôm': 2000,
  'dầu ăn': 1500,
  'nước mắm': 1500,
  'dầu hào': 1500,
  'tiêu': 500,
  'ớt': 400,
  'gia vị': 1000,
};

// Nhóm từ đồng nghĩa gom nguyên liệu
const CANONICAL_ALIASES = [
  { key: 'tôm tươi', aliases: ['tôm', 'tôm tươi', 'tôm sú', 'tôm rảo'] },
  { key: 'mực ống', aliases: ['mực', 'mực ống', 'mực lá', 'mực tươi'] },
  { key: 'cà rốt', aliases: ['cà rốt', 'củ cà rốt'] },
  { key: 'hành tây', aliases: ['hành tây', 'củ hành tây'] },
  { key: 'thịt heo xay', aliases: ['thịt xay', 'thịt heo xay', 'thịt lợn xay', 'thịt băm'] },
  { key: 'thịt ba chỉ', aliases: ['ba chỉ', 'thịt ba chỉ', 'thịt ba rọi'] },
  { key: 'thịt bò', aliases: ['thịt bò', 'bắp bò', 'nạm bò', 'thăn bò'] },
  { key: 'thịt gà', aliases: ['thịt gà', 'ức gà', 'đùi gà', 'cánh gà', 'gà ta'] },
  { key: 'thịt vịt', aliases: ['thịt vịt', 'vịt'] },
  { key: 'cá lóc', aliases: ['cá lóc', 'cá quả', 'cá chuối'] },
  { key: 'cua đồng xay', aliases: ['cua xay', 'cua đồng xay', 'thịt cua đồng', 'cua đồng'] },
  { key: 'trứng gà', aliases: ['trứng gà', 'trứng'] },
  { key: 'nước dừa tươi', aliases: ['nước dừa', 'nước dừa tươi', 'dừa tươi', 'dừa xiêm'] },
  { key: 'hành tím', aliases: ['hành tím', 'hành khô', 'hành tím băm'] },
  { key: 'tỏi', aliases: ['tỏi', 'tỏi băm', 'tỏi củ'] },
  { key: 'hành lá', aliases: ['hành lá', 'hành hoa', 'hành ngò'] },
  { key: 'đậu phụ', aliases: ['đậu phụ', 'đậu hũ', 'tàu hũ'] },
  { key: 'cải ngọt', aliases: ['rau cải ngọt', 'cải ngọt', 'rau cải'] },
  { key: 'mì', aliases: ['mì', 'mì gói', 'vắt mì', 'mì tôm', 'mì trứng'] },
  { key: 'gia vị thông dụng', aliases: ['gia vị', 'nêm nếm', 'muối, đường', 'bột ngọt'] },
];

const getCanonicalKey = (name = '') => {
  const clean = name.toLowerCase().trim();
  for (const group of CANONICAL_ALIASES) {
    if (group.aliases.some((alias) => clean.includes(alias))) {
      return group.key;
    }
  }
  return clean;
};

// Phân tích chuỗi nguyên liệu trích xuất { name, quantity, unit }
const parseIngredient = (rawText = '') => {
  let name = rawText.trim();
  let quantity = 1;
  let unit = '';

  if (rawText.includes(':')) {
    const parts = rawText.split(':');
    name = parts[0].trim();
    const rightPart = parts.slice(1).join(':').trim();
    const match = rightPart.match(/^([\d.,]+)\s*(.*)$/);
    if (match) {
      quantity = parseFloat(match[1].replace(',', '.')) || 1;
      unit = match[2].trim();
    }
  } else {
    const match = rawText.match(/^([\d.,]+)\s*([a-zA-Zà-ỹÀ-Ỹ]+)?\s*(.*)$/);
    if (match) {
      quantity = parseFloat(match[1].replace(',', '.')) || 1;
      unit = (match[2] || '').trim();
      name = (match[3] || '').trim() || name;
    }
  }

  // Chuẩn hóa khối lượng về gram (g) và thể tích về ml
  let normalizedQty = Math.max(0.1, quantity);
  let normalizedUnit = unit || 'phần';
  const uLower = normalizedUnit.toLowerCase();

  if (['kg', 'kilogram'].includes(uLower)) {
    normalizedQty = quantity * 1000;
    normalizedUnit = 'g';
  } else if (['lạng'].includes(uLower)) {
    normalizedQty = quantity * 100;
    normalizedUnit = 'g';
  } else if (['gam', 'gram', 'gr'].includes(uLower)) {
    normalizedUnit = 'g';
  } else if (['lít', 'lit'].includes(uLower)) {
    normalizedQty = quantity * 1000;
    normalizedUnit = 'ml';
  }

  const cleanKey = getCanonicalKey(name);

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    cleanKey,
    quantity: normalizedQty,
    unit: normalizedUnit,
  };
};

// Gợi ý đóng gói mua thực tế ngoài chợ
const getSuggestedPack = (unit, qty, name = '') => {
  const u = (unit || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();

  // Nhóm dừa tươi
  if (n.includes('dừa')) {
    if (u === 'ml') {
      const coconuts = Math.max(1, Math.ceil(qty / 400));
      return `Mua chẵn ${coconuts} quả (~${coconuts * 400}ml)`;
    }
    return `Mua chẵn ${Math.ceil(qty)} quả`;
  }

  if (/(mắm tôm|nước mắm|dầu hào|dầu ăn|dầu mè|giấm|xì dầu|nước tương)/i.test(n)) {
    if (u.includes('muỗng') || u.includes('thìa') || u.includes('canh') || u.includes('ít') || u.includes('cà phê')) {
      return 'Gia vị có sẵn (hoặc mua 1 hũ/chai)';
    }
    return 'Mua 1 chai/hũ';
  }

  if (
    u.includes('thìa') ||
    u.includes('muỗng') ||
    u.includes('canh') ||
    u.includes('cà phê') ||
    ['ít', 'chút', 'nhúm', 'vừa đủ', 'phần'].includes(u) ||
    n.includes('gia vị')
  ) {
    return 'Gia vị sẵn có trong bếp';
  }

  if (u === 'g') {
    if (qty >= 1000) {
      const kg = Math.ceil(qty / 100) / 10;
      return `Mua ${kg} kg`;
    }
    const rounded = Math.ceil(qty / 50) * 50;
    return `Mua chẵn ${rounded}g (~${Math.round(rounded / 100)} lạng)`;
  }

  if (u === 'ml') {
    if (qty >= 1000) return `Mua ~${(qty / 1000).toFixed(1)} lít`;
    return `Mua ~${Math.ceil(qty / 100) * 100} ml`;
  }

  if (['quả', 'trái', 'miếng', 'vắt', 'bó', 'củ', 'nhánh', 'tép', 'cây'].includes(u)) {
    return `Mua chẵn ${Math.ceil(qty)} ${u}`;
  }

  return `Mua ~${Math.ceil(qty)} ${unit}`;
};

// Tra cứu đơn giá an toàn, không để giá trị rỗng hoặc NaN
const guessUnitPrice = (cleanKey, unit = '') => {
  const uLower = (unit || '').toLowerCase().trim();
  const cKey = (cleanKey || '').toLowerCase().trim();

  // 1. Đơn vị tính là gram: tra cứu bảng giá gram
  if (uLower === 'g') {
    for (const [key, price] of Object.entries(WEIGHT_PRICES_PER_GRAM)) {
      if (cKey.includes(key) || key.includes(cKey)) return price;
    }
    return 150;
  }

  // 2. Đơn vị tính là thể tích (ml)
  if (uLower === 'ml') {
    for (const [key, price] of Object.entries(VOLUME_PRICES_PER_ML)) {
      if (cKey.includes(key) || key.includes(cKey)) return price;
    }
    return 50; // Mặc định 50đ/ml (50.000đ/lít)
  }

  // 3. Tra cứu bảng giá đơn vị đếm theo tên nguyên liệu
  for (const [key, price] of Object.entries(UNIT_COUNT_PRICES)) {
    if (cKey.includes(key) || key.includes(cKey)) return price;
  }

  // 4. Tra cứu theo loại đơn vị
  if (uLower.includes('bó') || uLower.includes('mớ')) return 8000;
  if (uLower.includes('củ')) return 2000;
  if (uLower.includes('nhánh') || uLower.includes('cọng') || uLower.includes('tép')) return 1000;
  if (uLower.includes('cây')) return 2000;
  if (uLower.includes('quả') || uLower.includes('trái')) return 3500;
  if (uLower.includes('vắt') || uLower.includes('gói')) return 4000;
  if (uLower.includes('bìa') || uLower.includes('miếng')) return 4000;

  return 1000; // Giá trị an toàn mặc định
};

export default function CartModal({
  isOpen,
  shoppingList = [],
  onClose,
  onRemoveItem,
  onClearCart,
  onToggleItemDone,
  priceMap = {},
}) {
  const [viewMode, setViewMode] = useState('merged');
  const [customUnitPrices, setCustomUnitPrices] = useState({});
  const [deductFridge, setDeductFridge] = useState(true);
  const [fridgeItems, setFridgeItems] = useState([]);

  useEffect(() => {
    try {
      const savedPrices = localStorage.getItem('bepnha_unit_prices');
      if (savedPrices) {
        const parsed = JSON.parse(savedPrices);
        const cleanSaved = {};
        Object.entries(parsed).forEach(([k, v]) => {
          const num = Number(v);
          // Tự động dọn sạch giá lỗi 3000 đ/ml của nước dừa từng bị lưu trước đó
          if (k.includes('dừa') && num >= 1000) return;
          if (Number.isFinite(num) && num > 0) {
            cleanSaved[k] = num;
          }
        });
        setCustomUnitPrices(cleanSaved);
      }

      const savedFridge = localStorage.getItem('bepnha_fridge_items');
      if (savedFridge) setFridgeItems(JSON.parse(savedFridge));
    } catch (e) {
      console.error('Lỗi đọc localStorage:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnitPriceChange = (key, val) => {
    const numeric = parseInt(val, 10);
    const validPrice = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    const updated = { ...customUnitPrices, [key]: validPrice };
    setCustomUnitPrices(updated);
    try {
      localStorage.setItem('bepnha_unit_prices', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const getUnitPrice = (key, unit = '') => {
    const storageKey = `${key}__${unit}`;

    // 1. Kiểm tra giá người dùng tùy chỉnh
    const custom = customUnitPrices[storageKey] ?? customUnitPrices[key];
    if (Number.isFinite(Number(custom)) && Number(custom) > 0) {
      // Bỏ qua giá bất thường nếu là nước dừa tính theo ml mà giá >= 1000
      if (!(key.includes('dừa') && unit === 'ml' && Number(custom) >= 1000)) {
        return Number(custom);
      }
    }

    // 2. Kiểm tra bảng giá động từ props
    const dynamicPrice = priceMap?.[key] ?? priceMap?.[storageKey];
    if (Number.isFinite(Number(dynamicPrice)) && Number(dynamicPrice) > 0) {
      return Number(dynamicPrice);
    }

    // 3. Tra cứu thuật toán
    const guessed = guessUnitPrice(key, unit);
    return Number.isFinite(Number(guessed)) && Number(guessed) > 0 ? Number(guessed) : 1000;
  };

  const isItemInFridge = (cleanKey, rawName) => {
    const target = `${cleanKey} ${rawName}`.toLowerCase();
    return fridgeItems.some((f) => {
      const cleanFridge = f.toLowerCase().trim();
      return target.includes(cleanFridge) || cleanFridge.includes(cleanKey);
    });
  };

  // Gom nhóm danh sách
  const mergedList = shoppingList.reduce((acc, item) => {
    const parsed = parseIngredient(item.text);
    const key = `${parsed.cleanKey}__${parsed.unit}`;
    const inFridge = isItemInFridge(parsed.cleanKey, parsed.name);

    if (!acc[key]) {
      acc[key] = {
        name: parsed.name,
        key: parsed.cleanKey,
        groupKey: key,
        totalQuantity: parsed.quantity,
        unit: parsed.unit,
        suggested: getSuggestedPack(parsed.unit, parsed.quantity, parsed.name),
        dishes: [item.dish],
        ids: [item.id],
        isDone: !!item.is_done,
        inFridge,
      };
    } else {
      acc[key].totalQuantity = Math.round((acc[key].totalQuantity + parsed.quantity) * 100) / 100;
      acc[key].suggested = getSuggestedPack(acc[key].unit, acc[key].totalQuantity, acc[key].name);
      if (!acc[key].dishes.includes(item.dish)) {
        acc[key].dishes.push(item.dish);
      }
      acc[key].ids.push(item.id);
      acc[key].isDone = acc[key].isDone && !!item.is_done;
    }
    return acc;
  }, {});

  const mergedItems = Object.values(mergedList);

  // Tính tổng chi phí (loại trừ các giá trị không hợp lệ)
  const totalCost = (viewMode === 'merged' ? mergedItems : shoppingList).reduce((sum, item) => {
    if (viewMode === 'merged') {
      if (deductFridge && item.inFridge) return sum;
      const uPrice = getUnitPrice(item.key, item.unit);
      const sub = Math.round((item.totalQuantity || 0) * uPrice);
      return sum + (Number.isFinite(sub) ? sub : 0);
    } else {
      const parsed = parseIngredient(item.text);
      if (deductFridge && isItemInFridge(parsed.cleanKey, parsed.name)) return sum;
      const uPrice = getUnitPrice(parsed.cleanKey, parsed.unit);
      const sub = Math.round((parsed.quantity || 0) * uPrice);
      return sum + (Number.isFinite(sub) ? sub : 0);
    }
  }, 0);

  // Chia sẻ Zalo
  const handleShareZalo = async () => {
    if (shoppingList.length === 0) return;

    let textToSend = '🛒 DANH SÁCH ĐI CHỢ GIA ĐÌNH - BẾP NHÀ:\n';
    textToSend += '────────────────────\n';

    if (viewMode === 'merged') {
      const neededItems = mergedItems.filter((i) => !(deductFridge && i.inFridge));
      const fridgeAvailable = mergedItems.filter((i) => deductFridge && i.inFridge);

      textToSend += '👉 NGUYÊN LIỆU CẦN MUA NGOÀI CHỢ:\n';
      neededItems.forEach((item, index) => {
        const uPrice = getUnitPrice(item.key, item.unit);
        const itemTotal = Math.round((item.totalQuantity || 0) * uPrice);
        const doneTag = item.isDone ? ' [Đã mua] ✅' : '';
        textToSend += `${index + 1}. ${item.name}: ${item.totalQuantity} ${item.unit} [👉 ${item.suggested}] (~${itemTotal.toLocaleString('vi-VN')}đ)${doneTag}\n`;
        textToSend += `   🍲 Cho món: ${item.dishes.join(', ')}\n`;
      });

      if (fridgeAvailable.length > 0) {
        textToSend += '\n🧊 ĐỒ CÓ SẴN TRONG TỦ LẠNH (KHÔNG CẦN MUA):\n';
        fridgeAvailable.forEach((item) => {
          textToSend += `✓ ${item.name}: ${item.totalQuantity} ${item.unit} (${item.dishes.join(', ')})\n`;
        });
      }
    } else {
      shoppingList.forEach((item, index) => {
        const parsed = parseIngredient(item.text);
        const inF = deductFridge && isItemInFridge(parsed.cleanKey, parsed.name);
        const uPrice = getUnitPrice(parsed.cleanKey, parsed.unit);
        const itemTotal = Math.round((parsed.quantity || 0) * uPrice);
        const doneTag = item.is_done ? ' [Đã mua] ✅' : '';
        textToSend += `${index + 1}. ${item.text} ${inF ? '[Có sẵn trong tủ]' : `(~${itemTotal.toLocaleString('vi-VN')}đ)`}${doneTag} [${item.dish}]\n`;
      });
    }

    textToSend += '────────────────────\n';
    textToSend += `💰 TỔNG TIỀN DỰ TOÁN: ~${totalCost.toLocaleString('vi-VN')} VNĐ\n`;
    textToSend += '📲 Xem và tick giỏ hàng Realtime tại: https://bep-nha-nextjs.vercel.app\n';
    textToSend += '(Ai đi chợ tick mua món nào, app ở nhà sẽ tự gạch ngang tức thì!)';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: '🛒 Giỏ Đi Chợ Gia Đình - Bếp Nhà',
          text: textToSend,
        });
        return;
      } catch (err) {
        // Tiếp tục phương án clipboard
      }
    }

    navigator.clipboard
      .writeText(textToSend)
      .then(() => {
        const openZalo = window.confirm(
          '✅ Đã sao chép danh sách đi chợ!\n\nBạn có muốn mở ngay Zalo (chat.zalo.me) để dán và gửi cho người thân không?'
        );
        if (openZalo) {
          window.open('https://chat.zalo.me', '_blank');
        }
      })
      .catch((err) => alert('Lỗi sao chép: ' + err.message));
  };

  // Xuất Excel
  const handleExportExcel = () => {
    if (shoppingList.length === 0) return;

    let excelData = [];
    if (viewMode === 'merged') {
      excelData = mergedItems.map((item, idx) => {
        const inF = deductFridge && item.inFridge;
        const uPrice = getUnitPrice(item.key, item.unit);
        return {
          'STT': idx + 1,
          'Trạng thái': item.isDone ? 'Đã mua' : 'Chưa mua',
          'Tên nguyên liệu': item.name,
          'Cần dùng': `${item.totalQuantity} ${item.unit}`,
          'Gợi ý mua ngoài chợ': inF ? 'Đã có trong tủ lạnh' : item.suggested,
          'Đơn giá (VNĐ)': inF ? 0 : uPrice,
          'Thành tiền (VNĐ)': inF ? 0 : Math.round((item.totalQuantity || 0) * uPrice),
          'Món ăn áp dụng': item.dishes.join(', '),
        };
      });
    } else {
      excelData = shoppingList.map((item, idx) => {
        const parsed = parseIngredient(item.text);
        const inF = deductFridge && isItemInFridge(parsed.cleanKey, parsed.name);
        const uPrice = getUnitPrice(parsed.cleanKey, parsed.unit);
        return {
          'STT': idx + 1,
          'Trạng thái': item.is_done ? 'Đã mua' : 'Chưa mua',
          'Món ăn': item.dish,
          'Nguyên liệu': parsed.name,
          'Cần dùng': `${parsed.quantity} ${parsed.unit}`,
          'Gợi ý mua ngoài chợ': inF ? 'Đã có trong tủ lạnh' : getSuggestedPack(parsed.unit, parsed.quantity, parsed.name),
          'Đơn giá (VNĐ)': inF ? 0 : uPrice,
          'Thành tiền (VNĐ)': inF ? 0 : Math.round((parsed.quantity || 0) * uPrice),
        };
      });
    }

    excelData.push({
      'STT': 'TỔNG',
      'Trạng thái': '',
      'Tên nguyên liệu': '',
      'Cần dùng': '',
      'Gợi ý mua ngoài chợ': '',
      'Đơn giá (VNĐ)': '',
      'Thành tiền (VNĐ)': totalCost,
      'Món ăn áp dụng': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi phí đi chợ');

    worksheet['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 26 }];
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Chi_Phi_Di_Cho_${dateStr}.xlsx`);
  };

  // In danh sách / PDF
  const handlePrint = () => {
    if (shoppingList.length === 0) return;

    const printWindow = window.open('', '_blank');
    const itemsHtml = (viewMode === 'merged' ? mergedItems : shoppingList)
      .map((item, idx) => {
        if (viewMode === 'merged') {
          const inF = deductFridge && item.inFridge;
          const uPrice = getUnitPrice(item.key, item.unit);
          const itemTotal = inF ? 0 : Math.round((item.totalQuantity || 0) * uPrice);
          return `
            <tr style="background-color: ${item.isDone ? '#f0fff4' : 'transparent'};">
              <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
              <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${item.isDone ? '✅ Đã mua' : '⬜ Chưa'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.name}</td>
              <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${item.totalQuantity} ${item.unit}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: ${inF ? '#3182ce' : '#27ae60'}; font-weight: 500;">
                ${inF ? '🧊 Có sẵn trong tủ lạnh' : item.suggested}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #555;">${item.dishes.join(', ')}</td>
              <td style="text-align:right; padding: 8px; border: 1px solid #ddd;">
                ${inF ? '<span style="color:#888;">0 đ</span>' : `${itemTotal.toLocaleString('vi-VN')} đ`}
              </td>
            </tr>
          `;
        }
        const parsed = parseIngredient(item.text);
        const inF = deductFridge && isItemInFridge(parsed.cleanKey, parsed.name);
        const uPrice = getUnitPrice(parsed.cleanKey, parsed.unit);
        const itemTotal = inF ? 0 : Math.round((parsed.quantity || 0) * uPrice);
        return `
          <tr style="background-color: ${item.is_done ? '#f0fff4' : 'transparent'};">
            <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
            <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${item.is_done ? '✅ Đã mua' : '⬜ Chưa'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.dish}</td>
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="3">
              ${item.text} ${inF ? '<b style="color:#3182ce;">(Có sẵn trong tủ)</b>' : ''}
            </td>
            <td style="text-align:right; padding: 8px; border: 1px solid #ddd;">
              ${inF ? '<span style="color:#888;">0 đ</span>' : `${itemTotal.toLocaleString('vi-VN')} đ`}
            </td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <html>
        <head>
          <title>Dự toán đi chợ - Bếp Nhà</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #e67e22; margin-bottom: 4px; }
            p.sub { text-align: center; font-size: 0.85rem; color: #777; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
            .total-row { font-weight: bold; background-color: #fef9e7; }
          </style>
        </head>
        <body>
          <h2>🛒 BẢNG DỰ TOÁN CHI PHÍ ĐI CHỢ</h2>
          <p class="sub">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align:center;">STT</th>
                <th style="width: 70px; text-align:center;">Tình trạng</th>
                <th>${viewMode === 'merged' ? 'Nguyên liệu' : 'Món ăn'}</th>
                <th style="text-align:center;">Cần dùng</th>
                <th>Gợi ý đóng gói</th>
                <th>${viewMode === 'merged' ? 'Món áp dụng' : 'Chi tiết'}</th>
                <th style="text-align:right; width: 110px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="6" style="padding: 10px 8px; border: 1px solid #ddd; text-align: right;">TỔNG CHI PHÍ THỰC TẾ CẦN CHI:</td>
                <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; color: #d35400;">
                  ${totalCost.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div style={cartStyles.overlay} onClick={onClose}>
      <div style={cartStyles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={cartStyles.closeBtn}>✕</button>

        {/* Header */}
        <div style={cartStyles.header}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={cartStyles.title}>🛒 Giỏ Đi Chợ Realtime</h2>
              <span style={{ fontSize: '0.72rem', background: '#e6fffa', color: '#319795', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>
                ⚡ Tự động đồng bộ
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              Tick chọn để đồng bộ trạng thái mua sắm tức thời cho cả gia đình
            </span>
          </div>
          {shoppingList.length > 0 && (
            <button onClick={onClearCart} style={cartStyles.btnClear}>
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Chuyển Tabs & Công tắc đối chiếu tủ lạnh */}
        {shoppingList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            <div style={cartStyles.tabContainer}>
              <button
                onClick={() => setViewMode('merged')}
                style={{
                  ...cartStyles.tabBtn,
                  ...(viewMode === 'merged' ? cartStyles.tabActive : {}),
                }}
              >
                Gom nhóm ({mergedItems.length})
              </button>
              <button
                onClick={() => setViewMode('byDish')}
                style={{
                  ...cartStyles.tabBtn,
                  ...(viewMode === 'byDish' ? cartStyles.tabActive : {}),
                }}
              >
                Theo từng món ({shoppingList.length})
              </button>
            </div>

            <div
              onClick={() => setDeductFridge(!deductFridge)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderRadius: '10px',
                backgroundColor: deductFridge ? '#e6fffa' : '#f7fafc',
                border: deductFridge ? '1px solid #81e6d9' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.9rem' }}>🧊</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: deductFridge ? '#234e52' : '#718096' }}>
                  Khấu trừ đồ có sẵn trong tủ lạnh ({fridgeItems.length} món sẵn có)
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: deductFridge ? '#319795' : '#a0aec0' }}>
                {deductFridge ? 'BẬT' : 'TẮT'}
              </span>
            </div>
          </div>
        )}

        {/* Danh sách món */}
        {shoppingList.length === 0 ? (
          <div style={cartStyles.emptyState}>
            <p style={{ fontSize: '2.5rem', margin: 0 }}>🥬</p>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '8px' }}>
              Giỏ đi chợ đang trống. Mở món ăn bất kỳ và bấm &quot;Thêm vào giỏ&quot;!
            </p>
          </div>
        ) : (
          <div style={cartStyles.list}>
            {viewMode === 'merged'
              ? mergedItems.map((item) => {
                  const inFridge = deductFridge && item.inFridge;
                  const uPrice = getUnitPrice(item.key, item.unit);
                  const itemTotal = inFridge ? 0 : Math.round((item.totalQuantity || 0) * uPrice);

                  return (
                    <div
                      key={item.groupKey}
                      style={{
                        ...cartStyles.item,
                        opacity: item.isDone ? 0.55 : 1,
                        backgroundColor: inFridge ? '#ebf8ff' : item.isDone ? '#edf2f7' : '#f8f9fa',
                        borderColor: inFridge ? '#bee3f8' : '#edf2f7',
                      }}
                      onClick={() => {
                        if (onToggleItemDone) {
                          onToggleItemDone(item.ids, !item.isDone);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.isDone}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', transform: 'scale(1.15)', marginRight: '10px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              ...cartStyles.itemText,
                              fontWeight: '700',
                              textDecoration: item.isDone ? 'line-through' : 'none',
                            }}
                          >
                            {item.name}
                          </span>
                          <span style={cartStyles.qtyBadge}>
                            {item.totalQuantity} {item.unit}
                          </span>
                          {inFridge ? (
                            <span style={cartStyles.fridgeBadge}>
                              🧊 Có sẵn trong tủ lạnh
                            </span>
                          ) : (
                            <span style={cartStyles.packBadge}>
                              {item.suggested}
                            </span>
                          )}
                        </div>
                        <span style={cartStyles.dishName}>Dùng cho: {item.dishes.join(', ')}</span>
                      </div>

                      {/* Cột giá & thành tiền */}
                      <div
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inFridge ? (
                          <span style={{ fontSize: '0.8rem', color: '#3182ce', fontWeight: '700' }}>0 đ</span>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <input
                                type="number"
                                step={item.unit === 'g' ? '10' : item.unit === 'ml' ? '5' : '500'}
                                value={Number.isFinite(uPrice) ? uPrice : 50}
                                onChange={(e) => handleUnitPriceChange(item.groupKey, e.target.value)}
                                style={cartStyles.priceInput}
                                title={`Đơn giá cho mỗi ${item.unit}`}
                              />
                              <span style={{ fontSize: '0.7rem', color: '#718096' }}>đ/{item.unit}</span>
                            </div>
                            <span style={cartStyles.totalItemPrice}>
                              ~{(Number.isFinite(itemTotal) ? itemTotal : 0).toLocaleString('vi-VN')} đ
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              : shoppingList.map((item) => {
                  const parsed = parseIngredient(item.text);
                  const inF = deductFridge && isItemInFridge(parsed.cleanKey, parsed.name);
                  const uPrice = getUnitPrice(parsed.cleanKey, parsed.unit);
                  const itemTotal = inF ? 0 : Math.round((parsed.quantity || 0) * uPrice);

                  return (
                    <div
                      key={item.id}
                      style={{
                        ...cartStyles.item,
                        opacity: item.is_done ? 0.55 : 1,
                        backgroundColor: inF ? '#ebf8ff' : item.is_done ? '#edf2f7' : '#f8f9fa',
                        borderColor: inF ? '#bee3f8' : '#edf2f7',
                      }}
                      onClick={() => {
                        if (onToggleItemDone) {
                          onToggleItemDone([item.id], !item.is_done);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!item.is_done}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', transform: 'scale(1.15)', marginRight: '10px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={cartStyles.dishName}>[{item.dish}]</span>
                        <p
                          style={{
                            ...cartStyles.itemText,
                            textDecoration: item.is_done ? 'line-through' : 'none',
                          }}
                        >
                          {item.text}
                          {inF && (
                            <span style={{ ...cartStyles.fridgeBadge, marginLeft: '6px' }}>
                              🧊 Có sẵn trong tủ
                            </span>
                          )}
                        </p>
                      </div>

                      <div
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginRight: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={cartStyles.totalItemPrice}>
                          {inF ? '0 đ' : `~${(Number.isFinite(itemTotal) ? itemTotal : 0).toLocaleString('vi-VN')} đ`}
                        </span>
                        {!inF && (
                          <span style={{ fontSize: '0.68rem', color: '#a0aec0' }}>
                            ({uPrice.toLocaleString('vi-VN')}đ/{parsed.unit})
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.id);
                        }}
                        style={cartStyles.btnDelete}
                        title="Xóa mục này"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
          </div>
        )}

        {/* Footer Tổng kết */}
        {shoppingList.length > 0 && (
          <div style={cartStyles.footer}>
            <div style={cartStyles.totalBox}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600', display: 'block' }}>
                  Tổng tiền dự toán cần chi:
                </span>
                {deductFridge && (
                  <span style={{ fontSize: '0.72rem', color: '#319795' }}>
                    (Đã trừ bớt các món có trong tủ lạnh)
                  </span>
                )}
              </div>
              <span style={{ fontSize: '1.3rem', color: '#e67e22', fontWeight: '800' }}>
                ~{(Number.isFinite(totalCost) ? totalCost : 0).toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem' }}>VNĐ</span>
              </span>
            </div>

            <button onClick={handleShareZalo} style={cartStyles.btnZalo}>
              💬 Chia sẻ qua Zalo & Nhóm Gia Đình (Realtime)
            </button>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={handleExportExcel} style={cartStyles.btnExcel}>
                📊 Xuất Excel
              </button>
              <button onClick={handlePrint} style={cartStyles.btnPrint}>
                🖨️ In / Lưu PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const cartStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '580px',
    width: '100%',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
    position: 'relative',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  closeBtn: {
    position: 'absolute',
    top: '18px', right: '18px',
    background: '#f1f2f6', border: 'none',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontWeight: 'bold', color: '#666',
    zIndex: 1,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '14px', paddingRight: '36px',
  },
  title: {
    margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#2d3436',
  },
  btnClear: {
    background: 'transparent', border: 'none', color: '#e74c3c',
    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
  },
  tabContainer: {
    display: 'flex', gap: '8px',
    background: '#f1f2f6', padding: '4px', borderRadius: '12px',
  },
  tabBtn: {
    flex: 1, border: 'none', background: 'transparent',
    padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem',
    fontWeight: '600', color: '#636e72', cursor: 'pointer',
  },
  tabActive: {
    background: '#fff', color: '#2d3436', boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
  },
  emptyState: {
    textAlign: 'center', padding: '40px 10px',
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: '10px',
    overflowY: 'auto', maxHeight: '42vh', paddingRight: '4px',
  },
  item: {
    display: 'flex', alignItems: 'center', padding: '10px 12px',
    borderRadius: '12px', border: '1px solid #edf2f7', cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dishName: {
    fontSize: '0.75rem', color: '#e67e22', fontWeight: '600', display: 'block', marginTop: '3px',
  },
  itemText: {
    margin: 0, fontSize: '0.9rem', color: '#2d3436', fontWeight: '500',
  },
  qtyBadge: {
    backgroundColor: '#ebf8ff',
    color: '#3182ce',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  packBadge: {
    backgroundColor: '#f0fff4',
    color: '#27ae60',
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid #c6f6d5',
  },
  fridgeBadge: {
    backgroundColor: '#e6fffa',
    color: '#319795',
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid #81e6d9',
  },
  priceInput: {
    width: '60px',
    padding: '3px 5px',
    borderRadius: '6px',
    border: '1px solid #cbd5e0',
    fontSize: '0.75rem',
    textAlign: 'right',
    outline: 'none',
    fontWeight: '600',
    color: '#2d3436',
  },
  totalItemPrice: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#2d3436',
  },
  btnDelete: {
    background: 'transparent', border: 'none', color: '#b2bec3',
    cursor: 'pointer', fontSize: '1rem', padding: '4px',
  },
  footer: {
    marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f2f6',
  },
  totalBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#fffaf0',
    border: '1px solid #feebc8',
    borderRadius: '12px',
    marginBottom: '10px',
  },
  btnZalo: {
    width: '100%', backgroundColor: '#0068FF', color: '#fff',
    border: 'none', padding: '12px', borderRadius: '12px',
    fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    boxShadow: '0 4px 12px rgba(0, 104, 255, 0.25)',
  },
  btnExcel: {
    flex: 1, backgroundColor: '#217346', color: '#fff',
    border: 'none', padding: '10px', borderRadius: '10px',
    fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
  },
  btnPrint: {
    flex: 1, backgroundColor: '#f1f2f6', color: '#2d3436',
    border: '1px solid #ddd', padding: '10px', borderRadius: '10px',
    fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
  },
};