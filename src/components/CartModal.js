'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// Đơn giá tham khảo mặc định trên 1 đơn vị tính (VNĐ)
const DEFAULT_UNIT_PRICES = {
  'trứng': 3500,     // 3.500đ / quả
  'thịt bò': 300,    // 300đ / gram (30.000đ / lạng)
  'thịt heo': 180,   // 180đ / gram (18.000đ / lạng)
  'thịt lợn': 180,
  'thịt gà': 120,    // 120đ / gram
  'cà chua': 4000,   // 4.000đ / quả hoặc củ
  'cần tây': 50,     // 50đ / gram
  'hành lá': 2000,   // 2.000đ / nhánh, cây
  'tỏi': 1500,       // 1.500đ / tép
  'đậu phụ': 4000,   // 4.000đ / bìa, miếng
  'cà rốt': 5000,    // 5.000đ / củ
  'khoai tây': 6000, // 6.000đ / củ
  'nấm': 80,         // 80đ / gram
  'mì': 5000,        // 5.000đ / vắt, gói
  'dầu ăn': 2000,
  'nước mắm': 2000,
  'dầu hào': 2000,
  'tiêu': 1000,
  'ớt': 1000,
};

// Hàm phân tích chuỗi nguyên liệu để trích xuất { name, quantity, unit }
const parseIngredient = (rawText = '') => {
  let name = rawText.trim();
  let quantity = 1;
  let unit = '';

  // Xử lý dạng: "Tên nguyên liệu: 300 gram" hoặc "Tên (3 quả)"
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
    // Thử bắt các mẫu như "300g thịt bò" hoặc "3 quả trứng"
    const match = rawText.match(/^([\d.,]+)\s*([a-zA-Zà-ỹÀ-Ỹ]+)?\s+(.+)$/);
    if (match) {
      quantity = parseFloat(match[1].replace(',', '.')) || 1;
      unit = (match[2] || '').trim();
      name = match[3].trim();
    }
  }

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    cleanKey: name.toLowerCase(),
    quantity: Math.max(0.1, quantity),
    unit: unit || 'phần',
  };
};

const guessUnitPrice = (cleanKey) => {
  for (const [key, price] of Object.entries(DEFAULT_UNIT_PRICES)) {
    if (cleanKey.includes(key)) return price;
  }
  return 5000; // Giá fallback mặc định
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

  // Gom nhóm và cộng dồn số lượng toán học
  const mergedList = shoppingList.reduce((acc, item) => {
    const parsed = parseIngredient(item.text);
    const key = parsed.cleanKey;

    if (!acc[key]) {
      acc[key] = {
        name: parsed.name,
        key: key,
        totalQuantity: parsed.quantity,
        unit: parsed.unit,
        dishes: [item.dish],
        ids: [item.id],
      };
    } else {
      acc[key].totalQuantity = Math.round((acc[key].totalQuantity + parsed.quantity) * 100) / 100;
      if (!acc[key].dishes.includes(item.dish)) {
        acc[key].dishes.push(item.dish);
      }
      acc[key].ids.push(item.id);
    }
    return acc;
  }, {});

  const mergedItems = Object.values(mergedList);

  // Tính tổng chi phí = Tổng (Số lượng x Đơn vị giá)
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

  // 1. Sao chép tin nhắn Zalo kèm định lượng và đơn giá chuẩn
  const handleCopyForZalo = () => {
    if (shoppingList.length === 0) return;

    let textToSend = '🛒 DANH SÁCH & DỰ TOÁN ĐI CHỢ:\n';
    textToSend += '────────────────────\n';

    if (viewMode === 'merged') {
      mergedItems.forEach((item, index) => {
        const uPrice = getUnitPrice(item.key);
        const itemTotal = Math.round(item.totalQuantity * uPrice);
        textToSend += `${index + 1}. ${item.name}: ${item.totalQuantity} ${item.unit} (~${itemTotal.toLocaleString('vi-VN')}đ)\n`;
        textToSend += `   👉 Dùng cho: ${item.dishes.join(', ')}\n`;
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
    textToSend += 'Mua giúp mình nhé! Cảm ơn nhiều ❤️';

    navigator.clipboard
      .writeText(textToSend)
      .then(() => alert('Đã sao chép danh sách đi chợ! Hãy dán vào Zalo để gửi.'))
      .catch((err) => alert('Lỗi sao chép: ' + err.message));
  };

  // 2. Xuất Excel chi tiết có cột Số lượng, Đơn vị, Đơn giá, Thành tiền
  const handleExportExcel = () => {
    if (shoppingList.length === 0) return;

    let excelData = [];
    if (viewMode === 'merged') {
      excelData = mergedItems.map((item, idx) => {
        const uPrice = getUnitPrice(item.key);
        return {
          'STT': idx + 1,
          'Tên nguyên liệu': item.name,
          'Số lượng': item.totalQuantity,
          'Đơn vị': item.unit,
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
          'Số lượng': parsed.quantity,
          'Đơn vị': parsed.unit,
          'Đơn giá (VNĐ)': uPrice,
          'Thành tiền (VNĐ)': Math.round(parsed.quantity * uPrice),
        };
      });
    }

    excelData.push({
      'STT': 'TỔNG',
      'Tên nguyên liệu': '',
      'Số lượng': '',
      'Đơn vị': '',
      'Đơn giá (VNĐ)': '',
      'Thành tiền (VNĐ)': totalCost,
      'Món ăn áp dụng': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi phí đi chợ');

    worksheet['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 26 }];
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
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="2">${item.text}</td>
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
                <th style="text-align:center;">Định lượng</th>
                <th>${viewMode === 'merged' ? 'Món áp dụng' : 'Chi tiết'}</th>
                <th style="text-align:right; width: 110px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="4" style="padding: 10px 8px; border: 1px solid #ddd; text-align: right;">TỔNG CHI PHÍ:</td>
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
              Tự động cộng dồn số lượng & nhân đơn giá
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
              Gộp nguyên liệu ({mergedItems.length})
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
                  const itemKey = `merged-${item.key}`;
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                            step="500"
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
              📲 Gửi Zalo kèm bảng tính
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
    maxWidth: '540px',
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
    fontSize: '0.75rem', color: '#e67e22', fontWeight: '600', display: 'block',
  },
  itemText: {
    margin: '2px 0 0 0', fontSize: '0.9rem', color: '#2d3436', fontWeight: '500',
  },
  qtyBadge: {
    backgroundColor: '#ebf8ff',
    color: '#3182ce',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
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