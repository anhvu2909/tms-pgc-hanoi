-- =====================================================================
-- 05_chi_phi_van_chuyen.sql — Màn hình Chi phí vận chuyển (Biểu cước):
-- Thêm mới / Sửa / Xóa. Theo đúng nghiệp vụ đọc từ
-- pages/chi-phi-van-chuyen/index.tsx, store/chi-phi-van-chuyen/index.tsx.
--
-- ĐỌC (danh sách, xem theo id, và tra cước theo cặp KhoDiId/KhoNhanId cho
-- màn Đơn hàng) đã hoạt động từ trước qua genericList/genericGetById
-- trong api.ts — không cần RPC. File này chỉ xử lý GHI.
--
-- GIẢ ĐỊNH CHƯA XÁC NHẬN (cần Bạn xác nhận khi test):
--   1) Form gốc có bug gõ nhầm tên field "ghiChi" (đúng ra là "ghiChu")
--      khiến Ghi chú nhập vào không bao giờ lưu được — ĐÃ SỬA trực tiếp
--      trong pages/chi-phi-van-chuyen/index.tsx (đổi lại "ghiChu").
--   2) "Mã" (Ma) KHÔNG bắt buộc duy nhất — cùng lý do như Mã kho/Mã khách
--      hàng (DDL không có unique index).
--   3) CẶP (KhoDiId, KhoNhanId) BẮT BUỘC DUY NHẤT — dù frontend không có
--      validate này, nhưng sm_donhang_create/update (sql/03_don_hang.sql
--      dòng 286-287) tra cước bằng
--      "select ChiPhi into v_cuoc from sm_ChiPhiVanChuyen where KhoDiId=..
--      and KhoNhanId=.." KHÔNG có LIMIT — nếu tồn tại 2 dòng biểu cước
--      cùng cặp kho, kết quả tra cước cho Đơn hàng sẽ không xác định
--      (lấy dòng nào tùy Postgres). Chặn trùng cặp ngay khi tạo/sửa để
--      đảm bảo tra cước luôn đúng 1 kết quả. Nếu Bạn có nhu cầu thật sự
--      cho nhiều biểu cước trên cùng 1 cặp kho (ví dụ theo thời gian
--      hiệu lực), báo lại để đổi thiết kế.
--   4) Xóa biểu cước: KHÔNG có bảng nào khác tham chiếu tới
--      "sm_ChiPhiVanChuyen"."Id" (không có FK trỏ tới), nên xóa thẳng,
--      không cần kiểm tra phụ thuộc như Kho/Khách hàng.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. RLS baseline (đã bật ở 03_don_hang.sql, khai lại ở đây cho file này
--    chạy độc lập được — idempotent, không lỗi nếu chạy lại)
-- ---------------------------------------------------------------------
alter table public."sm_ChiPhiVanChuyen" enable row level security;

drop policy if exists authenticated_full_access on public."sm_ChiPhiVanChuyen";
create policy authenticated_full_access on public."sm_ChiPhiVanChuyen"
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 1. Tạo biểu cước mới — public.sm_chiphivanchuyen_create(p_data)
--    p_data: {Ma*, Ten*, KhoDiId*, KhoNhanId*, ChiPhi*, KhoangCach, GhiChu}
-- ---------------------------------------------------------------------
create or replace function public.sm_chiphivanchuyen_create(p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ma text := nullif(trim(both from (p_data->>'Ma')), '');
  v_ten text := nullif(trim(both from (p_data->>'Ten')), '');
  v_kho_di_id uuid := nullif(p_data->>'KhoDiId', '')::uuid;
  v_kho_nhan_id uuid := nullif(p_data->>'KhoNhanId', '')::uuid;
  v_chi_phi numeric := nullif(p_data->>'ChiPhi', '')::numeric;
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if v_ma is null then raise exception 'Vui lòng nhập ID (mã) biểu cước'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên biểu cước'; end if;
  if v_kho_di_id is null then raise exception 'Vui lòng chọn kho đi'; end if;
  if v_kho_nhan_id is null then raise exception 'Vui lòng chọn kho nhận'; end if;
  if v_kho_di_id = v_kho_nhan_id then raise exception 'Kho đi và kho nhận đã trùng nhau'; end if;
  if v_chi_phi is null then raise exception 'Vui lòng nhập giá cước'; end if;

  if not exists (select 1 from public."sm_Kho" where "Id" = v_kho_di_id) then
    raise exception 'Không tìm thấy kho đi';
  end if;
  if not exists (select 1 from public."sm_Kho" where "Id" = v_kho_nhan_id) then
    raise exception 'Không tìm thấy kho nhận';
  end if;

  if exists (
    select 1 from public."sm_ChiPhiVanChuyen"
    where "KhoDiId" = v_kho_di_id and "KhoNhanId" = v_kho_nhan_id
  ) then
    raise exception 'Đã tồn tại biểu cước cho đúng cặp kho đi/kho nhận này';
  end if;

  insert into public."sm_ChiPhiVanChuyen" (
    "Id","Ma","Ten","ChiPhi","GhiChu","KhoDiId","KhoNhanId","KhoangCach",
    "CreatedByUserId","CreatedByUserName","CreatedOnDate"
  ) values (
    v_id, v_ma, v_ten, v_chi_phi, p_data->>'GhiChu', v_kho_di_id, v_kho_nhan_id,
    nullif(p_data->>'KhoangCach', '')::numeric,
    auth.uid(), v_user_name, now()
  );

  select to_jsonb(t) into v_result from public."sm_ChiPhiVanChuyen" t where "Id" = v_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Sửa biểu cước — public.sm_chiphivanchuyen_update(p_id, p_data)
-- ---------------------------------------------------------------------
create or replace function public.sm_chiphivanchuyen_update(p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_ma text := nullif(trim(both from (p_data->>'Ma')), '');
  v_ten text := nullif(trim(both from (p_data->>'Ten')), '');
  v_kho_di_id uuid := nullif(p_data->>'KhoDiId', '')::uuid;
  v_kho_nhan_id uuid := nullif(p_data->>'KhoNhanId', '')::uuid;
  v_chi_phi numeric := nullif(p_data->>'ChiPhi', '')::numeric;
  v_user_name text := public.sm_fn_current_user_name();
  v_result jsonb;
begin
  if not exists (select 1 from public."sm_ChiPhiVanChuyen" where "Id" = p_id) then
    raise exception 'Không tìm thấy biểu cước';
  end if;
  if v_ma is null then raise exception 'Vui lòng nhập ID (mã) biểu cước'; end if;
  if v_ten is null then raise exception 'Vui lòng nhập tên biểu cước'; end if;
  if v_kho_di_id is null then raise exception 'Vui lòng chọn kho đi'; end if;
  if v_kho_nhan_id is null then raise exception 'Vui lòng chọn kho nhận'; end if;
  if v_kho_di_id = v_kho_nhan_id then raise exception 'Kho đi và kho nhận đã trùng nhau'; end if;
  if v_chi_phi is null then raise exception 'Vui lòng nhập giá cước'; end if;

  if not exists (select 1 from public."sm_Kho" where "Id" = v_kho_di_id) then
    raise exception 'Không tìm thấy kho đi';
  end if;
  if not exists (select 1 from public."sm_Kho" where "Id" = v_kho_nhan_id) then
    raise exception 'Không tìm thấy kho nhận';
  end if;

  if exists (
    select 1 from public."sm_ChiPhiVanChuyen"
    where "KhoDiId" = v_kho_di_id and "KhoNhanId" = v_kho_nhan_id and "Id" <> p_id
  ) then
    raise exception 'Đã tồn tại biểu cước khác cho đúng cặp kho đi/kho nhận này';
  end if;

  update public."sm_ChiPhiVanChuyen" set
    "Ma" = v_ma,
    "Ten" = v_ten,
    "ChiPhi" = v_chi_phi,
    "GhiChu" = p_data->>'GhiChu',
    "KhoDiId" = v_kho_di_id,
    "KhoNhanId" = v_kho_nhan_id,
    "KhoangCach" = nullif(p_data->>'KhoangCach', '')::numeric,
    "LastModifiedByUserId" = auth.uid(),
    "LastModifiedByUserName" = v_user_name,
    "LastModifiedOnDate" = now()
  where "Id" = p_id;

  select to_jsonb(t) into v_result from public."sm_ChiPhiVanChuyen" t where "Id" = p_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Xóa biểu cước — public.sm_chiphivanchuyen_delete(p_id)
--    Không có bảng nào tham chiếu tới Id này -> xóa thẳng.
-- ---------------------------------------------------------------------
create or replace function public.sm_chiphivanchuyen_delete(p_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public."sm_ChiPhiVanChuyen" where "Id" = p_id) then
    raise exception 'Không tìm thấy biểu cước';
  end if;

  delete from public."sm_ChiPhiVanChuyen" where "Id" = p_id;
  return jsonb_build_object('Message', 'Đã xóa biểu cước');
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Xóa nhiều biểu cước cùng lúc — public.sm_chiphivanchuyen_delete_many(p_ids)
-- ---------------------------------------------------------------------
create or replace function public.sm_chiphivanchuyen_delete_many(p_ids uuid[])
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
    if not exists (select 1 from public."sm_ChiPhiVanChuyen" where "Id" = v_id) then
      v_bo_qua := v_bo_qua + 1;
      continue;
    end if;
    delete from public."sm_ChiPhiVanChuyen" where "Id" = v_id;
    v_xoa := v_xoa + 1;
  end loop;

  if v_xoa = 0 then
    raise exception 'Không xóa được biểu cước nào (không tìm thấy)';
  end if;

  return jsonb_build_object('Message', format('Đã xóa %s biểu cước%s', v_xoa,
    case when v_bo_qua > 0 then format(', bỏ qua %s không tìm thấy', v_bo_qua) else '' end));
end;
$$;
