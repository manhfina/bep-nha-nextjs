'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// Đơn giá tham khảo mặc định trên 1 đơn vị tính (VNĐ)
const DEFAULT_UNIT_PRICES = {
  'trứng': 3500,     // 3.500đ / quả
  'thịt bò': 280,    // 280đ / gram (28.000đ / lạng)
  'thịt heo': 140,   // 140đ / gram (14.000đ / lạng)
  'thịt lợn': 140,
  'thịt xay': 140,   // 140đ / gram
  'cua đồng': 180,   // 180đ / gram
  'thịt gà': 90,     // 90đ / gram
  'cà chua': 3000,   // 3.000đ / quả hoặc củ
  'rau cải': 22,     // 22đ / gram (~8.000đ/bó)
  'cải ngọt': 22,
  'cần tây': 50,     // 50đ / gram
  'hành lá': 2000,   // 2.000đ / nhánh, cây
  'hành tím': 60,    // 60đ / gram
  'tỏi': 1500,       // 1.500đ / tép
  'đậu phụ': 4000,   // 4.000đ / bìa, miếng
  'cà rốt': 4000,    // 4.000đ / củ
  'khoai tây': 5000, // 5.000đ / củ
  'nấm': 60,         // 60đ / gram
  'mì': 3500,        // 3.500đ / vắt, gói
  'mắm tôm': 1000,
  'dầu ăn': 1000,
  'nước mắm': 1000,
  'dầu hào': 1000,
  'tiêu': 500,
  'ớt': 500,
  'gia vị': 500,
};

// Nhóm từ đồng nghĩa để gom chung 1 nguyên liệu
const CANONICAL_ALIASES = [
  { key: 'thịt heo xay', aliases: ['thịt xay', 'thịt heo xay', 'thịt lợn xay', 'thịt băm'] },
  { key: 'thịt ba chỉ', aliases: ['ba chỉ', 'thịt ba chỉ', 'thịt ba rọi'] },
  { key: 'thịt bò', aliases: ['thịt bò', 'bắp bò', 'nạm bò', 'thăn bò'] },
  { key: 'thịt gà', aliases: ['thịt gà', 'ức gà', 'đùi gà', 'cánh gà'] },
  { key: 'cua đồng xay', aliases: ['cua xay', 'cua đồng xay', 'thịt cua đồng', 'cua đồng'] },
  { key: 'trứng gà', aliases: ['trứng gà', 'trứng'] },
  { key: 'hành tím', aliases: ['hành tím', 'hành khô', 'hành tím băm'] },
  { key: 'tỏi', aliases: ['tỏi', 'tỏi băm', 'tỏi củ'] },
  { key: 'hành lá', aliases: ['hành lá', 'hành hoa', 'hành ngò'] },
  { key: 'đậu phụ', aliases: ['đậu phụ', 'đậu hũ', 'tàu hũ'] },
  { key: 'rau cải ngọt', aliases: ['rau cải ngọt', 'cải ngọt', 'rau cải'] },
  { key: 'gia vị thông dụng', aliases: ['gia vị', 'nêm nếm', 'muối, đường', 'bột ngọt'] },
];

const getCanonicalKey = (name = '') => {
  const clean = name.toLowerCase().trim();
  for (const group of CANONICAL_ALIASES) {
    if (group.aliases.some(alias => clean.includes(alias))) {
      return group.key;
    }
  }
  return clean;
};

// Hàm phân tích chuỗi nguyên liệu để trích xuất { name, quantity, unit }
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
    const match = rawText.match(/^([\d.,]+)\s*([a-zA-Zà-ỹÀ-Ỹ]+)?\s+(.+)$/);
    if (match) {
      quantity = parseFloat(match[1].replace(',', '.')) || 1;
      unit = (match[2] || '').trim();
      name = match[3].trim();
    }
  }

  // Chuẩn hóa đơn vị khối lượng về gram (g) để cộng dồn chính xác
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
const getSuggestedPack = (unit, qty) => {
  const u = (unit || '').toLowerCase();
  if (u === 'g') {
    if (qty >= 1000) {
      const kg = Math.ceil(qty / 100) / 10;
      return `Mua ${kg} kg`;
    }
    const rounded = Math.ceil(qty / 50) * 50;
    return `Mua chẵn ${rounded}g (~${Math.round(rounded / 100)} lạng)`;
  }
  if (['quả', 'trái', 'miếng', 'vắt', 'bó', 'củ'].includes(u)) {
    return `Mua chẵn ${Math.ceil(qty)} ${u}`;
  }
  if (['ít', 'chút', 'thìa', 'muỗng', 'phần'].includes(u)) {
    return 'Gia vị sẵn có trong bếp';
  }
  return `Mua ~${Math.ceil(qty)} ${unit}`;
};

const guessUnitPrice = (cleanKey) => {
  for (const [key, price] of Object.entries(DEFAULT_UNIT_PRICES)) {
    if (cleanKey.includes(key) || key.includes(cleanKey)) return price;
  }
  return 3000;
};

export default function CartModal({
  isOpen,
  shoppingList = [],
  onClose,
  onRemoveItem,
  onClearCart,
}) {
  const [viewMode, setViewMode] = useState('merged'); // 'merged' hoặc 'byDish'
  const [checkedItems, setCheckedItems] = useState({});
  const [customUnitPrices, setCustomUnitPrices] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bepnha_unit_prices');
      if (saved) setCustomUnitPrices(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!isOpen) return null;

  const toggleChecked = (key) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleUnitPriceChange = (key, val) => {
    const numeric = parseInt(val, 10) || 0;
    const updated = { ...customUnitPrices, [key]: numeric };
    setCustomUnitPrices(updated);
    try {
      localStorage.setItem('bepnha_unit_prices', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const getUnitPrice = (key) => {
    if (customUnitPrices[key] !== undefined) return customUnitPrices[key];
    return guessUnitPrice(key);
  };

  // Gom nhóm chuẩn xác theo cleanKey và cùng hệ đơn vị
  const mergedList = shoppingList.reduce((acc, item) => {
    const parsed = parseIngredient(item.text);
    const key = `${parsed.cleanKey}__${parsed.unit}`;

    if (!acc[key]) {
      acc[key] = {
        name: parsed.name,
        key: parsed.cleanKey,
        groupKey: key,
        totalQuantity: parsed.quantity,
        unit: parsed.unit,
        suggested: getSuggestedPack(parsed.unit, parsed.quantity),
        dishes: [item.dish],
        ids: [item.id],
      };
    } else {
      acc[key].totalQuantity = Math.round((acc[key].totalQuantity + parsed.quantity) * 100) / 100;
      acc[key].suggested = getSuggestedPack(acc[key].unit, acc[key].totalQuantity);
      if (!acc[key].dishes.includes(item.dish)) {
        acc[key].dishes.push(item.dish);
      }
      acc[key].ids.push(item.id);
    }
    return acc;
  }, {});

  const mergedItems = Object.values(mergedList);

  // Tính tổng chi phí
  const totalCost = (viewMode === 'merged' ? mergedItems : shoppingList).reduce((sum, item) => {
    if (viewMode === 'merged') {
      const uPrice = getUnitPrice(item.key);
      return sum + Math.round(item.totalQuantity * uPrice);
    } else {
      const parsed = parseIngredient(item.text);
      const uPrice = getUnitPrice(parsed.cleanKey);
      return sum + Math.round(parsed.quantity * uPrice);
    }
  }, 0);

  // 1. Sao chép tin nhắn Zalo kèm gợi ý đóng gói
  const handleCopyForZalo = () => {
    if (shoppingList.length === 0) return;

    let textToSend = '🛒 DANH SÁCH & GỢI Ý MUA THỰC PHẨM ĐI CHỢ:\n';
    textToSend += '────────────────────\n';

    if (viewMode === 'merged') {
      mergedItems.forEach((item, index) => {
        const uPrice = getUnitPrice(item.key);
        const itemTotal = Math.round(item.totalQuantity * uPrice);
        textToSend += `${index + 1}. ${item.name}: ${item.totalQuantity} ${item.unit} [👉 ${item.suggested}] (~${itemTotal.toLocaleString('vi-VN')}đ)\n`;
        textToSend += `   🍲 Dùng cho: ${item.dishes.join(', ')}\n`;
      });
    } else {
      shoppingList.forEach((item, index) => {
        const parsed = parseIngredient(item.text);
        const uPrice = getUnitPrice(parsed.cleanKey);
        const itemTotal = Math.round(parsed.quantity * uPrice);
        textToSend += `${index + 1}. ${item.text} (~${itemTotal.toLocaleString('vi-VN')}đ) [${item.dish}]\n`;
      });
    }

    textToSend += '────────────────────\n';
    textToSend += `💰 TỔNG TIỀN DỰ TOÁN: ~${totalCost.toLocaleString('vi-VN')} VNĐ\n`;
    textToSend += 'Mua giúp mình theo danh sách này nhé! Cảm ơn nhiều ❤️';

    navigator.clipboard
      .writeText(textToSend)
      .then(() => alert('Đã sao chép danh sách đi chợ! Hãy dán vào Zalo để gửi.'))
      .catch((err) => alert('Lỗi sao chép: ' + err.message));
  };

  // 2. Xuất Excel chi tiết kèm cột Gợi ý mua thực tế
  const handleExportExcel = () => {
    if (shoppingList.length === 0) return;

    let excelData = [];
    if (viewMode === 'merged') {
      excelData = mergedItems.map((item, idx) => {
        const uPrice = getUnitPrice(item.key);
        return {
          'STT': idx + 1,
          'Tên nguyên liệu': item.name,
          'Cần dùng': `${item.totalQuantity} ${item.unit}`,
          'Gợi ý mua ngoài chợ': item.suggested,
          'Đơn giá (VNĐ)': uPrice,
          'Thành tiền (VNĐ)': Math.round(item.totalQuantity * uPrice),
          'Món ăn áp dụng': item.dishes.join(', '),
        };
      });
    } else {
      excelData = shoppingList.map((item, idx) => {
        const parsed = parseIngredient(item.text);
        const uPrice = getUnitPrice(parsed.cleanKey);
        return {
          'STT': idx + 1,
          'Món ăn': item.dish,
          'Nguyên liệu': parsed.name,
          'Cần dùng': `${parsed.quantity} ${parsed.unit}`,
          'Gợi ý mua ngoài chợ': getSuggestedPack(parsed.unit, parsed.quantity),
          'Đơn giá (VNĐ)': uPrice,
          'Thành tiền (VNĐ)': Math.round(parsed.quantity * uPrice),
        };
      });
    }

    excelData.push({
      'STT': 'TỔNG',
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

    worksheet['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 26 }];
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Chi_Phi_Di_Cho_${dateStr}.xlsx`);
  };

  // 3. In hóa đơn/danh sách chuẩn khổ giấy
  const handlePrint = () => {
    if (shoppingList.length === 0) return;

    const printWindow = window.open('', '_blank');
    const itemsHtml = (viewMode === 'merged' ? mergedItems : shoppingList)
      .map((item, idx) => {
        if (viewMode === 'merged') {
          const uPrice = getUnitPrice(item.key);
          const itemTotal = Math.round(item.totalQuantity * uPrice);
          return `
            <tr>
              <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.name}</td>
              <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${item.totalQuantity} ${item.unit}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #27ae60; font-weight: 500;">${item.suggested}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #555;">${item.dishes.join(', ')}</td>
              <td style="text-align:right; padding: 8px; border: 1px solid #ddd;">${itemTotal.toLocaleString('vi-VN')} đ</td>
            </tr>
          `;
        }
        const parsed = parseIngredient(item.text);
        const uPrice = getUnitPrice(parsed.cleanKey);
        const itemTotal = Math.round(parsed.quantity * uPrice);
        return `
          <tr>
            <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.dish}</td>
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="3">${item.text}</td>
            <td style="text-align:right; padding: 8px; border: 1px solid #ddd;">${itemTotal.toLocaleString('vi-VN')} đ</td>
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
                <th style="width: 40px; text-align:center;">STT</th>
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
                <td colspan="5" style="padding: 10px 8px; border: 1px solid #ddd; text-align: right;">TỔNG CHI PHÍ:</td>
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
            <h2 style={cartStyles.title}>🛒 Giỏ đi chợ & Dự toán</h2>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              Tự động gom nhóm, quy đổi chẵn gói & tính tiền
            </span>
          </div>
          {shoppingList.length > 0 && (
            <button onClick={onClearCart} style={cartStyles.btnClear}>
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Chuyển Tabs */}
        {shoppingList.length > 0 && (
          <div style={cartStyles.tabContainer}>
            <button
              onClick={() => setViewMode('merged')}
              style={{
                ...cartStyles.tabBtn,
                ...(viewMode === 'merged' ? cartStyles.tabActive : {}),
              }}
            >
              Gom nhóm nguyên liệu ({mergedItems.length})
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
                  const itemKey = `merged-${item.groupKey}`;
                  const isDone = !!checkedItems[itemKey];
                  const uPrice = getUnitPrice(item.key);
                  const itemTotal = Math.round(item.totalQuantity * uPrice);

                  return (
                    <div
                      key={itemKey}
                      style={{
                        ...cartStyles.item,
                        opacity: isDone ? 0.55 : 1,
                        backgroundColor: isDone ? '#edf2f7' : '#f8f9fa',
                      }}
                      onClick={() => toggleChecked(itemKey)}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', transform: 'scale(1.15)', marginRight: '10px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              ...cartStyles.itemText,
                              fontWeight: '700',
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {item.name}
                          </span>
                          <span style={cartStyles.qtyBadge}>
                            {item.totalQuantity} {item.unit}
                          </span>
                          <span style={cartStyles.packBadge}>
                            {item.suggested}
                          </span>
                        </div>
                        <span style={cartStyles.dishName}>Dùng cho: {item.dishes.join(', ')}</span>
                      </div>

                      {/* Cột chỉnh đơn vị giá & xem thành tiền */}
                      <div
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <input
                            type="number"
                            step="100"
                            value={uPrice}
                            onChange={(e) => handleUnitPriceChange(item.key, e.target.value)}
                            style={cartStyles.priceInput}
                            title={`Đơn giá cho mỗi ${item.unit}`}
                          />
                          <span style={{ fontSize: '0.7rem', color: '#718096' }}>đ/{item.unit}</span>
                        </div>
                        <span style={cartStyles.totalItemPrice}>
                          ~{itemTotal.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  );
                })
              : shoppingList.map((item) => {
                  const itemKey = `single-${item.id}`;
                  const isDone = !!checkedItems[itemKey];
                  const parsed = parseIngredient(item.text);
                  const uPrice = getUnitPrice(parsed.cleanKey);
                  const itemTotal = Math.round(parsed.quantity * uPrice);

                  return (
                    <div
                      key={item.id}
                      style={{
                        ...cartStyles.item,
                        opacity: isDone ? 0.55 : 1,
                        backgroundColor: isDone ? '#edf2f7' : '#f8f9fa',
                      }}
                      onClick={() => toggleChecked(itemKey)}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', transform: 'scale(1.15)', marginRight: '10px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={cartStyles.dishName}>[{item.dish}]</span>
                        <p
                          style={{
                            ...cartStyles.itemText,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {item.text}
                        </p>
                      </div>

                      <div
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginRight: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={cartStyles.totalItemPrice}>
                          ~{itemTotal.toLocaleString('vi-VN')} đ
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#a0aec0' }}>
                          ({uPrice.toLocaleString('vi-VN')}đ/{parsed.unit})
                        </span>
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

        {/* Tổng kết chi phí & Các nút hành động */}
        {shoppingList.length > 0 && (
          <div style={cartStyles.footer}>
            <div style={cartStyles.totalBox}>
              <span style={{ fontSize: '0.9rem', color: '#555', fontWeight: '600' }}>
                Tổng tiền ước tính:
              </span>
              <span style={{ fontSize: '1.3rem', color: '#e67e22', fontWeight: '800' }}>
                ~{totalCost.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem' }}>VNĐ</span>
              </span>
            </div>

            <button onClick={handleCopyForZalo} style={cartStyles.btnZalo}>
              📲 Gửi Zalo kèm bảng tính & gợi ý mua
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
    maxWidth: '560px',
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
    display: 'flex', gap: '8px', marginBottom: '14px',
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
    border: 'none', padding: '11px', borderRadius: '10px',
    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
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