-- =====================================================================
-- 02_kho.sql — Màn hình Kho: Danh sách / Thêm mới / Sửa / Xóa
-- Theo đúng nghiệp vụ đã chốt ở skill tu-dien-nghiep-vu-tms mục 9.
--
-- ĐỌC (danh sách, xem theo id) KHÔNG dùng RPC — đi thẳng qua .from("sm_Kho")
-- trong api.ts (hàm genericList/genericGetById đã có sẵn từ trước, dùng
-- chung cho vài danh mục nền). File này chỉ xử lý phần GHI có ràng buộc
-- nghiệp vụ: tạo mới, sửa, xóa (chặn theo phụ thuộc).
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test):
--   1) "DiaChiFull" ghép theo thứ tự: DiaChi, CommuneName, DistrictName,
--      ProvinceName — bỏ qua phần rỗng. Nếu muốn thứ tự khác, báo lại.
--   2) "Ma" (mã kho) KHÔNG bắt buộc duy nhất — DDL không có unique index
--      trên cột này, và dữ liệu cũ (nhập tay/migrate) có thể đã trùng. Nếu
--      chặn trùng ngay bây giờ có thể khóa luôn việc sửa các dòng cũ đang
--      trùng mã. Nếu về sau muốn bắt buộc duy nhất, báo lại để thêm ràng
--      buộc (và xử lý trước dữ liệu trùng nếu có).
--   3) Xóa kho chặn khi còn: Xe (sm_PhuongTien.WarehouseId), Biểu cước
--      (sm_ChiPhiVanChuyen.KhoDiId/KhoNhanId), Giao dịch kho lịch sử
--      (sm_WarehouseTransaction.WarehouseId — bảng này để nguyên trong DB
--      dù màn hình báo cáo tồn kho đã bỏ, xem skill mục 0), hoặc Đơn hàng
--      cũ tham chiếu (sm_DonHang.BenGiaoId/BenNhanId/DiaChiBenNhanId).
--
-- NHÂN TIỆN THÊM Ở FILE NÀY (hạ tầng dùng chung, màn hình Kho cần mới chạy
-- được, và màn hình Khách hàng sắp tới cũng sẽ tái dùng luôn, không phải
-- làm lại):
--   - Đọc "sm_CodeType" (danh mục Loại kho) qua route cũ '/admin/code-types'
--     — trước giờ CHƯA được trỏ sang Supabase (chỉ Kho và Khách hàng dùng
--     route này, cả 2 màn đều chưa làm tới).
--   - Đọc "cata_Province/District/Commune" (chọn Tỉnh/Huyện/Xã theo tầng)
--     qua route cũ '/tinh', '/huyen', '/phuong' — cũng CHƯA được trỏ sang
--     Supabase. Chỉ hỗ trợ lọc theo "parentId" (số ít) đúng như kho.form.tsx
--     đang dùng; sub-table Kho trong màn Khách hàng (kho-table.tsx) dùng
--     "parentIds" (số nhiều, lọc theo nhiều tỉnh/huyện 1 lúc) — CHƯA hỗ trợ,
--     để dành khi làm chính thức màn Khách hàng.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. RLS baseline cho các bảng liên quan (idempotent — chạy lại không lỗi)
-- ---------------------------------------------------------------------
alter table public."sm_Kho" enable row level security;
alter table public."sm_WarehouseTransaction" enable row level security;
alter table public."sm_CodeType" enable row level security;
alter table public."cata_Province" enable row level security;
alter table public."cata_District" enable row level security;
alter table public."cata_Commune" enable row level security;

drop policy if exists authenticated_full_access on public."sm_Kho";
create policy authenticated_full_access on public."sm_Kho"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_WarehouseTransaction";
create policy authenticated_full_access on public."sm_WarehouseTransaction"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."sm_CodeType";
create policy authenticated_full_access on public."sm_CodeType"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."cata_Province";
create policy authenticated_full_access on public."cata_Province"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."cata_District";
create policy authenticated_full_access on public."cata_District"
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public."cata_Commune";
create policy authenticated_full_access on public."cata_Commune"
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 1. Hàm phụ trợ — trả về 1 dòng sm_Kho dạng jsonb kèm "DiaChiFull" tính động
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_kho_detail(p_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  select to_jsonb(k) || jsonb_build_object(
    'DiaChiFull',
    nullif(
      concat_ws(', ',
        nullif(k."DiaChi", ''),
        nullif(k."CommuneName", ''),
        nullif(k."DistrictName", ''),
        nullif(k."ProvinceName", '')
      ),
      ''
    )
  )
  from public."sm_Kho" k
  where k."Id" = p_id;
$$;

-- ---------------------------------------------------------------------
-- 2. Tạo kho mới — public.sm_kho_create(p_kho)
--    p_kho: {Ma*, Ten*, DiaChi, ProvinceCode, ProvinceName, DistrictCode,
--            DistrictName, CommuneCode, CommuneName, Latitude, Longitude,
--            LoaiKho*, Order, GhiChu}
--    KHÔNG nhận KhachHangId/IsCuaHang/IsInitialized/Binh/GasDu/VoBinh —
--    các cột này giữ giá trị mặc định của DB (null/false), chỉ được set
--    từ màn hình Khách hàng (xem skill tu-dien-nghiep-vu-tms mục 9).
-- ---------------------------------------------------------------------
create or replace function public.sm_kho_create(p_kho jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ma text := nullif(trim(both from (p_kho->>'Ma')), '');
  v_ten text := nullif(trim(both from (p_kho->>'Ten')), '');
  v_loai_kho text := nullif(p_kho->>'LoaiKho', '');
  v_user_name text := public.sm_fn_current_user_name();
begin
  if v_ma is null then raise exception 'Vui lòng nhập mã kho'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên kho'; end if;
  if v_loai_kho is null then raise exception 'Vui lòng chọn loại kho'; end if;

  insert into public."sm_Kho" (
    "Id","Ma","Ten","DiaChi","LoaiKho",
    "ProvinceCode","ProvinceName","DistrictCode","DistrictName","CommuneCode","CommuneName",
    "Latitude","Longitude","Order","GhiChu",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, v_ma, v_ten, p_kho->>'DiaChi', v_loai_kho,
    nullif(p_kho->>'ProvinceCode','')::int4, nullif(p_kho->>'ProvinceName',''),
    nullif(p_kho->>'DistrictCode','')::int4, nullif(p_kho->>'DistrictName',''),
    nullif(p_kho->>'CommuneCode','')::int4, nullif(p_kho->>'CommuneName',''),
    nullif(p_kho->>'Latitude','')::float8, nullif(p_kho->>'Longitude','')::float8,
    nullif(p_kho->>'Order','')::int4, p_kho->>'GhiChu',
    auth.uid(), v_user_name, now()
  );

  return public.sm_fn_kho_detail(v_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Sửa kho — public.sm_kho_update(p_id, p_kho)
--    Cùng bộ trường như create. KHÔNG đụng tới KhachHangId/IsCuaHang
--    (quản lý riêng từ màn Khách hàng) và IsInitialized/Binh/GasDu/VoBinh
--    (thuộc phạm vi đã cắt bỏ) — giữ nguyên giá trị hiện có trong DB.
-- ---------------------------------------------------------------------
create or replace function public.sm_kho_update(p_id uuid, p_kho jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_ma text := nullif(trim(both from (p_kho->>'Ma')), '');
  v_ten text := nullif(trim(both from (p_kho->>'Ten')), '');
  v_loai_kho text := nullif(p_kho->>'LoaiKho', '');
  v_user_name text := public.sm_fn_current_user_name();
begin
  if not exists (select 1 from public."sm_Kho" where "Id" = p_id) then
    raise exception 'Không tìm thấy kho';
  end if;
  if v_ma is null then raise exception 'Vui lòng nhập mã kho'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên kho'; end if;
  if v_loai_kho is null then raise exception 'Vui lòng chọn loại kho'; end if;

  update public."sm_Kho" set
    "Ma" = v_ma,
    "Ten" = v_ten,
    "DiaChi" = p_kho->>'DiaChi',
    "LoaiKho" = v_loai_kho,
    "ProvinceCode" = nullif(p_kho->>'ProvinceCode','')::int4,
    "ProvinceName" = nullif(p_kho->>'ProvinceName',''),
    "DistrictCode" = nullif(p_kho->>'DistrictCode','')::int4,
    "DistrictName" = nullif(p_kho->>'DistrictName',''),
    "CommuneCode" = nullif(p_kho->>'CommuneCode','')::int4,
    "CommuneName" = nullif(p_kho->>'CommuneName',''),
    "Latitude" = nullif(p_kho->>'Latitude','')::float8,
    "Longitude" = nullif(p_kho->>'Longitude','')::float8,
    "Order" = nullif(p_kho->>'Order','')::int4,
    "GhiChu" = p_kho->>'GhiChu',
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = v_user_name,
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  return public.sm_fn_kho_detail(p_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Xóa kho — public.sm_kho_delete(p_id)
--    Chặn nếu còn Xe / Biểu cước / Giao dịch kho / Đơn hàng tham chiếu,
--    báo rõ số lượng từng loại để người dùng tự xử lý trước.
-- ---------------------------------------------------------------------
create or replace function public.sm_kho_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_so_xe int;
  v_so_cuoc int;
  v_so_giao_dich int;
  v_so_don_hang int;
  v_reasons text[] := array[]::text[];
begin
  if not exists (select 1 from public."sm_Kho" where "Id" = p_id) then
    raise exception 'Không tìm thấy kho';
  end if;

  select count(*) into v_so_xe from public."sm_PhuongTien" where "WarehouseId" = p_id;
  select count(*) into v_so_cuoc from public."sm_ChiPhiVanChuyen"
    where "KhoDiId" = p_id or "KhoNhanId" = p_id;
  select count(*) into v_so_giao_dich from public."sm_WarehouseTransaction" where "WarehouseId" = p_id;
  select count(*) into v_so_don_hang from public."sm_DonHang"
    where "BenGiaoId" = p_id or "BenNhanId" = p_id or "DiaChiBenNhanId" = p_id;

  if v_so_xe > 0 then v_reasons := v_reasons || format('%s xe', v_so_xe); end if;
  if v_so_cuoc > 0 then v_reasons := v_reasons || format('%s biểu cước vận chuyển', v_so_cuoc); end if;
  if v_so_giao_dich > 0 then v_reasons := v_reasons || format('%s giao dịch kho', v_so_giao_dich); end if;
  if v_so_don_hang > 0 then v_reasons := v_reasons || format('%s đơn hàng', v_so_don_hang); end if;

  if array_length(v_reasons, 1) > 0 then
    raise exception 'Không thể xóa kho vì còn: %', array_to_string(v_reasons, ', ');
  end if;

  delete from public."sm_Kho" where "Id" = p_id;
  return jsonb_build_object('Message', 'Đã xóa kho');
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Xóa nhiều kho cùng lúc — public.sm_kho_delete_many(p_ids)
--    Kho nào còn phụ thuộc thì bỏ qua (không làm rớt cả loạt), báo tổng
--    kết số xóa được / số bỏ qua.
-- ---------------------------------------------------------------------
create or replace function public.sm_kho_delete_many(p_ids uuid[])
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_xoa int := 0;
  v_bo_qua int := 0;
  v_con_phu_thuoc boolean;
begin
  foreach v_id in array coalesce(p_ids, array[]::uuid[]) loop
    if not exists (select 1 from public."sm_Kho" where "Id" = v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;

    select
      exists (select 1 from public."sm_PhuongTien" where "WarehouseId" = v_id)
      or exists (select 1 from public."sm_ChiPhiVanChuyen" where "KhoDiId" = v_id or "KhoNhanId" = v_id)
      or exists (select 1 from public."sm_WarehouseTransaction" where "WarehouseId" = v_id)
      or exists (select 1 from public."sm_DonHang" where "BenGiaoId" = v_id or "BenNhanId" = v_id or "DiaChiBenNhanId" = v_id)
    into v_con_phu_thuoc;

    if v_con_phu_thuoc then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;

    delete from public."sm_Kho" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không xóa được kho nào (còn dữ liệu liên quan hoặc không tìm thấy)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s kho%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s kho còn dữ liệu liên quan', v_bo_qua) else '' end));
end;
$$;
