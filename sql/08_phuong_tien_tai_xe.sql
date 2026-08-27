-- =====================================================================
-- 08_phuong_tien_tai_xe.sql — Màn hình Phương tiện + Tài xế: Thêm mới /
-- Sửa / Xóa. Theo đúng nghiệp vụ đọc từ pages/quan-ly-xe/*.tsx,
-- pages/lai-xe/*.tsx, store/quan-ly-phuong-tien, store/quan-ly-lai-xe.
--
-- ĐỌC (danh sách, kèm tên chéo "Tên tài xế" trên màn Phương tiện / "Phương
-- tiện" trên màn Tài xế, và dropdown "chỉ hiện xe chưa có tài xế") đã xử
-- lý trong genericList (src/utils/api.ts) — không cần RPC để đọc.
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test):
--   1) [ĐÃ XÁC NHẬN] Cột "Phương tiện" trên danh sách Tài xế hiển thị
--      theo "Biển số xe" (không phải Model như code gốc — code gốc dùng
--      Model cho cả cột này lẫn label dropdown "Chọn phương tiện" trên
--      form, đã xác nhận đây là lỗi và sửa lại dùng Biển số xe cho cả 2
--      chỗ, xem src/utils/api.ts và pages/lai-xe/lai-xe.form.tsx).
--   2) "Mã tài xế" (MaTaiXe) KHÔNG bắt buộc duy nhất (giống Mã kho/Mã
--      khách hàng — DDL không có unique index, và không thấy nơi nào
--      dùng Mã tài xế làm nhãn hiển thị kết hợp như Mã sản phẩm).
--   3) Xóa Phương tiện: chặn nếu đang có Tài xế gán vào (unique index
--      sm_LaiXe.IdPhuongTien), HOẶC đã từng dùng trong ít nhất 1 Đơn
--      hàng (sm_DonHang.PhuongTienId) — cả hai cột này ON DELETE CASCADE
--      trong DDL gốc, nhưng theo nguyên tắc "không cascade âm thầm" đã
--      áp dụng cho mọi màn hình trước, ở đây chặn thay vì xóa kèm.
--   4) Xóa Tài xế: chặn nếu đã từng dùng trong ít nhất 1 Đơn hàng
--      (sm_DonHang.LaiXeId — cùng lý do ở trên).
--   5) "Trạng thái" (Active) khi tạo mới nếu không tích chọn -> mặc định
--      false (Switch không tích), khớp hành vi Switch của antd.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. RLS baseline
-- ---------------------------------------------------------------------
alter table public."sm_PhuongTien" enable row level security;
drop policy if exists authenticated_full_access on public."sm_PhuongTien";
create policy authenticated_full_access on public."sm_PhuongTien"
  for all to authenticated using (true) with check (true);

alter table public."sm_LaiXe" enable row level security;
drop policy if exists authenticated_full_access on public."sm_LaiXe";
create policy authenticated_full_access on public."sm_LaiXe"
  for all to authenticated using (true) with check (true);

-- =====================================================================
-- PHƯƠNG TIỆN
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Phương tiện này có đang bị chặn xóa hay không.
-- ---------------------------------------------------------------------
create or replace function public.sm_fn_phuongtien_co_phu_thuoc(p_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select
    exists (select 1 from public."sm_LaiXe" where "IdPhuongTien" = p_id)
    or exists (select 1 from public."sm_DonHang" where "PhuongTienId" = p_id);
$$;

-- ---------------------------------------------------------------------
-- 2. Tạo phương tiện mới — public.sm_phuongtien_create(p_data)
--    p_data: {BienSoXe*, SoKhung, SoMay, HangSanXuat*, Model*, NamSanXuat, TaiTrong*, Active}
-- ---------------------------------------------------------------------
create or replace function public.sm_phuongtien_create(p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_bien_so text := nullif(trim(both from (p_data->>'BienSoXe')), '');
  v_hang_sx text := nullif(trim(both from (p_data->>'HangSanXuat')), '');
  v_model text := nullif(trim(both from (p_data->>'Model')), '');
  v_tai_trong text := nullif(trim(both from (p_data->>'TaiTrong')), '');
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if v_bien_so is null then raise exception 'Vui lòng nhập biển số xe'; end if;
  if v_hang_sx is null then raise exception 'Vui lòng nhập hãng sản xuất'; end if;
  if v_model is null then raise exception 'Vui lòng nhập model'; end if;
  if v_tai_trong is null then raise exception 'Vui lòng nhập tải trọng'; end if;

  insert into public."sm_PhuongTien" (
    "Id","BienSoXe","SoKhung","SoMay","HangSanXuat","Model","NamSanXuat","TaiTrong","Active",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, v_bien_so, p_data->>'SoKhung', p_data->>'SoMay', v_hang_sx, v_model,
    p_data->>'NamSanXuat', v_tai_trong, coalesce((p_data->>'Active')::boolean, false),
    auth.uid(), v_user_name, now()
  );

  select to_jsonb(t) into v_result from public."sm_PhuongTien" t where "Id" = v_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Sửa phương tiện — public.sm_phuongtien_update(p_id, p_data)
-- ---------------------------------------------------------------------
create or replace function public.sm_phuongtien_update(p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_bien_so text := nullif(trim(both from (p_data->>'BienSoXe')), '');
  v_hang_sx text := nullif(trim(both from (p_data->>'HangSanXuat')), '');
  v_model text := nullif(trim(both from (p_data->>'Model')), '');
  v_tai_trong text := nullif(trim(both from (p_data->>'TaiTrong')), '');
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if not exists (select 1 from public."sm_PhuongTien" where "Id" = p_id) then
    raise exception 'Không tìm thấy phương tiện';
  end if;
  if v_bien_so is null then raise exception 'Vui lòng nhập biển số xe'; end if;
  if v_hang_sx is null then raise exception 'Vui lòng nhập hãng sản xuất'; end if;
  if v_model is null then raise exception 'Vui lòng nhập model'; end if;
  if v_tai_trong is null then raise exception 'Vui lòng nhập tải trọng'; end if;

  update public."sm_PhuongTien" set
    "BienSoXe" = v_bien_so,
    "SoKhung" = p_data->>'SoKhung',
    "SoMay" = p_data->>'SoMay',
    "HangSanXuat" = v_hang_sx,
    "Model" = v_model,
    "NamSanXuat" = p_data->>'NamSanXuat',
    "TaiTrong" = v_tai_trong,
    "Active" = coalesce((p_data->>'Active')::boolean, false),
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = v_user_name,
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  select to_jsonb(t) into v_result from public."sm_PhuongTien" t where "Id" = p_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Xóa phương tiện — public.sm_phuongtien_delete(p_id)
-- ---------------------------------------------------------------------
create or replace function public.sm_phuongtien_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public."sm_PhuongTien" where "Id" = p_id) then
    raise exception 'Không tìm thấy phương tiện';
  end if;
  if public.sm_fn_phuongtien_co_phu_thuoc(p_id) then
    raise exception 'Không thể xóa vì phương tiện này đang có tài xế gán vào hoặc đã được dùng trong đơn hàng';
  end if;

  delete from public."sm_PhuongTien" where "Id" = p_id;
  return jsonb_build_object('Message', 'Đã xóa phương tiện');
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Xóa nhiều phương tiện cùng lúc — public.sm_phuongtien_delete_many(p_ids)
-- ---------------------------------------------------------------------
create or replace function public.sm_phuongtien_delete_many(p_ids uuid[])
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
    if not exists (select 1 from public."sm_PhuongTien" where "Id" = v_id)
       or public.sm_fn_phuongtien_co_phu_thuoc(v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;
    delete from public."sm_PhuongTien" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không xóa được phương tiện nào (còn dữ liệu liên quan hoặc không tìm thấy)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s phương tiện%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s phương tiện còn dữ liệu liên quan', v_bo_qua) else '' end));
end;
$$;

-- =====================================================================
-- TÀI XẾ
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6. Tạo tài xế mới — public.sm_laixe_create(p_data)
--    p_data: {MaTaiXe*, TenTaiXe*, IdPhuongTien*, Cccd*, Gplx, NgaySinh, Active}
-- ---------------------------------------------------------------------
create or replace function public.sm_laixe_create(p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ma text := nullif(trim(both from (p_data->>'MaTaiXe')), '');
  v_ten text := nullif(trim(both from (p_data->>'TenTaiXe')), '');
  v_id_pt uuid := nullif(p_data->>'IdPhuongTien', '')::uuid;
  v_cccd text := nullif(trim(both from (p_data->>'Cccd')), '');
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if v_ma is null then raise exception 'Vui lòng nhập mã tài xế'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên tài xế'; end if;
  if v_id_pt is null then raise exception 'Vui lòng chọn phương tiện'; end if;
  if v_cccd is null then raise exception 'Vui lòng nhập số căn cước công dân'; end if;

  if not exists (select 1 from public."sm_PhuongTien" where "Id" = v_id_pt) then
    raise exception 'Không tìm thấy phương tiện đã chọn';
  end if;
  if exists (select 1 from public."sm_LaiXe" where "IdPhuongTien" = v_id_pt) then
    raise exception 'Phương tiện đã chọn đang được gán cho 1 tài xế khác';
  end if;

  insert into public."sm_LaiXe" (
    "Id","MaTaiXe","TenTaiXe","IdPhuongTien","Cccd","Gplx","NgaySinh","Active",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, v_ma, v_ten, v_id_pt, v_cccd, p_data->>'Gplx',
    nullif(p_data->>'NgaySinh', '')::timestamp, coalesce((p_data->>'Active')::boolean, false),
    auth.uid(), v_user_name, now()
  );

  select to_jsonb(t) into v_result from public."sm_LaiXe" t where "Id" = v_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Sửa tài xế — public.sm_laixe_update(p_id, p_data)
-- ---------------------------------------------------------------------
create or replace function public.sm_laixe_update(p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_ma text := nullif(trim(both from (p_data->>'MaTaiXe')), '');
  v_ten text := nullif(trim(both from (p_data->>'TenTaiXe')), '');
  v_id_pt uuid := nullif(p_data->>'IdPhuongTien', '')::uuid;
  v_cccd text := nullif(trim(both from (p_data->>'Cccd')), '');
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if not exists (select 1 from public."sm_LaiXe" where "Id" = p_id) then
    raise exception 'Không tìm thấy tài xế';
  end if;
  if v_ma is null then raise exception 'Vui lòng nhập mã tài xế'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên tài xế'; end if;
  if v_id_pt is null then raise exception 'Vui lòng chọn phương tiện'; end if;
  if v_cccd is null then raise exception 'Vui lòng nhập số căn cước công dân'; end if;

  if not exists (select 1 from public."sm_PhuongTien" where "Id" = v_id_pt) then
    raise exception 'Không tìm thấy phương tiện đã chọn';
  end if;
  if exists (select 1 from public."sm_LaiXe" where "IdPhuongTien" = v_id_pt and "Id" <> p_id) then
    raise exception 'Phương tiện đã chọn đang được gán cho 1 tài xế khác';
  end if;

  update public."sm_LaiXe" set
    "MaTaiXe" = v_ma,
    "TenTaiXe" = v_ten,
    "IdPhuongTien" = v_id_pt,
    "Cccd" = v_cccd,
    "Gplx" = p_data->>'Gplx',
    "NgaySinh" = nullif(p_data->>'NgaySinh', '')::timestamp,
    "Active" = coalesce((p_data->>'Active')::boolean, false),
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = v_user_name,
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  select to_jsonb(t) into v_result from public."sm_LaiXe" t where "Id" = p_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Xóa tài xế — public.sm_laixe_delete(p_id)
-- ---------------------------------------------------------------------
create or replace function public.sm_laixe_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public."sm_LaiXe" where "Id" = p_id) then
    raise exception 'Không tìm thấy tài xế';
  end if;
  if exists (select 1 from public."sm_DonHang" where "LaiXeId" = p_id) then
    raise exception 'Không thể xóa vì tài xế này đã được dùng trong đơn hàng';
  end if;

  delete from public."sm_LaiXe" where "Id" = p_id;
  return jsonb_build_object('Message', 'Đã xóa tài xế');
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Xóa nhiều tài xế cùng lúc — public.sm_laixe_delete_many(p_ids)
-- ---------------------------------------------------------------------
create or replace function public.sm_laixe_delete_many(p_ids uuid[])
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
    if not exists (select 1 from public."sm_LaiXe" where "Id" = v_id)
       or exists (select 1 from public."sm_DonHang" where "LaiXeId" = v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;
    delete from public."sm_LaiXe" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không xóa được tài xế nào (còn dữ liệu liên quan hoặc không tìm thấy)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s tài xế%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s tài xế còn dữ liệu liên quan', v_bo_qua) else '' end));
end;
$$;
