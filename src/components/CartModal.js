'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// Bảng giá ước tính mặc định thị trường (VNĐ)
const DEFAULT_PRICE_MAP = {
  'trứng': 3500,
  'thịt bò': 35000,
  'thịt heo': 20000,
  'thịt lợn': 20000,
  'thịt gà': 15000,
  'cà chua': 4000,
  'cần tây': 5000,
  'hành lá': 2000,
  'tỏi': 3000,
  'đậu phụ': 5000,
  'cà rốt': 4000,
  'khoai tây': 5000,
  'nấm': 12000,
  'nước mắm': 5000,
  'dầu hào': 4000,
  'hạt tiêu': 2000,
  'đường': 1000,
  'ớt': 1000,
};

// Hàm đoán giá ước tính dựa vào tên nguyên liệu
const guessInitialPrice = (name) => {
  const lower = name.toLowerCase();
  for (const [key, price] of Object.entries(DEFAULT_PRICE_MAP)) {
    if (lower.includes(key)) return price;
  }
  return 10000; // Giá mặc định nếu chưa biết nguyên liệu
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
  const [customPrices, setCustomPrices] = useState({});

  // Nạp đơn giá người dùng từng lưu trước đó từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bepnha_item_prices');
      if (saved) setCustomPrices(JSON.parse(saved));
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

  // Cập nhật giá tùy chỉnh cho từng nguyên liệu
  const handlePriceChange = (nameKey, newPrice) => {
    const numeric = parseInt(newPrice) || 0;
    const updated = { ...customPrices, [nameKey]: numeric };
    setCustomPrices(updated);
    try {
      localStorage.setItem('bepnha_item_prices', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Gom nhóm nguyên liệu trùng tên
  const mergedList = shoppingList.reduce((acc, item) => {
    const rawText = (item.text || '').trim();
    const namePart = rawText.includes(':') ? rawText.split(':')[0].trim() : rawText;
    const key = namePart.toLowerCase();

    if (!acc[key]) {
      acc[key] = {
        name: namePart,
        key: key,
        details: [rawText],
        dishes: [item.dish],
        ids: [item.id],
      };
    } else {
      acc[key].details.push(rawText);
      if (!acc[key].dishes.includes(item.dish)) {
        acc[key].dishes.push(item.dish);
      }
      acc[key].ids.push(item.id);
    }
    return acc;
  }, {});

  const mergedItems = Object.values(mergedList);

  // Tính giá của từng mục
  const getItemPrice = (nameKey) => {
    if (customPrices[nameKey] !== undefined) return customPrices[nameKey];
    return guessInitialPrice(nameKey);
  };

  // Tổng chi phí dự kiến
  const totalCost = (viewMode === 'merged' ? mergedItems : shoppingList).reduce((sum, item) => {
    const key = (viewMode === 'merged' ? item.name : item.text.split(':')[0]).toLowerCase();
    return sum + getItemPrice(key);
  }, 0);

  // 1. Sao chép tin nhắn gửi Zalo kèm dự toán chi phí
  const handleCopyForZalo = () => {
    if (shoppingList.length === 0) return;

    let textToSend = '🛒 DANH SÁCH & CHI PHÍ ĐI CHỢ:\n';
    textToSend += '────────────────────\n';

    if (viewMode === 'merged') {
      mergedItems.forEach((item, index) => {
        const p = getItemPrice(item.key);
        textToSend += `${index + 1}. ${item.name} (~${p.toLocaleString('vi-VN')}đ) [${item.dishes.join(', ')}]\n`;
        if (item.details.length > 0 && item.details.some((d) => d.includes(':'))) {
          textToSend += `   👉 ${item.details.join(' + ')}\n`;
        }
      });
    } else {
      shoppingList.forEach((item, index) => {
        const key = item.text.split(':')[0].toLowerCase();
        const p = getItemPrice(key);
        textToSend += `${index + 1}. ${item.text} (~${p.toLocaleString('vi-VN')}đ) [${item.dish}]\n`;
      });
    }

    textToSend += '────────────────────\n';
    textToSend += `💰 TỔNG CHI PHÍ DỰ KIẾN: ~${totalCost.toLocaleString('vi-VN')} VNĐ\n`;
    textToSend += 'Nhờ bạn mua giúp mình nhé! Cảm ơn nhiều! ❤️';

    navigator.clipboard
      .writeText(textToSend)
      .then(() => alert('Đã sao chép danh sách kèm chi phí! Hãy dán vào Zalo để gửi.'))
      .catch((err) => alert('Lỗi sao chép: ' + err.message));
  };

  // 2. Xuất Excel kèm chi phí
  const handleExportExcel = () => {
    if (shoppingList.length === 0) return;

    let excelData = [];
    if (viewMode === 'merged') {
      excelData = mergedItems.map((item, idx) => ({
        'STT': idx + 1,
        'Tên nguyên liệu': item.name,
        'Chi tiết định lượng': item.details.join(' + '),
        'Món ăn áp dụng': item.dishes.join(', '),
        'Đơn giá dự kiến (VNĐ)': getItemPrice(item.key),
      }));
    } else {
      excelData = shoppingList.map((item, idx) => {
        const key = item.text.split(':')[0].toLowerCase();
        return {
          'STT': idx + 1,
          'Món ăn': item.dish,
          'Nguyên liệu & Định lượng': item.text,
          'Đơn giá dự kiến (VNĐ)': getItemPrice(key),
        };
      });
    }

    // Dòng tổng cộng
    excelData.push({
      'STT': 'TỔNG CỘNG',
      'Tên nguyên liệu': '',
      'Chi tiết định lượng': '',
      'Món ăn áp dụng': '',
      'Đơn giá dự kiến (VNĐ)': totalCost,
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi phí đi chợ');

    worksheet['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 }];
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Chi_Phi_Di_Cho_${dateStr}.xlsx`);
  };

  // 3. In kèm dự toán chi phí
  const handlePrint = () => {
    if (shoppingList.length === 0) return;

    const printWindow = window.open('', '_blank');
    const itemsHtml = (viewMode === 'merged' ? mergedItems : shoppingList)
      .map((item, idx) => {
        const key = (viewMode === 'merged' ? item.name : item.text.split(':')[0]).toLowerCase();
        const price = getItemPrice(key);

        if (viewMode === 'merged') {
          return `
            <tr>
              <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.details.join(' + ')}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #555;">${item.dishes.join(', ')}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${price.toLocaleString('vi-VN')} đ</td>
            </tr>
          `;
        }
        return `
          <tr>
            <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.dish}</td>
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="2">${item.text}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${price.toLocaleString('vi-VN')} đ</td>
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
          <h2>🛒 DỰ TOÁN CHI PHÍ ĐI CHỢ</h2>
          <p class="sub">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align:center;">STT</th>
                <th>${viewMode === 'merged' ? 'Nguyên liệu' : 'Món ăn'}</th>
                <th>Định lượng</th>
                <th>${viewMode === 'merged' ? 'Món áp dụng' : ''}</th>
                <th style="text-align: right; width: 120px;">Dự toán</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="4" style="padding: 10px 8px; border: 1px solid #ddd; text-align: right;">TỔNG CỘNG DỰ KIẾN:</td>
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
            <h2 style={cartStyles.title}>🛒 Giỏ đi chợ & Chi phí</h2>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              {shoppingList.length} nguyên liệu cần mua
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

        {/* Danh sách */}
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
                  const itemKey = `merged-${item.name}`;
                  const isDone = !!checkedItems[itemKey];
                  const currentPrice = getItemPrice(item.key);

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
                        <span
                          style={{
                            ...cartStyles.itemText,
                            fontWeight: '600',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={cartStyles.dishName}>Dùng cho: {item.dishes.join(', ')}</span>
                        {item.details.length > 1 && (
                          <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#718096' }}>
                            {item.details.join(' + ')}
                          </p>
                        )}
                      </div>

                      {/* Ô nhập giá ước tính */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          step="1000"
                          value={currentPrice}
                          onChange={(e) => handlePriceChange(item.key, e.target.value)}
                          style={cartStyles.priceInput}
                          title="Bấm để sửa đơn giá ước tính"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>đ</span>
                      </div>
                    </div>
                  );
                })
              : shoppingList.map((item) => {
                  const itemKey = `single-${item.id}`;
                  const isDone = !!checkedItems[itemKey];
                  const rawKey = item.text.split(':')[0].toLowerCase();
                  const currentPrice = getItemPrice(rawKey);

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
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          step="1000"
                          value={currentPrice}
                          onChange={(e) => handlePriceChange(rawKey, e.target.value)}
                          style={cartStyles.priceInput}
                          title="Bấm để sửa đơn giá ước tính"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>đ</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.id);
                        }}
                        style={cartStyles.btnDelete}
                        title="Xóa món này"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
          </div>
        )}

        {/* Thanh tổng kết ngân sách & Hành động */}
        {shoppingList.length > 0 && (
          <div style={cartStyles.footer}>
            {/* Box tổng tiền */}
            <div style={cartStyles.totalBox}>
              <span style={{ fontSize: '0.9rem', color: '#555', fontWeight: '500' }}>
                Tổng dự kiến:
              </span>
              <span style={{ fontSize: '1.25rem', color: '#e67e22', fontWeight: '800' }}>
                ~{totalCost.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem' }}>VNĐ</span>
              </span>
            </div>

            <button onClick={handleCopyForZalo} style={cartStyles.btnZalo}>
              📲 Gửi Zalo kèm dự toán
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
    maxWidth: '520px',
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
  priceInput: {
    width: '68px',
    padding: '4px 6px',
    borderRadius: '6px',
    border: '1px solid #cbd5e0',
    fontSize: '0.8rem',
    textAlign: 'right',
    outline: 'none',
    fontWeight: '600',
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
    padding: '8px 12px',
    backgroundColor: '#fffaf0',
    border: '1px solid #feebc8',
    borderRadius: '10px',
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