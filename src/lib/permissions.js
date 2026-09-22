// src/lib/permissions.js

// Danh sách số điện thoại Admin cứng mặc định
export const ROOT_ADMIN_PHONES = ['0868462891', '0342235356'];

/**
 * Trích xuất số điện thoại từ thông tin user của Supabase
 */
export function extractUserPhone(user) {
  if (!user) return null;
  if (user.user_metadata?.raw_phone) {
    return user.user_metadata.raw_phone.trim();
  }
  const email = (user.email || '').trim();
  if (email.endsWith('@bep-nha-nextjs.vercel.app')) {
    return email.replace('@bep-nha-nextjs.vercel.app', '');
  }
  if (email.endsWith('@phone.bepnha.com')) {
    return email.replace('@phone.bepnha.com', '');
  }
  // Nếu là số điện thoại thuần
  if (/^\d{9,11}$/.test(email.split('@')[0])) {
    return email.split('@')[0];
  }
  return null;
}

/**
 * Kiểm tra xem user có quyền sửa / cập nhật / xóa công thức không
 * (Bao gồm Admin và Editor được cấp phép)
 */
export function canManageRecipe(user, roleData = null) {
  if (!user) return false;
  const phone = extractUserPhone(user);
  if (phone && ROOT_ADMIN_PHONES.includes(phone)) return true;

  if (roleData) {
    return roleData.role === 'admin' || roleData.role === 'editor';
  }
  return false;
}

/**
 * Kiểm tra xem user có quyền Admin quản trị viên không
 */
export function isUserAdmin(user, roleData = null) {
  if (!user) return false;
  const phone = extractUserPhone(user);
  if (phone && ROOT_ADMIN_PHONES.includes(phone)) return true;

  return roleData?.role === 'admin';
}