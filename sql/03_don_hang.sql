-- =====================================================================
-- 03_don_hang.sql — Màn hình Đơn hàng: Danh sách / Tạo mới-Sửa / Xem chi tiết
-- ĐÂY LÀ BẢN GỘP CUỐI CÙNG — thay thế toàn bộ các file rời trước đó
-- (03 gốc, 04_bo_sung_don_hang, 05_bo_gan_xe_hang_loat, 06_sua_loi_filter_mang,
-- 07_bo_sung_don_hang, 08_chot_sm_donhang_list, 09_fix_kieu_du_lieu_ten_nguoi_dung).
-- Từ nay CHỈ dùng file này cho toàn bộ nghiệp vụ Đơn hàng — các file cũ trên
-- coi như hết hạn, không cần và không nên chạy lại (một số định nghĩa hàm
-- có cấu trúc cột khác, chạy lại có thể gây lỗi
-- "cannot change return type of existing function").
-- Có DROP FUNCTION trước khi tạo sm_donhang_list nên CHẠY ĐƯỢC dù DB đang ở
-- trạng thái nào (đã chạy 1 phần, toàn phần, hay hoàn toàn chưa chạy gì).
--
-- Phạm vi: CHỈ nhập liệu + quản lý dữ liệu đơn hàng. Đã bỏ hoàn toàn:
--   - Luồng tài xế thao tác (xác nhận/lấy hàng/giao hàng)
--   - Biên bản giao nhận (Delivery Note), ký tên, ảnh, xuất PDF biên bản
--   - Trạng thái trung gian cũ (chỉ hiển thị dữ liệu lịch sử, không tạo mới)
--   - Tính năng "Phân xe - xế" gán tài xế/xe hàng loạt độc lập trạng thái
--     (giờ chỉ gán được qua màn "Chỉnh sửa", khi đơn ở trạng thái NHAP)
-- Theo đúng luồng 5 trạng thái đã chốt ở skill tu-dien-nghiep-vu-tms mục 4.
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test, xem ghi chú tại chỗ):
--   1) Mã đơn hàng = 'DH-' || YYYYMMDDHH24MISS (suy từ mẫu 'DH-20260717032841').
--   2) Chỉ được SỬA đơn khi đang ở trạng thái NHAP (chưa gửi duyệt).
--   3) Chỉ được XÓA (xóa hẳn) đơn khi đang ở trạng thái NHAP.
--   4) Gán tài xế/xe không sinh dòng lịch sử làm thay đổi TrangThai, và khi
--      hoàn tác, các dòng lịch sử "PhanXeXe" luôn bị bỏ qua khi tìm trạng thái
--      trước đó (vì hành động này không còn kéo theo đổi trạng thái).
--   5) Với dữ liệu lịch sử cũ có Action='TuChoi' dẫn tới DA_TU_CHOI (hệ cũ),
--      khi hoàn tác về đúng dòng đó, hệ mới sẽ trả về DA_HUY (theo quy tắc
--      thống nhất mới) thay vì DA_TU_CHOI — sai khác nhỏ chỉ ảnh hưởng thao
--      tác hoàn tác trên đơn hàng rất cũ, đã chấp nhận theo trao đổi.
--   6) Cột "CongTy" (đơn vị vận tải) trên sm_PhuongTien KHÔNG có trong DDL
--      gốc — đã thêm an toàn bằng ADD COLUMN IF NOT EXISTS, không ảnh hưởng
--      dữ liệu cũ. Nếu tên cột thật khác, báo lại để đổi.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. RLS baseline cho các bảng liên quan (idempotent — chạy lại không lỗi)
-- ---------------------------------------------------------------------
alter table public."sm_DonHang" enable row level security;
alter table public."sm_SanPham_DonHang" enable row level security;
alter table public."sm_ActivityHistory" enable row level security;
alter table public."sm_KhachHang" enable row level security;
alter table public."sm_SanPham" enable row level security;
alter table public."sm_ChiPhiVanChuyen" enable row level security;
alter table public."sm_LaiXe" enable row level security;
alter table public."sm_PhuongTien" enable row level security;

drop policy if exists authenticated_full_access on public."sm_DonHang";
create policy authenticated_full_access on public."sm_DonHang"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_SanPham_DonHang";
create policy authenticated_full_access on public."sm_SanPham_DonHang"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_ActivityHistory";
create policy authenticated_full_access on public."sm_ActivityHistory"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_KhachHang";
create policy authenticated_full_access on public."sm_KhachHang"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_SanPham";
create policy authenticated_full_access on public."sm_SanPham"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_ChiPhiVanChuyen";
create policy authenticated_full_access on public."sm_ChiPhiVanChuyen"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_LaiXe";
create policy authenticated_full_access on public."sm_LaiXe"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_PhuongTien";
create policy authenticated_full_access on public."sm_PhuongTien"
  for all to authenticated using (true) with check (true);

-- Cột "Đơn vị vận tải" cho Phương tiện — xem giả định #6 đầu file.
alter table public."sm_PhuongTien" add column if not exists "CongTy" text;

-- ---------------------------------------------------------------------
-- 1. Hàm phụ trợ
-- ---------------------------------------------------------------------

-- Sinh mã đơn hàng duy nhất dạng DH-YYYYMMDDHH24MISS, tự thêm hậu tố nếu trùng giây
create or replace function public.sm_fn_gen_ma_donhang()
returns text
language plpgsql
security invoker
as $$
declare
  v_ma text;
  v_suffix int := 0;
begin
  loop
    v_ma := 'DH-' || to_char(now(), 'YYYYMMDDHH24MISS') || (case when v_suffix = 0 then '' else v_suffix::text end);
    exit when not exists (select 1 from public."sm_DonHang" where "Ma" = v_ma);
    v_suffix := v_suffix + 1;
  end loop;
  return v_ma;
end;
$$;

-- Danh sách hành động được phép theo trạng thái hiện tại (luồng 5 trạng thái rút gọn).
-- KHÔNG còn 'ASSIGN_DELIVERY' — tính năng "Phân xe - xế" hàng loạt đã bị gỡ bỏ theo
-- yêu cầu, giờ chỉ gán tài xế/xe qua màn "Chỉnh sửa" (chỉ khi đơn ở NHAP).
create or replace function public.sm_fn_donhang_allowed_actions(p_trang_thai text)
returns text[]
language sql
immutable
as $$
  select case p_trang_thai
    when 'NHAP'       then array['UPDATE','DELETE','SEND_APPROVAL','CANCEL']
    when 'CHO_DUYET'  then array['APPROVE','REJECT','CANCEL']
    when 'DA_DUYET'   then array['COMPLETE','CANCEL']
    when 'HOAN_THANH' then array[]::text[]   -- muốn hủy phải Hoàn tác về DA_DUYET trước
    else array[]::text[]                     -- DA_HUY và mọi trạng thái cũ: chỉ Hoàn tác (xử lý riêng ở FE)
  end;
$$;

-- Tên người dùng hiện tại (để ghi log lịch sử) — tránh lặp lại subquery
create or replace function public.sm_fn_current_user_name()
returns text
language sql
stable
security invoker
as $$
  select "Name" from public."idm_User" where "Id" = auth.uid();
$$;

-- Chuẩn hóa 1 giá trị jsonb (có thể là null, chuỗi/số đơn, hoặc mảng) thành
-- luôn luôn là MẢNG jsonb — các ô lọc trên danh sách đơn hàng (Trạng thái,
-- Người tạo, Mức ưu tiên, Kho giao, Kho nhận) đều là Select mode="tags" ở FE
-- nên LUÔN gửi giá trị dạng mảng JSON, không phải chuỗi đơn.
create or replace function public.sm_fn_jsonb_normalize_array(p jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when p is null then '[]'::jsonb
    when jsonb_typeof(p) = 'array' then p
    else jsonb_build_array(p)
  end;
$$;

-- ---------------------------------------------------------------------
-- 2. Danh sách đơn hàng (phân trang) — public.sm_donhang_list
--    p_filter hỗ trợ khóa (đều dạng MẢNG): FullTextSearch (chuỗi thường),
--    TrangThai, CreatedByUserId, MucDoUuTien, KhoGiao (=BenGiaoId),
--    KhoNhan (=DiaChiBenNhanId).
--    p_sort dạng "+Cot" (tăng) hoặc "-Cot" (giảm), mặc định "-CreatedOnDate"
-- ---------------------------------------------------------------------

-- Phải DROP trước vì có thể DB đang có bản cũ với ÍT CỘT TRẢ VỀ hơn (thiếu
-- CreatedByUserFullName) — Postgres không cho CREATE OR REPLACE tự đổi kiểu
-- trả về của hàm đã tồn tại.
drop function if exists public.sm_donhang_list(int, int, jsonb, text);

create or replace function public.sm_donhang_list(
  p_page int default 1,
  p_size int default 20,
  p_filter jsonb default '{}'::jsonb,
  p_sort text default '-CreatedOnDate'
)
returns table (
  "Id" uuid, "Ma" text, "TrangThai" text,
  "BenGiaoId" uuid, "BenGiao" text, "DiaChiBenGiao" text,
  "BenNhanId" uuid, "BenNhan" text,
  "DiaChiBenNhanId" uuid, "DiaChiBenNhan" text,
  "MucDoUuTien" text, "GhiChu" text,
  "CuocVanChuyen" numeric, "TongTrongLuong" numeric, "ThanhTien" numeric,
  "ThoiHanGiaoHang" timestamp, "NgayDatHang" timestamp,
  "LaiXeId" uuid, "PhuongTienId" uuid,
  "CreatedOnDate" timestamp, "CreatedByUserId" uuid, "CreatedByUserName" text,
  "CreatedByUserFullName" text,
  "AllowedActions" text[],
  total_count bigint
)
language plpgsql
security invoker
as $$
declare
  v_offset int := greatest(coalesce(p_page,1) - 1, 0) * greatest(coalesce(p_size,20), 1);
  v_limit int := coalesce(p_size, 20);
  v_sort_col text := regexp_replace(coalesce(p_sort, '-CreatedOnDate'), '^[+-]', '');
  v_sort_dir text := case when left(coalesce(p_sort,'-CreatedOnDate'), 1) = '+' then 'asc' else 'desc' end;
  v_allowed_sort_cols text[] := array['CreatedOnDate','Ma','TrangThai','ThoiHanGiaoHang','TongTrongLuong','ThanhTien'];

  v_trang_thai text[] := (
    select array_agg(x) from jsonb_array_elements_text(public.sm_fn_jsonb_normalize_array(p_filter->'TrangThai')) x
    where x <> ''
  );
  v_muc_do_uu_tien text[] := (
    select array_agg(x) from jsonb_array_elements_text(public.sm_fn_jsonb_normalize_array(p_filter->'MucDoUuTien')) x
    where x <> ''
  );
  v_created_by uuid[] := (
    select array_agg(x::uuid) from jsonb_array_elements_text(public.sm_fn_jsonb_normalize_array(p_filter->'CreatedByUserId')) x
    where x <> ''
  );
  v_kho_giao uuid[] := (
    select array_agg(x::uuid) from jsonb_array_elements_text(public.sm_fn_jsonb_normalize_array(p_filter->'KhoGiao')) x
    where x <> ''
  );
  v_kho_nhan uuid[] := (
    select array_agg(x::uuid) from jsonb_array_elements_text(public.sm_fn_jsonb_normalize_array(p_filter->'KhoNhan')) x
    where x <> ''
  );
begin
  if p_size is not null and p_size < 0 then
    v_limit := 2147483647;
    v_offset := 0;
  end if;

  if not (v_sort_col = any (v_allowed_sort_cols)) then
    v_sort_col := 'CreatedOnDate';
  end if;

  return query execute format(
    $q$
      select d."Id", d."Ma", d."TrangThai",
             d."BenGiaoId", d."BenGiao", d."DiaChiBenGiao",
             d."BenNhanId", d."BenNhan",
             d."DiaChiBenNhanId", d."DiaChiBenNhan",
             d."MucDoUuTien", d."GhiChu",
             d."CuocVanChuyen", d."TongTrongLuong", d."ThanhTien",
             d."ThoiHanGiaoHang", d."NgayDatHang",
             d."LaiXeId", d."PhuongTienId",
             d."CreatedOnDate", d."CreatedByUserId", d."CreatedByUserName",
             coalesce(u."Name"::text, d."CreatedByUserName") as "CreatedByUserFullName",
             public.sm_fn_donhang_allowed_actions(d."TrangThai"),
             count(*) over ()::bigint as total_count
      from public."sm_DonHang" d
      left join public."idm_User" u on u."Id" = d."CreatedByUserId"
      where ($1 = '' or d."Ma" ilike '%%' || $1 || '%%'
                      or d."BenGiao" ilike '%%' || $1 || '%%'
                      or d."BenNhan" ilike '%%' || $1 || '%%')
        and ($2 is null or d."TrangThai" = any($2))
        and ($3 is null or d."CreatedByUserId" = any($3))
        and ($4 is null or d."MucDoUuTien" = any($4))
        and ($5 is null or d."BenGiaoId" = any($5))
        and ($6 is null or d."DiaChiBenNhanId" = any($6))
      order by d.%I %s
      limit %L offset %L
    $q$,
    v_sort_col, v_sort_dir, v_limit, v_offset
  )
  using
    coalesce(p_filter->>'FullTextSearch', ''),
    v_trang_thai,
    v_created_by,
    v_muc_do_uu_tien,
    v_kho_giao,
    v_kho_nhan;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Chi tiết 1 đơn hàng (kèm dòng sản phẩm) — public.sm_donhang_detail
-- ---------------------------------------------------------------------
create or replace function public.sm_donhang_detail(p_id uuid)
returns jsonb
language sql
security invoker
as $$
  select jsonb_build_object(
    'Id', d."Id", 'Ma', d."Ma", 'TrangThai', d."TrangThai",
    'BenGiaoId', d."BenGiaoId", 'BenGiao', d."BenGiao", 'DiaChiBenGiao', d."DiaChiBenGiao",
    'BenNhanId', d."BenNhanId", 'BenNhan', d."BenNhan",
    'DiaChiBenNhanId', d."DiaChiBenNhanId", 'DiaChiBenNhan', d."DiaChiBenNhan",
    'BenGiaoType', d."BenGiaoType", 'BenNhanType', d."BenNhanType",
    'MucDoUuTien', d."MucDoUuTien", 'GhiChu', d."GhiChu",
    'CuocVanChuyen', d."CuocVanChuyen", 'TongTrongLuong', d."TongTrongLuong", 'ThanhTien', d."ThanhTien",
    'ThoiHanGiaoHang', d."ThoiHanGiaoHang", 'NgayDatHang', d."NgayDatHang", 'LyDoTuChoi', d."LyDoTuChoi",
    'LaiXeId', d."LaiXeId", 'PhuongTienId', d."PhuongTienId",
    'CreatedOnDate', d."CreatedOnDate", 'CreatedByUserId', d."CreatedByUserId",
    'CreatedByUserName', d."CreatedByUserName",
    'CreatedByUserFullName', coalesce((select "Name"::text from public."idm_User" where "Id" = d."CreatedByUserId"), d."CreatedByUserName"),
    'AllowedActions', public.sm_fn_donhang_allowed_actions(d."TrangThai"),
    'LaiXe', (select jsonb_build_object('Id', lx."Id", 'TenTaiXe', lx."TenTaiXe", 'MaTaiXe', lx."MaTaiXe", 'IdPhuongTien', lx."IdPhuongTien")
                from public."sm_LaiXe" lx where lx."Id" = d."LaiXeId"),
    'PhuongTien', (select jsonb_build_object('Id', pt."Id", 'BienSoXe', pt."BienSoXe", 'CongTy', pt."CongTy")
                     from public."sm_PhuongTien" pt where pt."Id" = d."PhuongTienId"),
    'SanPham', (select coalesce(jsonb_agg(jsonb_build_object(
                  'Id', sp."Id", 'SanPhamId', sp."SanPhamId",
                  'MaSanPham', sp."MaSanPham", 'TenSanPham', sp."TenSanPham",
                  'SoLuong', sp."SoLuong", 'TrongLuong', sp."TrongLuong", 'DonGia', sp."DonGia",
                  'QuyDoi', sp."SoLuong" * sp."TrongLuong"
                ) order by sp."TenSanPham"), '[]'::jsonb)
                from public."sm_SanPham_DonHang" sp where sp."DonHangId" = d."Id")
  )
  from public."sm_DonHang" d
  where d."Id" = p_id;
$$;

-- ---------------------------------------------------------------------
-- 4. Tạo đơn hàng mới — public.sm_donhang_create(p_order, p_lines)
--    p_order: {BenGiaoId, BenNhanId, DiaChiBenNhanId, MucDoUuTien, GhiChu,
--              ThoiHanGiaoHang, NgayDatHang, LaiXeId?, PhuongTienId?}
--    p_lines: [{SanPhamId, SoLuong}, ...]
-- ---------------------------------------------------------------------
create or replace function public.sm_donhang_create(p_order jsonb, p_lines jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ma text;
  v_ben_giao_id uuid := nullif(p_order->>'BenGiaoId','')::uuid;
  v_ben_nhan_id uuid := nullif(p_order->>'BenNhanId','')::uuid;
  v_dia_chi_ben_nhan_id uuid := nullif(p_order->>'DiaChiBenNhanId','')::uuid;
  v_ben_giao public."sm_Kho"%rowtype;
  v_dia_chi_nhan public."sm_Kho"%rowtype;
  v_ben_nhan_ten text;
  v_ben_nhan_type text;
  v_cuoc numeric := 0;
  v_tong_trong_luong numeric := 0;
  v_thanh_tien numeric := 0;
  v_line jsonb;
  v_sp public."sm_SanPham"%rowtype;
  v_so_luong numeric;
  v_user_name text := public.sm_fn_current_user_name();
begin
  if v_ben_giao_id is null then raise exception 'Vui lòng chọn Bên giao'; end if;
  if v_ben_nhan_id is null then raise exception 'Vui lòng chọn Bên nhận'; end if;
  if v_dia_chi_ben_nhan_id is null then raise exception 'Vui lòng chọn Địa chỉ bên nhận'; end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Đơn hàng phải có ít nhất 1 sản phẩm';
  end if;

  select * into v_ben_giao from public."sm_Kho" where "Id" = v_ben_giao_id;
  if not found then raise exception 'Không tìm thấy kho bên giao'; end if;

  select * into v_dia_chi_nhan from public."sm_Kho" where "Id" = v_dia_chi_ben_nhan_id;
  if not found then raise exception 'Không tìm thấy điểm giao nhận (địa chỉ bên nhận)'; end if;

  if v_ben_nhan_id = v_dia_chi_ben_nhan_id then
    v_ben_nhan_type := 'KHO_CUA_HANG';
    v_ben_nhan_ten := v_dia_chi_nhan."Ten";
  else
    v_ben_nhan_type := 'KHO_KHACH_HANG';
    select "Ten" into v_ben_nhan_ten from public."sm_KhachHang" where "Id" = v_ben_nhan_id;
    if not found then raise exception 'Không tìm thấy khách hàng bên nhận'; end if;
  end if;

  select "ChiPhi" into v_cuoc from public."sm_ChiPhiVanChuyen"
   where "KhoDiId" = v_ben_giao_id and "KhoNhanId" = v_dia_chi_ben_nhan_id;
  v_cuoc := coalesce(v_cuoc, 0);

  v_ma := public.sm_fn_gen_ma_donhang();

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_sp from public."sm_SanPham" where "Id" = nullif(v_line->>'SanPhamId','')::uuid;
    if not found then raise exception 'Sản phẩm trong đơn hàng không tồn tại'; end if;
    v_so_luong := coalesce((v_line->>'SoLuong')::numeric, 0);
    if v_so_luong <= 0 then
      raise exception 'Số lượng của sản phẩm "%" phải lớn hơn 0', v_sp."TenSanPham";
    end if;
    v_tong_trong_luong := v_tong_trong_luong + v_so_luong * coalesce(v_sp."TrongLuong", 0);
  end loop;

  v_thanh_tien := v_tong_trong_luong * v_cuoc;

  insert into public."sm_DonHang" (
    "Id","Ma","TrangThai","BenGiaoId","BenGiao","DiaChiBenGiao",
    "BenNhanId","BenNhan","DiaChiBenNhanId","DiaChiBenNhan","BenGiaoType","BenNhanType",
    "MucDoUuTien","GhiChu","CuocVanChuyen","TongTrongLuong","ThanhTien",
    "ThoiHanGiaoHang","NgayDatHang","LaiXeId","PhuongTienId",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, v_ma, 'NHAP', v_ben_giao_id, v_ben_giao."Ten", v_ben_giao."DiaChi",
    v_ben_nhan_id, v_ben_nhan_ten, v_dia_chi_ben_nhan_id, v_dia_chi_nhan."DiaChi", 'KHO', v_ben_nhan_type,
    coalesce(nullif(p_order->>'MucDoUuTien',''), '2'), p_order->>'GhiChu',
    v_cuoc, v_tong_trong_luong, v_thanh_tien,
    nullif(p_order->>'ThoiHanGiaoHang','')::timestamp, coalesce(nullif(p_order->>'NgayDatHang','')::timestamp, now()),
    nullif(p_order->>'LaiXeId','')::uuid, nullif(p_order->>'PhuongTienId','')::uuid,
    auth.uid(), v_user_name, now()
  );

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_sp from public."sm_SanPham" where "Id" = (v_line->>'SanPhamId')::uuid;
    insert into public."sm_SanPham_DonHang" ("Id","DonHangId","SanPhamId","MaSanPham","TenSanPham","SoLuong","TrongLuong","DonGia")
    values (gen_random_uuid(), v_id, v_sp."Id", v_sp."MaSanPham", v_sp."TenSanPham",
            (v_line->>'SoLuong')::numeric, coalesce(v_sp."TrongLuong",0), coalesce(v_sp."DonGia",0));
  end loop;

  insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
  values (gen_random_uuid(), v_id, 'DonHang', 'TaoMoi', 'đã tạo đơn hàng', auth.uid(), v_user_name, now(), false);

  return public.sm_donhang_detail(v_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Sửa đơn hàng — public.sm_donhang_update(p_id, p_order, p_lines)
--    CHỈ cho sửa khi TrangThai = 'NHAP' (giả định #2 ở đầu file)
-- ---------------------------------------------------------------------
create or replace function public.sm_donhang_update(p_id uuid, p_order jsonb, p_lines jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_trang_thai text;
  v_ben_giao_id uuid := nullif(p_order->>'BenGiaoId','')::uuid;
  v_ben_nhan_id uuid := nullif(p_order->>'BenNhanId','')::uuid;
  v_dia_chi_ben_nhan_id uuid := nullif(p_order->>'DiaChiBenNhanId','')::uuid;
  v_ben_giao public."sm_Kho"%rowtype;
  v_dia_chi_nhan public."sm_Kho"%rowtype;
  v_ben_nhan_ten text;
  v_ben_nhan_type text;
  v_cuoc numeric := 0;
  v_tong_trong_luong numeric := 0;
  v_line jsonb;
  v_sp public."sm_SanPham"%rowtype;
  v_so_luong numeric;
begin
  select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = p_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_trang_thai <> 'NHAP' then
    raise exception 'Chỉ có thể sửa đơn hàng khi đang ở trạng thái Nháp';
  end if;

  if v_ben_giao_id is null then raise exception 'Vui lòng chọn Bên giao'; end if;
  if v_ben_nhan_id is null then raise exception 'Vui lòng chọn Bên nhận'; end if;
  if v_dia_chi_ben_nhan_id is null then raise exception 'Vui lòng chọn Địa chỉ bên nhận'; end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Đơn hàng phải có ít nhất 1 sản phẩm';
  end if;

  select * into v_ben_giao from public."sm_Kho" where "Id" = v_ben_giao_id;
  if not found then raise exception 'Không tìm thấy kho bên giao'; end if;

  select * into v_dia_chi_nhan from public."sm_Kho" where "Id" = v_dia_chi_ben_nhan_id;
  if not found then raise exception 'Không tìm thấy điểm giao nhận (địa chỉ bên nhận)'; end if;

  if v_ben_nhan_id = v_dia_chi_ben_nhan_id then
    v_ben_nhan_type := 'KHO_CUA_HANG';
    v_ben_nhan_ten := v_dia_chi_nhan."Ten";
  else
    v_ben_nhan_type := 'KHO_KHACH_HANG';
    select "Ten" into v_ben_nhan_ten from public."sm_KhachHang" where "Id" = v_ben_nhan_id;
    if not found then raise exception 'Không tìm thấy khách hàng bên nhận'; end if;
  end if;

  select "ChiPhi" into v_cuoc from public."sm_ChiPhiVanChuyen"
   where "KhoDiId" = v_ben_giao_id and "KhoNhanId" = v_dia_chi_ben_nhan_id;
  v_cuoc := coalesce(v_cuoc, 0);

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_sp from public."sm_SanPham" where "Id" = nullif(v_line->>'SanPhamId','')::uuid;
    if not found then raise exception 'Sản phẩm trong đơn hàng không tồn tại'; end if;
    v_so_luong := coalesce((v_line->>'SoLuong')::numeric, 0);
    if v_so_luong <= 0 then
      raise exception 'Số lượng của sản phẩm "%" phải lớn hơn 0', v_sp."TenSanPham";
    end if;
    v_tong_trong_luong := v_tong_trong_luong + v_so_luong * coalesce(v_sp."TrongLuong", 0);
  end loop;

  update public."sm_DonHang" set
    "BenGiaoId" = v_ben_giao_id, "BenGiao" = v_ben_giao."Ten", "DiaChiBenGiao" = v_ben_giao."DiaChi",
    "BenNhanId" = v_ben_nhan_id, "BenNhan" = v_ben_nhan_ten,
    "DiaChiBenNhanId" = v_dia_chi_ben_nhan_id, "DiaChiBenNhan" = v_dia_chi_nhan."DiaChi",
    "BenNhanType" = v_ben_nhan_type,
    "MucDoUuTien" = coalesce(nullif(p_order->>'MucDoUuTien',''), '2'),
    "GhiChu" = p_order->>'GhiChu',
    "CuocVanChuyen" = v_cuoc,
    "TongTrongLuong" = v_tong_trong_luong,
    "ThanhTien" = v_tong_trong_luong * v_cuoc,
    "ThoiHanGiaoHang" = nullif(p_order->>'ThoiHanGiaoHang','')::timestamp,
    "NgayDatHang" = coalesce(nullif(p_order->>'NgayDatHang','')::timestamp, "NgayDatHang"),
    "LaiXeId" = nullif(p_order->>'LaiXeId','')::uuid,
    "PhuongTienId" = nullif(p_order->>'PhuongTienId','')::uuid,
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = public.sm_fn_current_user_name(),
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  delete from public."sm_SanPham_DonHang" where "DonHangId" = p_id;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_sp from public."sm_SanPham" where "Id" = (v_line->>'SanPhamId')::uuid;
    insert into public."sm_SanPham_DonHang" ("Id","DonHangId","SanPhamId","MaSanPham","TenSanPham","SoLuong","TrongLuong","DonGia")
    values (gen_random_uuid(), p_id, v_sp."Id", v_sp."MaSanPham", v_sp."TenSanPham",
            (v_line->>'SoLuong')::numeric, coalesce(v_sp."TrongLuong",0), coalesce(v_sp."DonGia",0));
  end loop;

  return public.sm_donhang_detail(p_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Chuyển trạng thái: Gửi duyệt / Phê duyệt / Từ chối / Hoàn thành / Hủy
-- ---------------------------------------------------------------------

create or replace function public.sm_donhang_send_approval(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare v_trang_thai text; v_user_name text := public.sm_fn_current_user_name();
begin
  select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = p_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_trang_thai <> 'NHAP' then raise exception 'Chỉ đơn ở trạng thái Nháp mới gửi duyệt được'; end if;

  update public."sm_DonHang" set "TrangThai" = 'CHO_DUYET',
    "ActionMadeByUserId" = auth.uid(), "ActionMadeByUserName" = v_user_name, "ActionMadeOnDate" = now()
  where "Id" = p_id;

  insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
  values (gen_random_uuid(), p_id, 'DonHang', 'GuiDuyet', 'đã gửi duyệt đơn hàng', auth.uid(), v_user_name, now(), false);

  return public.sm_donhang_detail(p_id);
end;
$$;

create or replace function public.sm_donhang_approve(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare v_trang_thai text; v_user_name text := public.sm_fn_current_user_name();
begin
  select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = p_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_trang_thai <> 'CHO_DUYET' then raise exception 'Chỉ đơn ở trạng thái Chờ duyệt mới phê duyệt được'; end if;

  update public."sm_DonHang" set "TrangThai" = 'DA_DUYET',
    "ActionMadeByUserId" = auth.uid(), "ActionMadeByUserName" = v_user_name, "ActionMadeOnDate" = now()
  where "Id" = p_id;

  insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
  values (gen_random_uuid(), p_id, 'DonHang', 'PheDuyet', 'đã duyệt đơn hàng', auth.uid(), v_user_name, now(), false);

  return public.sm_donhang_detail(p_id);
end;
$$;

-- Từ chối duyệt: 1 trường hợp riêng của Hủy, dùng chung trạng thái DA_HUY, Action='TuChoi'
create or replace function public.sm_donhang_reject(p_id uuid, p_ly_do_tu_choi text)
returns jsonb
language plpgsql
security invoker
as $$
declare v_trang_thai text; v_user_name text := public.sm_fn_current_user_name();
begin
  if coalesce(trim(p_ly_do_tu_choi), '') = '' then
    raise exception 'Vui lòng nhập lý do từ chối';
  end if;

  select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = p_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_trang_thai <> 'CHO_DUYET' then raise exception 'Chỉ đơn ở trạng thái Chờ duyệt mới từ chối được'; end if;

  update public."sm_DonHang" set "TrangThai" = 'DA_HUY', "LyDoTuChoi" = p_ly_do_tu_choi,
    "ActionMadeByUserId" = auth.uid(), "ActionMadeByUserName" = v_user_name, "ActionMadeOnDate" = now()
  where "Id" = p_id;

  insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
  values (gen_random_uuid(), p_id, 'DonHang', 'TuChoi', p_ly_do_tu_choi, auth.uid(), v_user_name, now(), false);

  return public.sm_donhang_detail(p_id);
end;
$$;

create or replace function public.sm_donhang_complete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare v_trang_thai text; v_user_name text := public.sm_fn_current_user_name();
begin
  select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = p_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_trang_thai <> 'DA_DUYET' then raise exception 'Chỉ đơn ở trạng thái Đã duyệt mới hoàn thành được'; end if;

  update public."sm_DonHang" set "TrangThai" = 'HOAN_THANH',
    "ActionMadeByUserId" = auth.uid(), "ActionMadeByUserName" = v_user_name, "ActionMadeOnDate" = now()
  where "Id" = p_id;

  insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
  values (gen_random_uuid(), p_id, 'DonHang', 'HoanThanh', 'đã hoàn thành đơn hàng', auth.uid(), v_user_name, now(), false);

  return public.sm_donhang_detail(p_id);
end;
$$;

-- Hủy hàng loạt. Đơn HOAN_THANH không hủy trực tiếp được (phải Hoàn tác về DA_DUYET trước).
create or replace function public.sm_donhang_cancel(p_ids uuid[], p_ly_do text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_name text := public.sm_fn_current_user_name();
  v_id uuid;
  v_trang_thai text;
  v_so_luong_huy int := 0;
  v_so_luong_bo_qua int := 0;
begin
  if coalesce(trim(p_ly_do), '') = '' then
    raise exception 'Vui lòng nhập lý do hủy';
  end if;

  foreach v_id in array coalesce(p_ids, array[]::uuid[]) loop
    select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = v_id;
    if not found or v_trang_thai not in ('NHAP','CHO_DUYET','DA_DUYET') then
      v_so_luong_bo_qua := v_so_luong_bo_qua + 1;
      continue;
    end if;

    update public."sm_DonHang" set "TrangThai" = 'DA_HUY', "LyDoTuChoi" = p_ly_do,
      "ActionMadeByUserId" = auth.uid(), "ActionMadeByUserName" = v_user_name, "ActionMadeOnDate" = now()
    where "Id" = v_id;

    insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
    values (gen_random_uuid(), v_id, 'DonHang', 'Huy', p_ly_do, auth.uid(), v_user_name, now(), false);

    v_so_luong_huy := v_so_luong_huy + 1;
  end loop;

  if v_so_luong_huy = 0 then
    raise exception 'Không có đơn hàng nào đủ điều kiện để hủy (chỉ hủy được đơn ở trạng thái Nháp/Chờ duyệt/Đã duyệt)';
  end if;

  return jsonb_build_object(
    'Message', format('Đã hủy %s đơn hàng%s', v_so_luong_huy,
      case when v_so_luong_bo_qua > 0 then format(', bỏ qua %s đơn không đủ điều kiện', v_so_luong_bo_qua) else '' end)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Hoàn tác — áp dụng cho MỌI trạng thái kể cả HOAN_THANH và DA_HUY
--    Dựa theo dòng lịch sử mới nhất (đã bỏ qua PhanXeXe vì không đổi trạng thái)
-- ---------------------------------------------------------------------
create or replace function public.sm_donhang_revert(p_order_id uuid, p_activity_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_activity public."sm_ActivityHistory"%rowtype;
  v_prev public."sm_ActivityHistory"%rowtype;
  v_current_status text;
  v_new_status text;
  v_user_name text := public.sm_fn_current_user_name();
begin
  select * into v_activity from public."sm_ActivityHistory"
   where "Id" = p_activity_id and "EntityId" = p_order_id and "EntityType" = 'DonHang' and "IsDeleted" = false;
  if not found then
    raise exception 'Không tìm thấy dòng lịch sử để hoàn tác, hoặc dòng này đã được hoàn tác trước đó';
  end if;

  if v_activity."Action" = 'TaoMoi' then
    raise exception 'Không thể hoàn tác hành động tạo đơn hàng đầu tiên';
  end if;

  if v_activity."Action" = 'PhanXeXe' then
    raise exception 'Hành động gán tài xế/xe không làm đổi trạng thái đơn, không cần hoàn tác';
  end if;

  select "TrangThai" into v_current_status from public."sm_DonHang" where "Id" = p_order_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;

  select * into v_prev from public."sm_ActivityHistory"
   where "EntityId" = p_order_id and "EntityType" = 'DonHang' and "IsDeleted" = false
     and "Action" <> 'PhanXeXe'
     and ("ActionMadeOnDate" < v_activity."ActionMadeOnDate"
          or ("ActionMadeOnDate" = v_activity."ActionMadeOnDate" and "Id" <> v_activity."Id"))
   order by "ActionMadeOnDate" desc
   limit 1;

  if not found then
    raise exception 'Không còn trạng thái nào trước đó để hoàn tác về';
  end if;

  v_new_status := case v_prev."Action"
    when 'TaoMoi'            then 'NHAP'
    when 'GuiDuyet'          then 'CHO_DUYET'
    when 'PheDuyet'          then 'DA_DUYET'
    when 'HoanThanh'         then 'HOAN_THANH'
    when 'Huy'               then 'DA_HUY'
    when 'TuChoi'            then 'DA_HUY'
    when 'HoanTac'           then null
    when 'XacNhanGiaoHang'   then 'CHO_LAY_HANG'
    when 'TuChoiGiaoHang'    then 'XE_TU_CHOI'
    when 'CapNhatGiaoNhan1'  then 'DA_LAY_HANG'
    when 'CapNhatGiaoNhan2'  then 'DA_GIAO_HANG'
    when 'CapNhatGiaoNhan3'  then 'HOAN_THANH'
    when 'HoanThanhTrucTiep' then 'HOAN_THANH'
    else null
  end;

  if v_new_status is null then
    raise exception 'Không xác định được trạng thái trước đó cho dòng lịch sử này (Action=%)', v_prev."Action";
  end if;

  update public."sm_ActivityHistory" set "IsDeleted" = true where "Id" = v_activity."Id";

  insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
  values (gen_random_uuid(), p_order_id, 'DonHang', 'HoanTac',
          format('đã hoàn tác từ %s về %s', v_current_status, v_new_status),
          auth.uid(), v_user_name, now(), false);

  update public."sm_DonHang" set "TrangThai" = v_new_status,
    "LyDoTuChoi" = case when v_new_status = 'DA_HUY' then "LyDoTuChoi" else null end,
    "ActionMadeByUserId" = auth.uid(), "ActionMadeByUserName" = v_user_name, "ActionMadeOnDate" = now()
  where "Id" = p_order_id;

  return public.sm_donhang_detail(p_order_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Gán tài xế/xe — HÀM CŨ, KHÔNG CÒN GIAO DIỆN NÀO GỌI TỚI (tính năng
--    "Phân xe - xế" hàng loạt đã gỡ bỏ theo yêu cầu). Giữ lại trong DB vì
--    không gây hại gì, phòng trường hợp cần dùng lại sau này.
-- ---------------------------------------------------------------------
create or replace function public.sm_donhang_assign(p_order_ids uuid[], p_lai_xe_id uuid, p_phuong_tien_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_name text := public.sm_fn_current_user_name();
  v_id uuid;
  v_ten_tai_xe text;
  v_so_luong int := 0;
begin
  if p_order_ids is null or array_length(p_order_ids, 1) is null then
    raise exception 'Chưa chọn đơn hàng nào để gán';
  end if;
  if p_phuong_tien_id is null then raise exception 'Vui lòng chọn xe'; end if;
  if p_lai_xe_id is null then raise exception 'Vui lòng chọn tài xế'; end if;

  select "TenTaiXe" into v_ten_tai_xe from public."sm_LaiXe" where "Id" = p_lai_xe_id;
  if not found then raise exception 'Không tìm thấy tài xế'; end if;

  foreach v_id in array p_order_ids loop
    update public."sm_DonHang" set "LaiXeId" = p_lai_xe_id, "PhuongTienId" = p_phuong_tien_id,
      "LastModifiedByUserId" = auth.uid(), "LastModifiedByUserName" = v_user_name, "LastModifiedOnDate" = now()
    where "Id" = v_id;

    if found then
      insert into public."sm_ActivityHistory" ("Id","EntityId","EntityType","Action","Description","ActionMadeByUserId","ActionMadeByUserName","ActionMadeOnDate","IsDeleted")
      values (gen_random_uuid(), v_id, 'DonHang', 'PhanXeXe',
              format('đã gán đơn hàng cho lái xe %s', v_ten_tai_xe), auth.uid(), v_user_name, now(), false);
      v_so_luong := v_so_luong + 1;
    end if;
  end loop;

  return jsonb_build_object('Message', format('Đã gán xe/tài xế cho %s đơn hàng', v_so_luong));
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Xóa đơn hàng — CHỈ khi TrangThai = 'NHAP' (giả định #3 đầu file)
-- ---------------------------------------------------------------------
create or replace function public.sm_donhang_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare v_trang_thai text;
begin
  select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = p_id;
  if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
  if v_trang_thai <> 'NHAP' then
    raise exception 'Chỉ có thể xóa đơn hàng khi đang ở trạng thái Nháp';
  end if;

  delete from public."sm_SanPham_DonHang" where "DonHangId" = p_id;
  delete from public."sm_ActivityHistory" where "EntityId" = p_id and "EntityType" = 'DonHang';
  delete from public."sm_DonHang" where "Id" = p_id;

  return jsonb_build_object('Message', 'Đã xóa đơn hàng');
end;
$$;

create or replace function public.sm_donhang_delete_many(p_ids uuid[])
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_trang_thai text;
  v_xoa int := 0;
  v_bo_qua int := 0;
begin
  foreach v_id in array coalesce(p_ids, array[]::uuid[]) loop
    select "TrangThai" into v_trang_thai from public."sm_DonHang" where "Id" = v_id;
    if not found or v_trang_thai <> 'NHAP' then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;
    delete from public."sm_SanPham_DonHang" where "DonHangId" = v_id;
    delete from public."sm_ActivityHistory" where "EntityId" = v_id and "EntityType" = 'DonHang';
    delete from public."sm_DonHang" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không có đơn hàng nào đủ điều kiện để xóa (chỉ xóa được đơn ở trạng thái Nháp)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s đơn hàng%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s đơn không đủ điều kiện', v_bo_qua) else '' end));
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Đếm số đơn theo trạng thái (cho badge số trên tab) — CreatedByUserId
--     là mảng (Select mode="tags" ở FE), dùng chung hàm chuẩn hóa mục 1.
-- ---------------------------------------------------------------------
create or replace function public.sm_donhang_count_by_status(p_filter jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_created_by uuid[] := (
    select array_agg(x::uuid) from jsonb_array_elements_text(public.sm_fn_jsonb_normalize_array(p_filter->'CreatedByUserId')) x
    where x <> ''
  );
begin
  return (
    select coalesce(jsonb_object_agg("TrangThai", so_luong), '{}'::jsonb)
    from (
      select "TrangThai", count(*) as so_luong
      from public."sm_DonHang" d
      where (v_created_by is null or d."CreatedByUserId" = any(v_created_by))
      group by "TrangThai"
    ) x
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 11. Danh sách người dùng AN TOÀN cho dropdown "Lọc theo người tạo" — CHỈ
--     trả Id/Name/UserName, KHÔNG dùng select * trên idm_User vì bảng này
--     có cột Password/PasswordSalt/PlainTextPwd/ResetPasswordToken/
--     BankAccountNo... TUYỆT ĐỐI không được lộ ra trình duyệt.
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_list_users()
returns table ("Id" uuid, "Name" text, "UserName" text)
language sql
security invoker
as $$
  select "Id", "Name"::text, "UserName"::text from public."idm_User" order by "Name";
$$;
