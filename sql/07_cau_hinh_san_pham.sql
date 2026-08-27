-- =====================================================================
-- 07_cau_hinh_san_pham.sql — Màn hình "Sản phẩm > Cấu hình": Thêm mới /
-- Sửa / Xóa. Theo đúng nghiệp vụ đọc từ pages/product-configuration/*.tsx,
-- store/product-configuration/index.tsx.
--
-- ĐỌC (danh sách kèm tên Bình/Vỏ bình/Gas dư, tìm theo mã/tên, và dropdown
-- "loại trừ sản phẩm đã có cấu hình" cho form) đã xử lý trong genericList
-- (src/utils/api.ts) — không cần RPC để đọc.
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test):
--   1) Form KHÔNG có ô nhập "Mã cấu hình" (Code) dù cột hiển thị đầu tiên
--      trong danh sách là "Mã cấu hình" — chắc chắn bản .NET cũ tự sinh
--      mã ở backend. Ở đây RPC tự sinh theo định dạng "CH" + số giây kể
--      từ 2020-01-01 (đủ ngắn, tăng dần, đụng hàng gần như không thể xảy
--      ra do luôn tăng theo thời gian) — nếu Bạn muốn định dạng khác
--      (ví dụ số thứ tự CH001, CH002...), báo lại để đổi.
--   2) DB có 3 unique index riêng cho ProductId/GasTankId/ResidualGasId
--      (1 sản phẩm chỉ được gán đúng 1 lần, ở đúng 1 trong 3 vai trò,
--      trong TOÀN BỘ bảng) — RPC kiểm tra trùng trước khi lưu, báo lỗi
--      tiếng Việt rõ ràng thay vì để lỗi unique constraint thô của DB.
--   3) "Gas dư" (ResidualGasId) KHÔNG bắt buộc trên form (không có rule
--      required, khác với "Bình"/"Vỏ bình") — giữ nguyên, cho phép NULL.
--   4) Xóa cấu hình: KHÔNG có bảng nào khác tham chiếu tới
--      "sm_ProductConfiguration"."Id" — xóa thẳng, không cần kiểm tra
--      phụ thuộc.
--   5) Không kiểm tra Type của sản phẩm khi lưu (ví dụ chặn nếu người
--      dùng chọn 1 sản phẩm loại "Gas dư" vào ô "Bình") vì dropdown phía
--      frontend đã tự lọc đúng Type cho từng ô — nhưng để chắc chắn, RPC
--      vẫn kiểm tra lại Type khớp đúng vai trò trước khi lưu, phòng
--      trường hợp gọi RPC trực tiếp ngoài giao diện.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. RLS baseline cho sm_ProductConfiguration
-- ---------------------------------------------------------------------
alter table public."sm_ProductConfiguration" enable row level security;

drop policy if exists authenticated_full_access on public."sm_ProductConfiguration";
create policy authenticated_full_access on public."sm_ProductConfiguration"
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 1. Sinh mã cấu hình tự động — public.sm_fn_gen_ma_cauhinhsp()
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_gen_ma_cauhinhsp()
returns text
language sql
as $$
  select 'CH' || floor(extract(epoch from (now() - '2020-01-01'::timestamp)))::text;
$$;

-- ---------------------------------------------------------------------
-- 2. Tạo cấu hình mới — public.sm_cauhinhsp_create(p_data)
--    p_data: {ProductId*, GasTankId*, ResidualGasId, Note}
-- ---------------------------------------------------------------------
create or replace function public.sm_cauhinhsp_create(p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_product_id uuid := nullif(p_data->>'ProductId', '')::uuid;
  v_gas_tank_id uuid := nullif(p_data->>'GasTankId', '')::uuid;
  v_residual_gas_id uuid := nullif(p_data->>'ResidualGasId', '')::uuid;
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if v_product_id is null then raise exception 'Vui lòng chọn bình'; end if;
  if v_gas_tank_id is null then raise exception 'Vui lòng chọn vỏ bình'; end if;

  if not exists (select 1 from public."sm_SanPham" where "Id" = v_product_id and "Type" = 'BINH') then
    raise exception 'Sản phẩm chọn ở ô "Bình" không hợp lệ (phải là sản phẩm loại Bình)';
  end if;
  if not exists (select 1 from public."sm_SanPham" where "Id" = v_gas_tank_id and "Type" = 'VO_BINH') then
    raise exception 'Sản phẩm chọn ở ô "Vỏ bình" không hợp lệ (phải là sản phẩm loại Vỏ bình)';
  end if;
  if v_residual_gas_id is not null
     and not exists (select 1 from public."sm_SanPham" where "Id" = v_residual_gas_id and "Type" = 'GAS_DU') then
    raise exception 'Sản phẩm chọn ở ô "Gas dư" không hợp lệ (phải là sản phẩm loại Gas dư)';
  end if;

  if exists (
    select 1 from public."sm_ProductConfiguration"
    where v_product_id in ("ProductId", "GasTankId", "ResidualGasId")
  ) then
    raise exception 'Sản phẩm đã chọn ở ô "Bình" đã được dùng trong 1 cấu hình khác';
  end if;
  if exists (
    select 1 from public."sm_ProductConfiguration"
    where v_gas_tank_id in ("ProductId", "GasTankId", "ResidualGasId")
  ) then
    raise exception 'Sản phẩm đã chọn ở ô "Vỏ bình" đã được dùng trong 1 cấu hình khác';
  end if;
  if v_residual_gas_id is not null and exists (
    select 1 from public."sm_ProductConfiguration"
    where v_residual_gas_id in ("ProductId", "GasTankId", "ResidualGasId")
  ) then
    raise exception 'Sản phẩm đã chọn ở ô "Gas dư" đã được dùng trong 1 cấu hình khác';
  end if;

  insert into public."sm_ProductConfiguration" (
    "Id","Code","ProductId","GasTankId","ResidualGasId","Note",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, public.sm_fn_gen_ma_cauhinhsp(), v_product_id, v_gas_tank_id, v_residual_gas_id,
    p_data->>'Note', auth.uid(), v_user_name, now()
  );

  select to_jsonb(t) into v_result from public."sm_ProductConfiguration" t where "Id" = v_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Sửa cấu hình — public.sm_cauhinhsp_update(p_id, p_data)
-- ---------------------------------------------------------------------
create or replace function public.sm_cauhinhsp_update(p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_product_id uuid := nullif(p_data->>'ProductId', '')::uuid;
  v_gas_tank_id uuid := nullif(p_data->>'GasTankId', '')::uuid;
  v_residual_gas_id uuid := nullif(p_data->>'ResidualGasId', '')::uuid;
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if not exists (select 1 from public."sm_ProductConfiguration" where "Id" = p_id) then
    raise exception 'Không tìm thấy cấu hình sản phẩm';
  end if;
  if v_product_id is null then raise exception 'Vui lòng chọn bình'; end if;
  if v_gas_tank_id is null then raise exception 'Vui lòng chọn vỏ bình'; end if;

  if not exists (select 1 from public."sm_SanPham" where "Id" = v_product_id and "Type" = 'BINH') then
    raise exception 'Sản phẩm chọn ở ô "Bình" không hợp lệ (phải là sản phẩm loại Bình)';
  end if;
  if not exists (select 1 from public."sm_SanPham" where "Id" = v_gas_tank_id and "Type" = 'VO_BINH') then
    raise exception 'Sản phẩm chọn ở ô "Vỏ bình" không hợp lệ (phải là sản phẩm loại Vỏ bình)';
  end if;
  if v_residual_gas_id is not null
     and not exists (select 1 from public."sm_SanPham" where "Id" = v_residual_gas_id and "Type" = 'GAS_DU') then
    raise exception 'Sản phẩm chọn ở ô "Gas dư" không hợp lệ (phải là sản phẩm loại Gas dư)';
  end if;

  if exists (
    select 1 from public."sm_ProductConfiguration"
    where v_product_id in ("ProductId", "GasTankId", "ResidualGasId") and "Id" <> p_id
  ) then
    raise exception 'Sản phẩm đã chọn ở ô "Bình" đã được dùng trong 1 cấu hình khác';
  end if;
  if exists (
    select 1 from public."sm_ProductConfiguration"
    where v_gas_tank_id in ("ProductId", "GasTankId", "ResidualGasId") and "Id" <> p_id
  ) then
    raise exception 'Sản phẩm đã chọn ở ô "Vỏ bình" đã được dùng trong 1 cấu hình khác';
  end if;
  if v_residual_gas_id is not null and exists (
    select 1 from public."sm_ProductConfiguration"
    where v_residual_gas_id in ("ProductId", "GasTankId", "ResidualGasId") and "Id" <> p_id
  ) then
    raise exception 'Sản phẩm đã chọn ở ô "Gas dư" đã được dùng trong 1 cấu hình khác';
  end if;

  update public."sm_ProductConfiguration" set
    "ProductId" = v_product_id,
    "GasTankId" = v_gas_tank_id,
    "ResidualGasId" = v_residual_gas_id,
    "Note" = p_data->>'Note',
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = v_user_name,
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  select to_jsonb(t) into v_result from public."sm_ProductConfiguration" t where "Id" = p_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Xóa cấu hình — public.sm_cauhinhsp_delete(p_id)
--    Không có bảng nào tham chiếu tới Id này -> xóa thẳng.
-- ---------------------------------------------------------------------
create or replace function public.sm_cauhinhsp_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public."sm_ProductConfiguration" where "Id" = p_id) then
    raise exception 'Không tìm thấy cấu hình sản phẩm';
  end if;

  delete from public."sm_ProductConfiguration" where "Id" = p_id;
  return jsonb_build_object('Message', 'Đã xóa cấu hình sản phẩm');
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Xóa nhiều cấu hình cùng lúc — public.sm_cauhinhsp_delete_many(p_ids)
-- ---------------------------------------------------------------------
create or replace function public.sm_cauhinhsp_delete_many(p_ids uuid[])
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_xoa int := 0;
  v_bo_qua int := 0;
begin
  foreach v_id in array coalesce(p_ids, array[]::uuid[]) loop
    if not exists (select 1 from public."sm_ProductConfiguration" where "Id" = v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;
    delete from public."sm_ProductConfiguration" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không xóa được cấu hình nào (không tìm thấy)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s cấu hình sản phẩm%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s không tìm thấy', v_bo_qua) else '' end));
end;
$$;
