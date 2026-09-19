'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function CartModal({
  isOpen,
  shoppingList = [],
  onClose,
  onRemoveItem,
  onClearCart,
}) {
  const [viewMode, setViewMode] = useState('merged'); // 'merged' hoặc 'byDish'
  const [checkedItems, setCheckedItems] = useState({});

  if (!isOpen) return null;

  const toggleChecked = (key) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Gom nhóm nguyên liệu trùng tên
  const mergedList = shoppingList.reduce((acc, item) => {
    const rawText = (item.text || '').trim();
    const namePart = rawText.includes(':') ? rawText.split(':')[0].trim() : rawText;
    const key = namePart.toLowerCase();

    if (!acc[key]) {
      acc[key] = {
        name: namePart,
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

  // 1. Sao chép tin nhắn gửi Zalo
  const handleCopyForZalo = () => {
    if (shoppingList.length === 0) return;

    let textToSend = '🛒 DANH SÁCH NGUYÊN LIỆU ĐI CHỢ:\n';
    textToSend += '────────────────────\n';

    if (viewMode === 'merged') {
      mergedItems.forEach((item, index) => {
        textToSend += `${index + 1}. ${item.name} (${item.dishes.join(', ')})\n`;
        if (item.details.length > 0 && item.details.some((d) => d.includes(':'))) {
          textToSend += `   👉 ${item.details.join(' + ')}\n`;
        }
      });
    } else {
      shoppingList.forEach((item, index) => {
        textToSend += `${index + 1}. ${item.text} [${item.dish}]\n`;
      });
    }

    textToSend += '────────────────────\n';
    textToSend += 'Mua giúp mình nhé, cảm ơn nhiều! ❤️';

    navigator.clipboard
      .writeText(textToSend)
      .then(() => alert('Đã sao chép danh sách đi chợ! Hãy mở Zalo và dán (Paste) để gửi.'))
      .catch((err) => alert('Lỗi sao chép: ' + err.message));
  };

  // 2. Xuất file Excel (.xlsx)
  const handleExportExcel = () => {
    if (shoppingList.length === 0) return;

    let excelData = [];
    if (viewMode === 'merged') {
      excelData = mergedItems.map((item, idx) => ({
        'STT': idx + 1,
        'Tên nguyên liệu': item.name,
        'Chi tiết định lượng': item.details.join(' + '),
        'Món ăn áp dụng': item.dishes.join(', '),
      }));
    } else {
      excelData = shoppingList.map((item, idx) => ({
        'STT': idx + 1,
        'Món ăn': item.dish,
        'Nguyên liệu & Định lượng': item.text,
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách đi chợ');

    // Tự động căn chỉnh độ rộng cột
    const maxColWidth = [
      { wch: 6 },
      { wch: 30 },
      { wch: 35 },
      { wch: 30 },
    ];
    worksheet['!cols'] = maxColWidth;

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Danh_Sach_Di_Cho_${dateStr}.xlsx`);
  };

  // 3. Mở cửa sổ in / Lưu PDF
  const handlePrint = () => {
    if (shoppingList.length === 0) return;

    const printWindow = window.open('', '_blank');
    const itemsHtml = (viewMode === 'merged' ? mergedItems : shoppingList)
      .map((item, idx) => {
        if (viewMode === 'merged') {
          return `
            <tr>
              <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.details.join(' + ')}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #555;">${item.dishes.join(', ')}</td>
            </tr>
          `;
        }
        return `
          <tr>
            <td style="text-align:center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.dish}</td>
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="2">${item.text}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <html>
        <head>
          <title>Danh sách đi chợ - Bếp Nhà</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #e67e22; margin-bottom: 4px; }
            p.sub { text-align: center; font-size: 0.85rem; color: #777; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h2>🛒 DANH SÁCH NGUYÊN LIỆU ĐI CHỢ</h2>
          <p class="sub">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align:center;">STT</th>
                <th>${viewMode === 'merged' ? 'Nguyên liệu' : 'Món ăn'}</th>
                <th>Định lượng chi tiết</th>
                <th>${viewMode === 'merged' ? 'Món ăn' : ''}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div style={cartStyles.overlay} onClick={onClose}>
      <div style={cartStyles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={cartStyles.closeBtn}>
          ✕
        </button>

        {/* Tiêu đề */}
        <div style={cartStyles.header}>
          <div>
            <h2 style={cartStyles.title}>🛒 Giỏ đi chợ</h2>
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

        {/* Tabs chế độ xem */}
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
                        <span style={cartStyles.dishName}>
                          Dùng cho: {item.dishes.join(', ')}
                        </span>
                        {item.details.length > 1 && (
                          <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#718096' }}>
                            Chi tiết: {item.details.join(' + ')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              : shoppingList.map((item) => {
                  const itemKey = `single-${item.id}`;
                  const isDone = !!checkedItems[itemKey];

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

        {/* Thanh công cụ hành động (Zalo, Excel, In) */}
        {shoppingList.length > 0 && (
          <div style={cartStyles.footer}>
            <button onClick={handleCopyForZalo} style={cartStyles.btnZalo}>
              📲 Gửi qua Zalo
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
    overflowY: 'auto', maxHeight: '46vh', paddingRight: '4px',
  },
  item: {
    display: 'flex', alignItems: 'center', padding: '10px 14px',
    borderRadius: '12px', border: '1px solid #edf2f7', cursor: 'pointer',
  },
  dishName: {
    fontSize: '0.75rem', color: '#e67e22', fontWeight: '600', display: 'block',
  },
  itemText: {
    margin: '2px 0 0 0', fontSize: '0.9rem', color: '#2d3436', fontWeight: '500',
  },
  btnDelete: {
    background: 'transparent', border: 'none', color: '#b2bec3',
    cursor: 'pointer', fontSize: '1rem', padding: '4px 8px',
  },
  footer: {
    marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f2f6',
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