import { keyRefreshToken, keyToken, linkApi, routerLinks, supabase } from '@utils';
import { Responses } from '@models';
import { customMessage } from '../index';

// =====================================================================================
// api.ts — ĐIỂM SỬA DUY NHẤT khi đổi tầng dữ liệu (xem skill dich-man-hinh-tms).
//
// File này ĐÃ MERGE 2 phần việc làm song song ở 2 cuộc hội thoại khác nhau:
//   - Màn hình ĐƠN HÀNG (danh sách/tạo-sửa/xem) — sql/03..09_*.sql
//   - Màn hình KHO (danh mục nền, CRUD kho, dropdown Tỉnh/Huyện/Xã, Loại kho)
// và vài danh mục nền dùng chung mà cả 2 màn hình cần đọc để đổ dropdown — KHÔNG đụng
// tới pages/ hay store/, các nơi đó vẫn gọi y hệt API.get/post/put/delete như cũ.
//
// Các endpoint chưa được liệt kê ở đây (Auth quên mật khẩu, v.v.) vẫn rơi xuống nhánh
// fetch() cũ bên dưới — sẽ lỗi vì không còn backend .NET, nhưng đó là những màn hình
// CHƯA làm tới theo đúng lộ trình ở HUONG-DAN-PROJECT.md mục 9, không thuộc phạm vi
// đợt này.
// =====================================================================================

// -------------------------------------------------------------------------------------
// 1) Chuyển đổi PascalCase (tên cột Postgres) <-> camelCase (tên field phía React)
// -------------------------------------------------------------------------------------
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

const toPascalKey = (k: string) => (k ? k.charAt(0).toUpperCase() + k.slice(1) : k);
const toCamelKey = (k: string) => (k ? k.charAt(0).toLowerCase() + k.slice(1) : k);

function deepMapKeys(value: any, mapKey: (k: string) => string): any {
  if (Array.isArray(value)) return value.map((v) => deepMapKeys(v, mapKey));
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[mapKey(k)] = deepMapKeys(v, mapKey);
    return out;
  }
  return value;
}

const toPascalDeep = (v: any) => deepMapKeys(v, toPascalKey);
const toCamelDeep = (v: any) => deepMapKeys(v, toCamelKey);

// Đọc 1 khóa trong object filter mà không phân biệt chữ hoa/thường ký tự đầu — dữ liệu
// filter cũ trong code FE có chỗ viết Pascal (FullTextSearch, TrangThai...), có chỗ viết
// camel (khoDiId, entityId...), tùy màn hình.
function filterGet(filter: Record<string, any> | undefined, key: string) {
  if (!filter) return undefined;
  if (key in filter) return filter[key];
  const alt = key.charAt(0) === key.charAt(0).toUpperCase() ? toCamelKey(key) : toPascalKey(key);
  return filter[alt];
}

function parseFilter(params: any): Record<string, any> {
  try {
    return params?.filter ? JSON.parse(params.filter) : {};
  } catch {
    return {};
  }
}

function ok<T>(data: T, message = ''): Responses<T> {
  return { isSuccess: true, data, message, code: 200 } as Responses<T>;
}

function fail(message: string): never {
  customMessage.error({ content: message });
  throw { isSuccess: false, message };
}

async function callRpc<T>(fn: string, args: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) fail(error.message);
  return data as T;
}

function buildPagination<T>(content: T[], page: number, size: number, totalElements: number) {
  return {
    content,
    numberOfElements: content.length,
    page,
    size: size < 0 ? content.length : size,
    totalElements,
    totalPages: size > 0 ? Math.ceil(totalElements / size) : 1,
  };
}

// -------------------------------------------------------------------------------------
// 2) Danh mục nền dùng CHUNG (đọc để đổ dropdown cho màn hình Đơn hàng) — GENERIC READ
//    Ghi (POST/PUT/DELETE) của các bảng này CHƯA làm — nằm trong lộ trình các màn hình
//    danh mục nền riêng (Kho, Khách hàng, Sản phẩm...), không thuộc phạm vi đợt này.
// -------------------------------------------------------------------------------------
const GENERIC_READ_TABLE: Record<string, string> = {
  [routerLinks('KhachHang', 'api')]: 'sm_KhachHang',
  [routerLinks('Kho', 'api')]: 'sm_Kho',
  [routerLinks('SanPham', 'api')]: 'sm_SanPham',
  [routerLinks('ChiPhiVanChuyen', 'api')]: 'sm_ChiPhiVanChuyen',
  [routerLinks('ProductConfiguration', 'api')]: 'sm_ProductConfiguration',
  [routerLinks('LaiXe', 'api')]: 'sm_LaiXe',
  [routerLinks('Xe', 'api')]: 'sm_PhuongTien',
  // Danh mục "Loại kho" cho dropdown màn hình Kho — xem sql/02_kho.sql.
  [routerLinks('CodeTypeManagement', 'api')]: 'sm_CodeType',
};

// Kho: "DiaChiFull" chưa có cột riêng trong DB (xem skill tu-dien-nghiep-vu-tms mục 9,
// sql/02_kho.sql chưa làm) — tạm ghép ở đây để dropdown "Địa chỉ bên giao/nhận" của màn
// Đơn hàng hoạt động được. Khi làm màn hình Kho chính thức, chuyển logic này vào SQL.
function withDiaChiFull(row: any) {
  if (!row || row.DiaChiFull !== undefined) return row;
  const parts = [row.DiaChi, row.CommuneName, row.DistrictName, row.ProvinceName].filter(Boolean);
  return { ...row, DiaChiFull: parts.join(', ') };
}

// sm_ChiPhiVanChuyen chỉ lưu KhoDiId/KhoNhanId (uuid), không lưu sẵn tên kho — cột "Kho
// đi"/"Kho nhận" (dataIndex 'khoDi'/'khoNhan') ở pages/chi-phi-van-chuyen/index.tsx cần
// tên thật. Tra tên theo id rồi ghép vào từng dòng, tương tự cách ghép "DiaChiFull" ở trên.
async function withChiPhiKhoNames(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const ids = Array.from(new Set(rows.flatMap((r) => [r.KhoDiId, r.KhoNhanId]).filter(Boolean)));
  if (ids.length === 0) return rows;

  const { data, error } = await supabase.from('sm_Kho').select('Id,Ten').in('Id', ids);
  if (error) fail(error.message);

  const tenById = new Map((data ?? []).map((k: any) => [k.Id, k.Ten]));
  return rows.map((r) => ({
    ...r,
    KhoDi: tenById.get(r.KhoDiId) ?? '',
    KhoNhan: tenById.get(r.KhoNhanId) ?? '',
  }));
}

// sm_ProductConfiguration chỉ lưu ProductId/GasTankId/ResidualGasId (uuid) — cột "Bình"/
// "Vỏ bình"/"Gas dư" (dataIndex 'productName'/'gasTankName'/'residualGasName') ở
// pages/product-configuration/index.tsx cần tên thật.
async function withProductConfigNames(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const ids = Array.from(
    new Set(rows.flatMap((r) => [r.ProductId, r.GasTankId, r.ResidualGasId]).filter(Boolean)),
  );
  if (ids.length === 0) return rows;

  const { data, error } = await supabase.from('sm_SanPham').select('Id,TenSanPham').in('Id', ids);
  if (error) fail(error.message);

  const tenById = new Map((data ?? []).map((s: any) => [s.Id, s.TenSanPham]));
  return rows.map((r) => ({
    ...r,
    ProductName: tenById.get(r.ProductId) ?? '',
    GasTankName: tenById.get(r.GasTankId) ?? '',
    ResidualGasName: r.ResidualGasId ? (tenById.get(r.ResidualGasId) ?? '') : '',
  }));
}

// sm_PhuongTien không lưu tên tài xế — cột "Tên tài xế" ở pages/quan-ly-xe/index.tsx (dataIndex
// 'taiXe') là join ngược từ sm_LaiXe.IdPhuongTien. Mỗi phương tiện tối đa 1 tài xế (unique index).
async function withPhuongTienTaiXeName(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.Id).filter(Boolean);
  if (ids.length === 0) return rows;

  const { data, error } = await supabase.from('sm_LaiXe').select('IdPhuongTien,TenTaiXe').in('IdPhuongTien', ids);
  if (error) fail(error.message);

  const tenByXeId = new Map((data ?? []).map((lx: any) => [lx.IdPhuongTien, lx.TenTaiXe]));
  return rows.map((r) => ({ ...r, TaiXe: tenByXeId.get(r.Id) ?? '' }));
}

// sm_LaiXe chỉ lưu IdPhuongTien (uuid) — cột "Phương tiện" ở pages/lai-xe/index.tsx (dataIndex
// 'phuongTien') cần tên hiển thị. Dùng "BienSoXe" (biển số xe) — dễ nhận diện hơn Model vì
// nhiều xe có thể cùng model. (form gốc dùng Model làm label dropdown, đây là lỗi đã được xác
// nhận và sửa lại cho cả 2 chỗ — xem thêm pages/lai-xe/lai-xe.form.tsx.)
async function withLaiXePhuongTienName(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  const ids = Array.from(new Set(rows.map((r) => r.IdPhuongTien).filter(Boolean)));
  if (ids.length === 0) return rows;

  const { data, error } = await supabase.from('sm_PhuongTien').select('Id,BienSoXe').in('Id', ids);
  if (error) fail(error.message);

  const bienSoById = new Map((data ?? []).map((pt: any) => [pt.Id, pt.BienSoXe]));
  return rows.map((r) => ({ ...r, PhuongTien: r.IdPhuongTien ? (bienSoById.get(r.IdPhuongTien) ?? '') : '' }));
}

async function genericList<T>(table: string, params: any): Promise<Responses<T>> {
  const filter = parseFilter(params);
  const page = Number(params?.page) || 1;
  const size = params?.size === undefined ? 20 : Number(params.size);

  let query = supabase.from(table).select('*', { count: 'exact' });

  // sm_CodeType không có cột "Ten" — bỏ qua full-text search chung cho bảng này.
  // sm_SanPham dùng cột "TenSanPham" chứ không phải "Ten".
  // sm_ProductConfiguration không có cột tên nào cả — xử lý full-text riêng bên dưới
  // (tìm theo Code hoặc theo tên Bình/Vỏ bình/Gas dư đã gán).
  const fullText = filterGet(filter, 'FullTextSearch');
  const FULL_TEXT_COLUMN: Record<string, string> = {
    sm_SanPham: 'TenSanPham',
    sm_LaiXe: 'TenTaiXe',
    sm_PhuongTien: 'BienSoXe',
  };
  const NO_GENERIC_FULL_TEXT = new Set(['sm_CodeType', 'sm_ProductConfiguration']);
  if (fullText && !NO_GENERIC_FULL_TEXT.has(table)) {
    query = query.ilike(FULL_TEXT_COLUMN[table] ?? 'Ten', `%${fullText}%`);
  }

  if (table === 'sm_Kho') {
    const khachHangId = filterGet(filter, 'KhachHangId');
    if (khachHangId) query = query.eq('KhachHangId', khachHangId);
    const loaiKho = filterGet(filter, 'LoaiKho');
    if (loaiKho) query = query.eq('LoaiKho', loaiKho);
  }
  if (table === 'sm_ChiPhiVanChuyen') {
    const khoDiId = filterGet(filter, 'KhoDiId');
    const khoNhanId = filterGet(filter, 'KhoNhanId');
    if (khoDiId) query = query.eq('KhoDiId', khoDiId);
    if (khoNhanId) query = query.eq('KhoNhanId', khoNhanId);
  }
  if (table === 'sm_CodeType') {
    // dropdown Loại kho / Loại khách hàng gọi codeTypeFacade.get({ filter: { type: '...' } })
    const type = filterGet(filter, 'Type');
    if (type) query = query.eq('Type', type);
  }
  if (table === 'sm_KhachHang') {
    // bộ lọc "Chọn loại Khách hàng" ở pages/khach-hang/index.tsx (onChangeFilter)
    const loaiKhachHang = filterGet(filter, 'LoaiKhachHang');
    if (loaiKhachHang) query = query.eq('LoaiKhachHang', loaiKhachHang);
  }
  if (table === 'sm_SanPham') {
    // dropdown "Lọc theo loại" ở pages/san-pham/index.tsx (onTypeFilterChange) — giá trị
    // là code cứng trong utils/variable.tsx (BINH/VO_BINH/GAS_DU), không qua sm_CodeType.
    const type = filterGet(filter, 'Type');
    if (type) query = query.eq('Type', type);

    // dropdown Bình/Vỏ bình/Gas dư ở product-configuration.form.tsx: loại trừ sản phẩm đã
    // được gán vào 1 cấu hình khác. DB có unique index riêng cho từng cột ProductId/
    // GasTankId/ResidualGasId (mỗi sản phẩm chỉ được gán đúng 1 lần trong toàn bảng); vì
    // Type của sản phẩm quyết định nó chỉ có thể giữ đúng 1 vai trò, loại trừ theo cả 3
    // cột cùng lúc là đủ, không cần tách riêng theo từng dropdown.
    const excludeHaveConfig = filterGet(filter, 'ExcludeHaveConfig');
    if (excludeHaveConfig) {
      const forConfigId = filterGet(filter, 'ForConfigId');
      let usedQuery = supabase.from('sm_ProductConfiguration').select('ProductId,GasTankId,ResidualGasId');
      if (forConfigId) usedQuery = usedQuery.neq('Id', forConfigId);
      const { data: usedRows, error: usedError } = await usedQuery;
      if (usedError) fail(usedError.message);
      const usedIds = Array.from(
        new Set((usedRows ?? []).flatMap((r: any) => [r.ProductId, r.GasTankId, r.ResidualGasId]).filter(Boolean)),
      );
      if (usedIds.length > 0) query = query.not('Id', 'in', `(${usedIds.join(',')})`);
    }
  }
  if (table === 'sm_PhuongTien') {
    // dropdown "Chọn phương tiện" ở lai-xe.form.tsx: chỉ hiện xe CHƯA có tài xế (mỗi xe tối
    // đa 1 tài xế — unique index sm_LaiXe.IdPhuongTien), trừ khi đang sửa thì vẫn phải giữ
    // lại xe hiện đang gán cho chính tài xế đó (idTaiXe ở đây thực chất là Id của Phương
    // tiện đang gán, tên tham số hơi gây nhầm nhưng giữ nguyên đúng như frontend gửi lên).
    const isKhongTaiXe = filterGet(filter, 'IsKhongTaiXe');
    if (isKhongTaiXe) {
      const keepId = filterGet(filter, 'IdTaiXe');
      const { data: assignedRows, error: assignedErr } = await supabase
        .from('sm_LaiXe')
        .select('IdPhuongTien')
        .not('IdPhuongTien', 'is', null);
      if (assignedErr) fail(assignedErr.message);
      let assignedIds = (assignedRows ?? []).map((r: any) => r.IdPhuongTien).filter(Boolean);
      if (keepId) assignedIds = assignedIds.filter((id: string) => id !== keepId);
      if (assignedIds.length > 0) query = query.not('Id', 'in', `(${assignedIds.join(',')})`);
    }
  }

  if (table === 'sm_ProductConfiguration' && fullText) {
    const { data: matchedSp, error: matchedErr } = await supabase
      .from('sm_SanPham')
      .select('Id')
      .ilike('TenSanPham', `%${fullText}%`);
    if (matchedErr) fail(matchedErr.message);
    const spIds = (matchedSp ?? []).map((r: any) => r.Id);
    const orParts = [`Code.ilike.%${fullText}%`];
    if (spIds.length > 0) {
      orParts.push(`ProductId.in.(${spIds.join(',')})`);
      orParts.push(`GasTankId.in.(${spIds.join(',')})`);
      orParts.push(`ResidualGasId.in.(${spIds.join(',')})`);
    }
    query = query.or(orParts.join(','));
  }

  if (params?.sort) {
    const sort = String(params.sort);
    query = query.order(sort.replace(/^[+-]/, ''), { ascending: !sort.startsWith('-') });
  } else if (table === 'sm_Kho' || table === 'sm_CodeType') {
    query = query.order('Order', { ascending: true });
  } else if (table === 'sm_KhachHang') {
    // chưa rõ thứ tự gốc (không có backend .NET cho màn này) — mặc định theo tên, xem sql/04_khach_hang.sql
    query = query.order('Ten', { ascending: true });
  } else if (table === 'sm_SanPham') {
    // tương tự — không có backend .NET gốc, mặc định theo tên sản phẩm, xem sql/06_san_pham.sql
    query = query.order('TenSanPham', { ascending: true });
  }

  if (size >= 0) {
    const from = (page - 1) * size;
    query = query.range(from, from + Math.max(size, 1) - 1);
  }

  const { data, error, count } = await query;
  if (error) fail(error.message);

  let rows = (data ?? []).map((r: any) => (table === 'sm_Kho' ? withDiaChiFull(r) : r));
  if (table === 'sm_ChiPhiVanChuyen') rows = await withChiPhiKhoNames(rows);
  if (table === 'sm_ProductConfiguration') rows = await withProductConfigNames(rows);
  if (table === 'sm_PhuongTien') rows = await withPhuongTienTaiXeName(rows);
  if (table === 'sm_LaiXe') rows = await withLaiXePhuongTienName(rows);
  return ok(toCamelDeep(buildPagination(rows, page, size, count ?? rows.length)) as T);
}

async function genericGetById<T>(table: string, id: string): Promise<Responses<T>> {
  const { data, error } = await supabase.from(table).select('*').eq('Id', id).single();
  if (error) fail(error.message);
  return ok(toCamelDeep(table === 'sm_Kho' ? withDiaChiFull(data) : data) as T);
}

// -------------------------------------------------------------------------------------
// 2b) Tỉnh/Huyện/Xã (cata_Province/District/Commune) — dropdown địa chỉ.
//     Hỗ trợ CẢ 2 kiểu lọc:
//       - "parentId" số ít  (kho.form.tsx — 1 kho, chọn tầng tỉnh/huyện/xã)
//       - "parentIds" số nhiều (khach-hang/kho-table.tsx — bảng nhiều dòng kho,
//         mỗi dòng có thể thuộc tỉnh/huyện khác nhau, cần tải Huyện/Xã của TẤT CẢ
//         các tỉnh/huyện đang xuất hiện trong bảng cùng lúc lúc mới mở form sửa)
// -------------------------------------------------------------------------------------
async function diaChiList<T>(
  table: 'cata_Province' | 'cata_District' | 'cata_Commune',
  nameCol: string,
  parentCol?: string,
  params?: any,
): Promise<Responses<T>> {
  const filter = parseFilter(params);
  let query = supabase.from(table).select('*');

  if (parentCol) {
    const parentIds = filterGet(filter, 'parentIds');
    if (Array.isArray(parentIds)) {
      // Loại bỏ giá trị rỗng — dòng kho con chưa chọn Tỉnh/Huyện sẽ có provinceCode/
      // districtCode = undefined, JSON.stringify biến undefined trong mảng thành null,
      // đưa thẳng null vào .in() trên cột int4 sẽ lỗi "invalid input syntax for type integer".
      const cleanedIds = parentIds.filter((v: any) => v !== null && v !== undefined && v !== '');
      if (cleanedIds.length === 0) return ok([] as T);
      query = query.in(parentCol, cleanedIds);
    } else {
      const parentId = filterGet(filter, 'parentId');
      if (parentId === undefined || parentId === null || parentId === '') return ok([] as T);
      query = query.eq(parentCol, parentId);
    }
  }

  query =
    table === 'cata_Province' ? query.order('Order', { ascending: true }) : query.order(nameCol, { ascending: true });

  const { data, error } = await query;
  if (error) fail(error.message);
  return ok(toCamelDeep(data ?? []) as T);
}

// -------------------------------------------------------------------------------------
// 3) Lịch sử xử lý (sm_ActivityHistory) — dùng chung bởi màn hình Xem đơn hàng
// -------------------------------------------------------------------------------------
// Danh sách người dùng cho dropdown "Lọc theo người tạo" — CHỈ trả Id/Name/
// UserName qua RPC riêng (sm_fn_list_users), KHÔNG dùng genericList('idm_User')
// vì bảng idm_User có cột mật khẩu/token nhạy cảm, không được lộ ra trình duyệt.
async function userList<T>(): Promise<Responses<T>> {
  const rows = await callRpc<any[]>('sm_fn_list_users', {});
  return ok(toCamelDeep({ content: rows ?? [] }) as T);
}

async function activityHistoryList<T>(params: any): Promise<Responses<T>> {
  const filter = parseFilter(params);
  const entityId = filterGet(filter, 'entityId') ?? filterGet(filter, 'EntityId');
  const entityType = filterGet(filter, 'entityType') ?? filterGet(filter, 'EntityType') ?? 'DonHang';

  let query = supabase
    .from('sm_ActivityHistory')
    .select('*', { count: 'exact' })
    .eq('EntityType', entityType)
    .order('ActionMadeOnDate', { ascending: false }); // chốt ở skill tu-dien-nghiep-vu-tms mục 5

  if (entityId) query = query.eq('EntityId', entityId);

  const size = params?.size === undefined ? 20 : Number(params.size);
  if (size >= 0) {
    const page = Number(params?.page) || 1;
    const from = (page - 1) * size;
    query = query.range(from, from + Math.max(size, 1) - 1);
  }

  const { data, error, count } = await query;
  if (error) fail(error.message);

  const rows = (data ?? []).map((r: any) => ({
    ...r,
    // JOIN nhẹ ra tên đầy đủ người thao tác, để khớp field actionMadeByUserFullName phía FE
    ActionMadeByUserFullName: r.ActionMadeByUserName,
  }));

  return ok(toCamelDeep(buildPagination(rows, Number(params?.page) || 1, size, count ?? rows.length)) as T);
}

// -------------------------------------------------------------------------------------
// 4) Đơn hàng (sm_DonHang) — route đặc thù, gọi các hàm RPC trong sql/03_don_hang.sql
// -------------------------------------------------------------------------------------
const DON_HANG_BASE = routerLinks('DonHang', 'api'); // '/don-hang'
const UUID_RE = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

async function donHangList<T>(params: any): Promise<Responses<T>> {
  const filter = parseFilter(params);
  const page = Number(params?.page) || 1;
  const size = params?.size === undefined ? 20 : Number(params.size);

  const rows = await callRpc<any[]>('sm_donhang_list', {
    p_page: page,
    p_size: size,
    p_filter: {
      FullTextSearch: filterGet(filter, 'FullTextSearch') ?? '',
      TrangThai: filterGet(filter, 'TrangThai') ?? '',
      CreatedByUserId: filterGet(filter, 'CreatedByUserId') ?? null,
      MucDoUuTien: filterGet(filter, 'MucDoUuTien') ?? '',
      KhoGiao: filterGet(filter, 'KhoGiao') ?? null,
      KhoNhan: filterGet(filter, 'KhoNhan') ?? null,
    },
    p_sort: params?.sort || '-CreatedOnDate',
  });

  const total = rows?.[0]?.total_count ?? 0;
  const content = (rows ?? []).map(({ total_count, ...rest }) => rest);
  return ok(toCamelDeep(buildPagination(content, page, size, Number(total))) as T);
}

async function donHangCountByStatus<T>(params: any): Promise<Responses<T>> {
  const filter = parseFilter(params);
  const data = await callRpc<Record<string, number>>('sm_donhang_count_by_status', {
    p_filter: { CreatedByUserId: filterGet(filter, 'CreatedByUserId') ?? null },
  });
  return ok(data as T);
}

async function donHangDetail<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_donhang_detail', { p_id: id });

  // SỬA LỖI "Danh sách sản phẩm trống": không dựa vào subquery lồng trong RPC nữa mà
  // truy vấn TRỰC TIẾP bảng sm_SanPham_DonHang — dễ debug hơn (có thể mở tab Network
  // để thấy đúng request/response) và không phụ thuộc đúng-sai của 1 câu SQL phức tạp.
  const { data: lines, error: linesError } = await supabase
    .from('sm_SanPham_DonHang')
    .select('*')
    .eq('DonHangId', id)
    .order('TenSanPham', { ascending: true });
  if (linesError) fail(linesError.message);

  const sanPham = (lines ?? []).map((sp: any) => ({
    ...sp,
    QuyDoi: Number(sp.SoLuong) * Number(sp.TrongLuong),
  }));

  return ok(toCamelDeep({ ...data, SanPham: sanPham }) as T);
}

// value gửi lên từ Form (camelCase, có field "sanPham" là mảng dòng sản phẩm) -> tách
// thành (order jsonb, lines jsonb) đúng chữ ký 2 hàm RPC create/update.
function splitOrderPayload(values: any) {
  const lines = (values?.sanPham ?? []).map((x: any) => ({
    SanPhamId: x.sanPhamId,
    SoLuong: x.soLuong,
  }));
  const order = toPascalDeep({ ...values });
  delete order.SanPham;
  delete order.Id;
  delete order.CreatedOnDate;
  delete order.CreatedByUserName;
  return { order, lines };
}

async function donHangCreate<T>(values: any): Promise<Responses<T>> {
  const { order, lines } = splitOrderPayload(values);
  const data = await callRpc<any>('sm_donhang_create', { p_order: order, p_lines: lines });
  return ok(toCamelDeep(data) as T, 'Tạo đơn hàng thành công');
}

async function donHangUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const { order, lines } = splitOrderPayload(values);
  const data = await callRpc<any>('sm_donhang_update', { p_id: id, p_order: order, p_lines: lines });
  return ok(toCamelDeep(data) as T, 'Cập nhật đơn hàng thành công');
}

async function donHangDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_donhang_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function donHangDeleteMany<T>(params: any): Promise<Responses<T>> {
  let ids: string[] = [];
  try {
    ids = JSON.parse(params?.model ?? '{}').ids ?? [];
  } catch {
    ids = [];
  }
  const data = await callRpc<any>('sm_donhang_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function donHangPutStatus<T>(id: string, body: any): Promise<Responses<T>> {
  const target = body?.trangThai;
  let data: any;
  if (target === 'CHO_DUYET') data = await callRpc<any>('sm_donhang_send_approval', { p_id: id });
  else if (target === 'DA_DUYET') data = await callRpc<any>('sm_donhang_approve', { p_id: id });
  else fail(`Không hỗ trợ chuyển trạng thái sang "${target}" qua thao tác này`);
  return ok(toCamelDeep(data) as T);
}

async function donHangApprove<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_donhang_approve', { p_id: id });
  return ok(toCamelDeep(data) as T, 'Đã duyệt đơn hàng');
}

async function donHangReject<T>(id: string, body: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_donhang_reject', { p_id: id, p_ly_do_tu_choi: body?.lyDoTuChoi });
  return ok(toCamelDeep(data) as T, 'Đã từ chối đơn hàng');
}

async function donHangComplete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_donhang_complete', { p_id: id });
  return ok(toCamelDeep(data) as T, 'Đã hoàn thành đơn hàng');
}

async function donHangCancel<T>(body: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_donhang_cancel', { p_ids: body?.orderIdList ?? [], p_ly_do: body?.reason });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function donHangRevert<T>(orderId: string, activityId: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_donhang_revert', { p_order_id: orderId, p_activity_id: activityId });
  return ok(toCamelDeep(data) as T, 'Đã hoàn tác');
}

// -------------------------------------------------------------------------------------
// 4b) Kho (sm_Kho) — route đặc thù, gọi các hàm RPC trong sql/02_kho.sql.
//     Đọc (list/getById) vẫn đi qua genericList/genericGetById ở trên (mục 2).
// -------------------------------------------------------------------------------------
const KHO_BASE = routerLinks('Kho', 'api'); // '/kho'

// Chỉ lấy đúng 9 trường có trên form Kho (kho.form.tsx) — không cho phép giá trị lạ
// (ví dụ khachHangId/isCuaHang/isInitialized) lọt vào RPC dù frontend không gửi.
const KHO_FORM_FIELDS = [
  'ma',
  'ten',
  'diaChi',
  'provinceCode',
  'provinceName',
  'districtCode',
  'districtName',
  'communeCode',
  'communeName',
  'latitude',
  'longitude',
  'loaiKho',
  'order',
  'ghiChu',
];

function sanitizeKhoPayload(values: any): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const key of KHO_FORM_FIELDS) if (key in (values ?? {})) picked[key] = values[key];
  return toPascalDeep(picked);
}

async function khoCreate<T>(values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_kho_create', { p_kho: sanitizeKhoPayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã thêm kho');
}

async function khoUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_kho_update', { p_id: id, p_kho: sanitizeKhoPayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã cập nhật kho');
}

async function khoDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_kho_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function khoDeleteMany<T>(ids: string[]): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_kho_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

// -------------------------------------------------------------------------------------
// 4c) Khách hàng (sm_KhachHang) — route đặc thù, gọi các hàm RPC trong sql/04_khach_hang.sql.
//     Đọc danh sách vẫn đi qua genericList ở trên (mục 2). Xem chi tiết/tạo/sửa/xóa
//     cần RPC riêng vì phải đồng bộ kèm "listKho" (bảng con Địa chỉ kho của khách hàng).
// -------------------------------------------------------------------------------------
const KHACH_HANG_BASE = routerLinks('KhachHang', 'api'); // '/khach-hang'

// Chỉ lấy đúng 6 trường có trên form Khách hàng (khach-hang.form.tsx) — KHÔNG có
// diaChi/birthdate (xem giả định 1 ở đầu sql/04_khach_hang.sql).
const KHACH_HANG_FORM_FIELDS = ['ma', 'ten', 'loaiKhachHang', 'nguoiPhuTrach', 'soDienThoai', 'ghiChu'];

// Trường của mỗi dòng trong bảng con "Danh sách địa chỉ" (kho-table.tsx). Giữ "id" để
// RPC phân biệt dòng cũ (update) / dòng mới thêm (insert).
const KHACH_HANG_KHO_FIELDS = [
  'id',
  'ma',
  'ten',
  'diaChi',
  'ghiChu',
  'latitude',
  'longitude',
  'provinceCode',
  'provinceName',
  'districtCode',
  'districtName',
  'communeCode',
  'communeName',
];

function splitKhachHangPayload(values: any) {
  const khachHang: Record<string, any> = {};
  for (const key of KHACH_HANG_FORM_FIELDS) if (key in (values ?? {})) khachHang[key] = values[key];

  const listKho = (values?.listKho ?? []).map((item: any) => {
    const picked: Record<string, any> = {};
    for (const key of KHACH_HANG_KHO_FIELDS) if (key in (item ?? {})) picked[key] = item[key];
    return toPascalDeep(picked);
  });

  return { khachHang: toPascalDeep(khachHang), listKho };
}

async function khachHangDetail<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_fn_khachhang_detail', { p_id: id });
  return ok(toCamelDeep(data) as T);
}

async function khachHangCreate<T>(values: any): Promise<Responses<T>> {
  const { khachHang, listKho } = splitKhachHangPayload(values);
  const data = await callRpc<any>('sm_khachhang_create', { p_khach_hang: khachHang, p_list_kho: listKho });
  return ok(toCamelDeep(data) as T, 'Đã thêm khách hàng');
}

async function khachHangUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const { khachHang, listKho } = splitKhachHangPayload(values);
  const data = await callRpc<any>('sm_khachhang_update', {
    p_id: id,
    p_khach_hang: khachHang,
    p_list_kho: listKho,
  });
  return ok(toCamelDeep(data) as T, 'Đã cập nhật khách hàng');
}

async function khachHangDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_khachhang_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function khachHangDeleteMany<T>(ids: string[]): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_khachhang_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

// -------------------------------------------------------------------------------------
// 4d) Chi phí vận chuyển (sm_ChiPhiVanChuyen) — route đặc thù cho phần GHI, gọi các hàm
//     RPC trong sql/05_chi_phi_van_chuyen.sql. Đọc (list/getById, kể cả tra cước theo
//     KhoDiId/KhoNhanId cho màn Đơn hàng) vẫn đi qua genericList/genericGetById (mục 2).
// -------------------------------------------------------------------------------------
const CHI_PHI_BASE = routerLinks('ChiPhiVanChuyen', 'api'); // '/chi-phi-van-chuyen'

// Đúng các trường có trên DrawerForm (pages/chi-phi-van-chuyen/index.tsx). Lưu ý: form
// gốc có bug đặt tên field "ghiChi" (đã sửa lại "ghiChu" trực tiếp trong file đó).
const CHI_PHI_FORM_FIELDS = ['ma', 'ten', 'khoDiId', 'khoNhanId', 'chiPhi', 'khoangCach', 'ghiChu'];

function sanitizeChiPhiPayload(values: any): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const key of CHI_PHI_FORM_FIELDS) if (key in (values ?? {})) picked[key] = values[key];
  return toPascalDeep(picked);
}

async function chiPhiCreate<T>(values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_chiphivanchuyen_create', { p_data: sanitizeChiPhiPayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã thêm biểu cước vận chuyển');
}

async function chiPhiUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_chiphivanchuyen_update', {
    p_id: id,
    p_data: sanitizeChiPhiPayload(values),
  });
  return ok(toCamelDeep(data) as T, 'Đã cập nhật biểu cước vận chuyển');
}

async function chiPhiDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_chiphivanchuyen_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function chiPhiDeleteMany<T>(ids: string[]): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_chiphivanchuyen_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

// -------------------------------------------------------------------------------------
// 4e) Sản phẩm (sm_SanPham) — route đặc thù cho phần GHI, gọi các hàm RPC trong
//     sql/06_san_pham.sql. Đọc (list/getById, lọc theo Loại, tìm theo tên) vẫn đi qua
//     genericList/genericGetById (mục 2).
// -------------------------------------------------------------------------------------
const SAN_PHAM_BASE = routerLinks('SanPham', 'api'); // '/san-pham'

// Đúng các trường có trên DrawerForm (pages/san-pham/index.tsx). KHÔNG có "donGia" — xem
// giả định 1 ở đầu sql/06_san_pham.sql.
const SAN_PHAM_FORM_FIELDS = ['maSanPham', 'tenSanPham', 'type', 'donViTinh', 'trongLuong', 'isOrder'];

function sanitizeSanPhamPayload(values: any): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const key of SAN_PHAM_FORM_FIELDS) if (key in (values ?? {})) picked[key] = values[key];
  return toPascalDeep(picked);
}

async function sanPhamCreate<T>(values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_sanpham_create', { p_data: sanitizeSanPhamPayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã thêm sản phẩm');
}

async function sanPhamUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_sanpham_update', { p_id: id, p_data: sanitizeSanPhamPayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã cập nhật sản phẩm');
}

async function sanPhamDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_sanpham_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function sanPhamDeleteMany<T>(ids: string[]): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_sanpham_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

// -------------------------------------------------------------------------------------
// 4f) Cấu hình sản phẩm (sm_ProductConfiguration) — route đặc thù cho phần GHI, gọi các
//     hàm RPC trong sql/07_cau_hinh_san_pham.sql. Đọc vẫn đi qua genericList (mục 2).
//     Lưu ý: store/product-configuration/index.tsx dùng tên tham số "idList" (không phải
//     "ids" như các slice khác) khi xóa nhiều.
// -------------------------------------------------------------------------------------
const PRODUCT_CONFIG_BASE = routerLinks('ProductConfiguration', 'api'); // '/product-configuration'

// Đúng các trường có trên form (product-configuration.form.tsx). KHÔNG có "code" — form
// không có ô nhập, để RPC tự sinh mã (xem sql/07_cau_hinh_san_pham.sql).
const PRODUCT_CONFIG_FORM_FIELDS = ['productId', 'gasTankId', 'residualGasId', 'note'];

function sanitizeProductConfigPayload(values: any): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const key of PRODUCT_CONFIG_FORM_FIELDS) if (key in (values ?? {})) picked[key] = values[key];
  return toPascalDeep(picked);
}

async function productConfigCreate<T>(values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_cauhinhsp_create', { p_data: sanitizeProductConfigPayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã thêm cấu hình sản phẩm');
}

async function productConfigUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_cauhinhsp_update', {
    p_id: id,
    p_data: sanitizeProductConfigPayload(values),
  });
  return ok(toCamelDeep(data) as T, 'Đã cập nhật cấu hình sản phẩm');
}

async function productConfigDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_cauhinhsp_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function productConfigDeleteMany<T>(ids: string[]): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_cauhinhsp_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

// -------------------------------------------------------------------------------------
// 4g) Phương tiện (sm_PhuongTien) — route đặc thù cho phần GHI, gọi RPC trong
//     sql/08_phuong_tien_tai_xe.sql. Đọc vẫn đi qua genericList (mục 2).
// -------------------------------------------------------------------------------------
const XE_BASE = routerLinks('Xe', 'api'); // '/quan-ly-phuong-tien'

const XE_FORM_FIELDS = ['bienSoXe', 'soKhung', 'soMay', 'hangSanXuat', 'model', 'namSanXuat', 'taiTrong', 'active'];

function sanitizeXePayload(values: any): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const key of XE_FORM_FIELDS) if (key in (values ?? {})) picked[key] = values[key];
  return toPascalDeep(picked);
}

async function xeCreate<T>(values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_phuongtien_create', { p_data: sanitizeXePayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã thêm phương tiện');
}

async function xeUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_phuongtien_update', { p_id: id, p_data: sanitizeXePayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã cập nhật phương tiện');
}

async function xeDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_phuongtien_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function xeDeleteMany<T>(ids: string[]): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_phuongtien_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

// -------------------------------------------------------------------------------------
// 4h) Tài xế (sm_LaiXe) — route đặc thù cho phần GHI, gọi RPC trong
//     sql/08_phuong_tien_tai_xe.sql. Đọc vẫn đi qua genericList (mục 2).
// -------------------------------------------------------------------------------------
const LAI_XE_BASE = routerLinks('LaiXe', 'api'); // '/quan-ly-lai-xe'

const LAI_XE_FORM_FIELDS = ['maTaiXe', 'tenTaiXe', 'idPhuongTien', 'cccd', 'ngaySinh', 'gplx', 'active'];

function sanitizeLaiXePayload(values: any): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const key of LAI_XE_FORM_FIELDS) if (key in (values ?? {})) picked[key] = values[key];
  return toPascalDeep(picked);
}

async function laiXeCreate<T>(values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_laixe_create', { p_data: sanitizeLaiXePayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã thêm tài xế');
}

async function laiXeUpdate<T>(id: string, values: any): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_laixe_update', { p_id: id, p_data: sanitizeLaiXePayload(values) });
  return ok(toCamelDeep(data) as T, 'Đã cập nhật tài xế');
}

async function laiXeDelete<T>(id: string): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_laixe_delete', { p_id: id });
  return ok(toCamelDeep(data) as T, data?.Message);
}

async function laiXeDeleteMany<T>(ids: string[]): Promise<Responses<T>> {
  const data = await callRpc<any>('sm_laixe_delete_many', { p_ids: ids });
  return ok(toCamelDeep(data) as T, data?.Message);
}

// -------------------------------------------------------------------------------------
// 5) API cũ (fetch tới backend .NET) — GIỮ NGUYÊN cho các endpoint chưa chuyển đổi
// -------------------------------------------------------------------------------------
export const API = {
  init: () =>
    ({
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        authorization: localStorage.getItem(keyToken) ? 'Bearer ' + localStorage.getItem(keyToken) : '',
        'Accept-Language': localStorage.getItem('i18nextLng') || '',
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    }) as RequestInit,
  responsible: async <T>(
    url: string,
    params: { [key: string]: string } = {},
    config: RequestInit,
    headers: RequestInit['headers'] = {},
    throwText: boolean = false,
  ) => {
    config.headers = { ...config.headers, ...headers };

    const linkParam = Object.keys(params)
      .map(
        (key) =>
          key + '=' + encodeURIComponent(typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]),
      )
      .join('&');
    const response = await fetch(
      (url.includes('https://') || url.includes('http://') ? '' : linkApi) + url + (linkParam && '?' + linkParam),
      config,
    );
    const res: Responses<T> = await response.json();
    if (response.ok) return res;
    if (!res.isSuccess && res.message) {
      if (!throwText) customMessage.error({ content: res.message });
      else throw new Error(res.message);
    }

    if (response.status === 401 && url !== `${routerLinks('Auth', 'api')}/login`) {
      localStorage.removeItem(keyToken);
      location.reload();
    }
    throw {};
  },

  // -----------------------------------------------------------------------------------
  // GET
  // -----------------------------------------------------------------------------------
  get: async <T>(url: string, params: any = {}, headers?: RequestInit['headers'], throwText: boolean = false) => {
    if (url === DON_HANG_BASE) return donHangList<T>(params);
    if (url === `${DON_HANG_BASE}/count-by-status`) return donHangCountByStatus<T>(params);
    const detailMatch = url.match(new RegExp(`^${DON_HANG_BASE}/(${UUID_RE})$`));
    if (detailMatch) return donHangDetail<T>(detailMatch[1]);

    if (url === routerLinks('LichSuChinhSua', 'api')) return activityHistoryList<T>(params);
    if (url === routerLinks('User', 'api')) return userList<T>();

    // Chi tiết khách hàng cần kèm "listKho" -> ưu tiên trước GENERIC_READ_TABLE (mục 4c).
    const khachHangDetailMatch = url.match(new RegExp(`^${KHACH_HANG_BASE}/(${UUID_RE})$`));
    if (khachHangDetailMatch) return khachHangDetail<T>(khachHangDetailMatch[1]);

    if (url === '/tinh') return diaChiList<T>('cata_Province', 'ProvinceName', undefined, params);
    if (url === '/huyen') return diaChiList<T>('cata_District', 'DistrictName', 'ProvinceCode', params);
    if (url === '/phuong') return diaChiList<T>('cata_Commune', 'CommuneName', 'DistrictCode', params);

    if (GENERIC_READ_TABLE[url]) return genericList<T>(GENERIC_READ_TABLE[url], params);
    for (const base of Object.keys(GENERIC_READ_TABLE)) {
      const m = url.match(new RegExp(`^${base}/(${UUID_RE})$`));
      if (m) return genericGetById<T>(GENERIC_READ_TABLE[base], m[1]);
    }

    return API.responsible<T>(url, params, { ...API.init(), method: 'GET' }, headers, throwText);
  },

  // -----------------------------------------------------------------------------------
  // POST
  // -----------------------------------------------------------------------------------
  post: async <T>(
    url: string,
    data: any = {},
    params: any = {},
    headers?: RequestInit['headers'],
    throwText: boolean = false,
  ) => {
    if (url === DON_HANG_BASE) return donHangCreate<T>(data);
    if (url === KHO_BASE) return khoCreate<T>(data);
    if (url === KHACH_HANG_BASE) return khachHangCreate<T>(data);
    if (url === CHI_PHI_BASE) return chiPhiCreate<T>(data);
    if (url === SAN_PHAM_BASE) return sanPhamCreate<T>(data);
    if (url === PRODUCT_CONFIG_BASE) return productConfigCreate<T>(data);
    if (url === XE_BASE) return xeCreate<T>(data);
    if (url === LAI_XE_BASE) return laiXeCreate<T>(data);

    return API.responsible<T>(
      url,
      params,
      { ...API.init(), method: 'POST', body: JSON.stringify(data) },
      headers,
      throwText,
    );
  },

  // -----------------------------------------------------------------------------------
  // PUT
  // -----------------------------------------------------------------------------------
  put: async <T>(
    url: string,
    data: any = {},
    params: any = {},
    headers?: RequestInit['headers'],
    throwText: boolean = false,
  ) => {
    const statusMatch = url.match(new RegExp(`^${DON_HANG_BASE}/status/(${UUID_RE})$`));
    if (statusMatch) return donHangPutStatus<T>(statusMatch[1], data);

    const approveMatch = url.match(new RegExp(`^${DON_HANG_BASE}/approve/(${UUID_RE})$`));
    if (approveMatch) return donHangApprove<T>(approveMatch[1]);

    const rejectMatch = url.match(new RegExp(`^${DON_HANG_BASE}/reject/(${UUID_RE})$`));
    if (rejectMatch) return donHangReject<T>(rejectMatch[1], data);

    if (url === `${DON_HANG_BASE}/cancel`) return donHangCancel<T>(data);

    const completeMatch = url.match(new RegExp(`^${DON_HANG_BASE}/(${UUID_RE})/complete$`));
    if (completeMatch) return donHangComplete<T>(completeMatch[1]);

    const revertMatch = url.match(new RegExp(`^${DON_HANG_BASE}/(${UUID_RE})/revert/(${UUID_RE})$`));
    if (revertMatch) return donHangRevert<T>(revertMatch[1], revertMatch[2]);

    const updateMatch = url.match(new RegExp(`^${DON_HANG_BASE}/(${UUID_RE})$`));
    if (updateMatch) return donHangUpdate<T>(updateMatch[1], data);

    const khoUpdateMatch = url.match(new RegExp(`^${KHO_BASE}/(${UUID_RE})$`));
    if (khoUpdateMatch) return khoUpdate<T>(khoUpdateMatch[1], data);

    const khachHangUpdateMatch = url.match(new RegExp(`^${KHACH_HANG_BASE}/(${UUID_RE})$`));
    if (khachHangUpdateMatch) return khachHangUpdate<T>(khachHangUpdateMatch[1], data);

    const chiPhiUpdateMatch = url.match(new RegExp(`^${CHI_PHI_BASE}/(${UUID_RE})$`));
    if (chiPhiUpdateMatch) return chiPhiUpdate<T>(chiPhiUpdateMatch[1], data);

    const sanPhamUpdateMatch = url.match(new RegExp(`^${SAN_PHAM_BASE}/(${UUID_RE})$`));
    if (sanPhamUpdateMatch) return sanPhamUpdate<T>(sanPhamUpdateMatch[1], data);

    const productConfigUpdateMatch = url.match(new RegExp(`^${PRODUCT_CONFIG_BASE}/(${UUID_RE})$`));
    if (productConfigUpdateMatch) return productConfigUpdate<T>(productConfigUpdateMatch[1], data);

    const xeUpdateMatch = url.match(new RegExp(`^${XE_BASE}/(${UUID_RE})$`));
    if (xeUpdateMatch) return xeUpdate<T>(xeUpdateMatch[1], data);

    const laiXeUpdateMatch = url.match(new RegExp(`^${LAI_XE_BASE}/(${UUID_RE})$`));
    if (laiXeUpdateMatch) return laiXeUpdate<T>(laiXeUpdateMatch[1], data);

    return API.responsible<T>(
      url,
      params,
      { ...API.init(), method: 'PUT', body: JSON.stringify(data) },
      headers,
      throwText,
    );
  },

  // -----------------------------------------------------------------------------------
  // DELETE
  // -----------------------------------------------------------------------------------
  delete: async <T>(url: string, params: any = {}, headers?: RequestInit['headers'], throwText: boolean = false) => {
    if (url === `${DON_HANG_BASE}/many`) return donHangDeleteMany<T>(params);
    const deleteMatch = url.match(new RegExp(`^${DON_HANG_BASE}/(${UUID_RE})$`));
    if (deleteMatch) return donHangDelete<T>(deleteMatch[1]);

    // khoSlice.deleteMany tự ghép sẵn query string vào url: '/kho?ids=..&ids=..'
    const khoDeleteManyMatch = url.match(new RegExp(`^${KHO_BASE}\\?(.+)$`));
    if (khoDeleteManyMatch) return khoDeleteMany<T>(new URLSearchParams(khoDeleteManyMatch[1]).getAll('ids'));

    const khoDeleteMatch = url.match(new RegExp(`^${KHO_BASE}/(${UUID_RE})$`));
    if (khoDeleteMatch) return khoDelete<T>(khoDeleteMatch[1]);

    // khachHangSlice.deleteMany tự ghép sẵn query string: '/khach-hang?ids=..&ids=..'
    const khachHangDeleteManyMatch = url.match(new RegExp(`^${KHACH_HANG_BASE}\\?(.+)$`));
    if (khachHangDeleteManyMatch)
      return khachHangDeleteMany<T>(new URLSearchParams(khachHangDeleteManyMatch[1]).getAll('ids'));

    const khachHangDeleteMatch = url.match(new RegExp(`^${KHACH_HANG_BASE}/(${UUID_RE})$`));
    if (khachHangDeleteMatch) return khachHangDelete<T>(khachHangDeleteMatch[1]);

    // chiPhiVanChuyenSlice.deleteMany tự ghép sẵn query string: '/chi-phi-van-chuyen?ids=..&ids=..'
    const chiPhiDeleteManyMatch = url.match(new RegExp(`^${CHI_PHI_BASE}\\?(.+)$`));
    if (chiPhiDeleteManyMatch) return chiPhiDeleteMany<T>(new URLSearchParams(chiPhiDeleteManyMatch[1]).getAll('ids'));

    const chiPhiDeleteMatch = url.match(new RegExp(`^${CHI_PHI_BASE}/(${UUID_RE})$`));
    if (chiPhiDeleteMatch) return chiPhiDelete<T>(chiPhiDeleteMatch[1]);

    // sanPhamSlice.deleteMany tự ghép sẵn query string: '/san-pham?ids=..&ids=..'
    const sanPhamDeleteManyMatch = url.match(new RegExp(`^${SAN_PHAM_BASE}\\?(.+)$`));
    if (sanPhamDeleteManyMatch) return sanPhamDeleteMany<T>(new URLSearchParams(sanPhamDeleteManyMatch[1]).getAll('ids'));

    const sanPhamDeleteMatch = url.match(new RegExp(`^${SAN_PHAM_BASE}/(${UUID_RE})$`));
    if (sanPhamDeleteMatch) return sanPhamDelete<T>(sanPhamDeleteMatch[1]);

    // productConfigurationSlice.deleteMany tự ghép sẵn query string với tên tham số
    // "idList" (không phải "ids" như các slice khác): '/product-configuration?idList=..&idList=..'
    const productConfigDeleteManyMatch = url.match(new RegExp(`^${PRODUCT_CONFIG_BASE}\\?(.+)$`));
    if (productConfigDeleteManyMatch)
      return productConfigDeleteMany<T>(new URLSearchParams(productConfigDeleteManyMatch[1]).getAll('idList'));

    const productConfigDeleteMatch = url.match(new RegExp(`^${PRODUCT_CONFIG_BASE}/(${UUID_RE})$`));
    if (productConfigDeleteMatch) return productConfigDelete<T>(productConfigDeleteMatch[1]);

    // phuongTienSlice/laiXeSlice.deleteMany tự ghép sẵn query string: '<base>?ids=..&ids=..'
    const xeDeleteManyMatch = url.match(new RegExp(`^${XE_BASE}\\?(.+)$`));
    if (xeDeleteManyMatch) return xeDeleteMany<T>(new URLSearchParams(xeDeleteManyMatch[1]).getAll('ids'));

    const xeDeleteMatch = url.match(new RegExp(`^${XE_BASE}/(${UUID_RE})$`));
    if (xeDeleteMatch) return xeDelete<T>(xeDeleteMatch[1]);

    const laiXeDeleteManyMatch = url.match(new RegExp(`^${LAI_XE_BASE}\\?(.+)$`));
    if (laiXeDeleteManyMatch) return laiXeDeleteMany<T>(new URLSearchParams(laiXeDeleteManyMatch[1]).getAll('ids'));

    const laiXeDeleteMatch = url.match(new RegExp(`^${LAI_XE_BASE}/(${UUID_RE})$`));
    if (laiXeDeleteMatch) return laiXeDelete<T>(laiXeDeleteMatch[1]);

    return API.responsible<T>(url, params, { ...API.init(), method: 'DELETE' }, headers, throwText);
  },

  refresh: async () => {
    const res = await API.get<{ accessToken: string; refreshToken: null }>(
      `${routerLinks('Auth', 'api')}/refresh-token`,
      {},
      { authorization: 'Bearer ' + localStorage.getItem(keyRefreshToken) },
    );
    if (res) {
      localStorage.setItem(keyToken, res.data!.accessToken);
      return 'Bearer ' + res.data!.accessToken;
    }
  },
};
